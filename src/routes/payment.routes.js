const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/vnpay/create_url', verifyToken, paymentController.createVnPayPaymentUrl);
router.get('/vnpay/return_url', paymentController.returnVnPayUrl);

module.exports = router;
