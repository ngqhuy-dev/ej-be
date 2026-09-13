const CLIENT_URL = process.env.CLIENT_URL_V1;
const API_URL = process.env.API_URL;

module.exports = {
  vnp_TmnCode: process.env.VNP_TMN_CODE || '4KWKJC9L',
  vnp_HashSecret: process.env.VNP_HASH_SECRET || '90FI9EZLE1FFM46VHJZPJ6K9TZ8SMWBQ',
  vnp_Url: process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnp_ReturnUrl: `${API_URL}/payments/vnpay/return_url`,
  frontend_ReturnUrl: `${CLIENT_URL}/checkout/result`,
};
