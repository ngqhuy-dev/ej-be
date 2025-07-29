const express = require('express');
const router = express.Router();

// Import các route con
router.use('/auth', require('./auth.routes'));
router.use('/mobile', require('./mobile/auth.routes'));
router.use('/mobile/users', require('./mobile/user.routes'));
router.use('/users', require('./user.routes'));
router.use('/addresses', require('./address.routes'));
router.use('/products', require('./product.routes'));
router.use('/discounts', require('./discount.routes'));
router.use('/categories', require('./category.routes'));
router.use('/otp', require('./verifyOTP.routes'));
router.use('/reviews', require('./review.routes'));
router.use('/carts', require('./cart.routes'));
router.use('/orders', require('./order.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/dashboard', require('./dashboard.routes'));

module.exports = router;
