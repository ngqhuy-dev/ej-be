const moment = require('moment');
const mongoose = require('mongoose');
const config = require('../config/vnpay');
const Order = require('../models/Order');

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
  }
  return sorted;
}

module.exports = {
  createVnPayPaymentUrl: async (req, res) => {
    try {
      const { orderId } = req.body;
      const order = await Order.findById(orderId);

      if (!order) return res.status(404).json({ error: 'Order not found' });

      let date = new Date();
      let createDate = moment(date).format('YYYYMMDDHHmmss');

      let ipAddr =
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
        '127.0.0.1';

      const tmnCode = config.vnp_TmnCode;
      const secretKey = config.vnp_HashSecret;
      let vnpUrl = config.vnp_Url;
      const returnUrl = config.vnp_ReturnUrl;
      let amount = order.totalAmount;
      let bankCode = req.body.bankCode;

      let locale = req.body.language;
      if (locale === null || locale === '' || !locale) {
        locale = 'vn';
      }

      let currCode = 'VND';
      let vnp_Params = {};

      vnp_Params['vnp_Version'] = '2.1.0';
      vnp_Params['vnp_Command'] = 'pay';
      vnp_Params['vnp_TmnCode'] = tmnCode;
      vnp_Params['vnp_Locale'] = locale;
      vnp_Params['vnp_CurrCode'] = currCode;
      vnp_Params['vnp_TxnRef'] = orderId;
      vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho ma GD:' + orderId;
      vnp_Params['vnp_OrderType'] = 'other';
      vnp_Params['vnp_Amount'] = amount * 100;
      vnp_Params['vnp_ReturnUrl'] = returnUrl;
      vnp_Params['vnp_IpAddr'] = ipAddr;
      vnp_Params['vnp_CreateDate'] = createDate;
      vnp_Params['vnp_BankCode'] = bankCode ?? 'NCB';

      // Sắp xếp params theo alphabet (không dùng sortObject cũ)
      vnp_Params = sortObject(vnp_Params);

      let querystring = require('qs');
      let signData = querystring.stringify(vnp_Params, { encode: false });
      let crypto = require('crypto');
      let hmac = crypto.createHmac('sha512', secretKey);
      let signed = hmac.update(new Buffer(signData, 'utf-8')).digest('hex');
      vnp_Params['vnp_SecureHash'] = signed;
      vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

      return res.status(200).json({ success: true, paymentUrl: vnpUrl });
    } catch (err) {
      console.error('Lỗi khi tạo url thanh toán:', err);
      res.status(500).json({ message: 'Lỗi hệ thống vui lòng thử lại!', error: 'Lỗi tạo URL thanh toán' });
    }
  },

  returnVnPayUrl: async (req, res) => {
    let vnp_Params = req.query;

    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    const { vnp_TxnRef, vnp_ResponseCode, vnp_Amount } = vnp_Params;

    const secretKey = config.vnp_HashSecret;

    let querystring = require('qs');
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let crypto = require('crypto');
    let hmac = crypto.createHmac('sha512', secretKey);
    let signed = hmac.update(new Buffer(signData, 'utf-8')).digest('hex');

    if (secureHash === signed) {
      try {
        const order = await Order.findById(vnp_TxnRef);

        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (vnp_ResponseCode === '00') {
          order.isPaid = true;
          order.status = 'paid';
          order.paidAt = new Date();
          order.paymentMethod = 'VNPay';
        } else {
          order.isPaid = false;
          order.status = 'Pending';
        }

        const savedOrder = await order.save();

        const frontendUrl = new URL(config.frontend_ReturnUrl);
        frontendUrl.searchParams.append('status', savedOrder.status);
        frontendUrl.searchParams.append('orderId', savedOrder._id.toString());
        frontendUrl.searchParams.append('amount', vnp_Amount);
        frontendUrl.searchParams.append('success', vnp_ResponseCode === '00' ? 'true' : 'false');

        return res.redirect(frontendUrl.toString());
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Lỗi xử lý callback VNPAY' });
      }
    } else {
      return res.status(400).json({ error: 'Chữ ký không hợp lệ!' });
    }
  },
};
