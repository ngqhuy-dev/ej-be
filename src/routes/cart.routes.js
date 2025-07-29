const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const authMiddleware = require('../middlewares/authMiddleware');

// Get user's cart
router.get('/', authMiddleware.verifyToken, cartController.getCart);

// Add item to cart
router.post('/add', authMiddleware.verifyToken, cartController.addToCart);

// Update cart item quantity
router.patch('/update', authMiddleware.verifyToken, cartController.updateCartItem);

// Remove item from cart
router.delete('/remove/:productId', authMiddleware.verifyToken, cartController.removeCartItem);

// Clear cart
router.delete('/clear', authMiddleware.verifyToken, cartController.clearCart);

module.exports = router;
