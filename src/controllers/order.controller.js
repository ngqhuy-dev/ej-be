const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Discount = require('../models/Discount');
const mongoose = require('mongoose');

module.exports = {
  // NOTE: [POST] /api/orders/create - Tạo đơn hàng mới
  createOrder: async (req, res) => {
    try {
      const { orderItems, shippingAddress, shippingFee, paymentMethod, totalAmount, note, source, discount } = req.body;
      if (!orderItems || orderItems.length === 0) {
        return res.status(400).json({ message: 'Đơn hàng cần có ít nhất một sản phẩm' });
      }

      const order = new Order({
        _idUser: req.user._id,
        orderItems,
        shippingAddress,
        shippingFee,
        discount,
        paymentMethod: paymentMethod.toLowerCase(),
        totalAmount,
        note,
      });

      const createdOrder = await order.save();

      const discountId = createdOrder.discount;
      if (discountId) {
        await Discount.updateOne(
          { _id: discountId },
          {
            $inc: { quantityUsed: 1 },
          },
        );
      }

      const orderItem = createdOrder.orderItems.map((item) => ({
        _idProduct: item._idProduct,
        quantity: item.quantity,
      }));

      const productIds = orderItem.map((item) => item._idProduct);

      if (typeof source === 'string' && source.toLowerCase() === 'cart') {
        await Cart.updateOne(
          { _idUser: req.user._id },
          {
            $pull: {
              items: {
                _idProduct: { $in: productIds },
              },
            },
            $set: { updatedAt: new Date() },
          },
        );
      }

      // ✅ Trừ tồn kho từng sản phẩm theo số lượng
      for (const item of orderItem) {
        await Product.updateOne(
          { _id: item._idProduct },
          { $inc: { quantity: -item.quantity, countBuy: item.quantity } },
        );
      }

      return res.status(201).json({ success: true, data: createdOrder });
    } catch (error) {
      console.error('Lỗi khi tạo đơn hàng:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
  },

  //NOTE:[GET] /api/orders/all - Lấy tất cả đơn hàng
  getAllOrders: async (req, res) => {
    const { status } = req.query;

    try {
      if (req.user.isAdmin === false) {
        return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
      }

      const orders = await Order.find()
        .populate({
          path: 'orderItems._idProduct',
          select: ' images unit discount quantity',
        })
        .populate('shippingAddress')
        .populate({
          path: '_idUser',
          select: 'fullname phone email',
        });

      if (!orders || orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng!',
        });
      }

      if (status === 'all' || !status) {
        return res.status(200).json({ success: true, data: orders });
      }

      const dataOrders = orders.filter((order) => order.status === status);
      return res.status(200).json({ success: true, data: dataOrders });
    } catch (error) {
      console.error('Lỗi khi lấy đơn hàng:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
  },

  //NOTE: [GET] /api/orders/status - Lấy đơn hàng theo trạng thái của từng user
  getOrdersStatus: async (req, res) => {
    const userId = req.params.id ?? req.user._id;
    const { status } = req.query;

    try {
      const orders = await Order.find({ _idUser: userId }).populate({
        path: 'orderItems._idProduct',
        select: 'images unit',
      });
      if (!orders || orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng!',
        });
      }

      if (status === 'all' || !status) {
        return res.status(200).json({ success: true, data: orders });
      }

      const dataOrders = orders.filter((order) => order.status === status);
      return res.status(200).json({ success: true, data: dataOrders });
    } catch (error) {
      console.error('Lỗi khi lấy đơn hàng:', error);
      res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
  },

  //NOTE: [GET] /api/orders/details/:id - Lấy chi tiết đơn hàng theo id của đơn hàng
  getOrderDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const orders = await Order.findById(id)
        .populate('_idUser', 'fullname email phone')
        .populate('orderItems._idProduct', 'name images')
        .populate('shippingAddress');

      if (!orders) {
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      }

      // Kiểm tra quyền truy cập (chỉ admin hoặc người dùng tạo đơn hàng)
      if (!req.user.isAdmin && orders._idUser._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Không có quyền truy cập đơn hàng này' });
      }

      return res.status(200).json({ success: true, data: orders });
    } catch (error) {
      console.error('Lỗi khi lấy thông tin đơn hàng:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
  },

  // NOTE: [PUT] /api/orders/:id - Cập nhật tràng thái đơn hàng
  updateOrderStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
      }

      // Kiểm tra quyền truy cập (chỉ admin hoặc người dùng tạo đơn hàng)
      if (!req.user.isAdmin && order._idUser._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Không có quyền truy cập đơn hàng này' });
      }

      if (status === 'received') {
        order.isPaid = true;
        order.paidAt = new Date();
      }

      order.status = status;
      await order.save();

      const io = req.app.get('io');
      io.to(order._idUser.toString()).emit('orderStatusChanged', {
        orderId: order._id,
        status: order.status,
        message: `Đơn hàng #${order._id} đã chuyển sang trạng thái: ${status}`,
      });
      // ✅ Emit đến tất cả admin
      io.to('admin-room').emit('orderStatusChanged', {
        orderId: order._id,
        status: order.status,
        message: `Đơn hàng #${order._id} đã được cập nhật trạng thái: ${status}`,
      });

      return res.status(200).json({ success: true, data: order });
    } catch (error) {
      console.error('Lỗi khi cập nhật tràng thái đơn hàng:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
  },

  // NOTE: [DELETE] /api/orders/delete/:id - Xóa đơn hàng
  deleteOrder: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, message: 'ID đơn hàng không hợp lệ' });
      }
      if (req.user.isAdmin === false) {
        return res.status(403).json({ success: false, message: 'Không có quyền truy cập đơn hàng' });
      }
      await Order.findByIdAndDelete(id);
      return res.status(200).json({ success: true, message: 'Xóa đơn hàng thành công!' });
    } catch (error) {
      console.error('Lỗi khi xóa đơn hàng:', error);
      return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
    }
  },

  refundOrder: async (req, res) => {},
};
