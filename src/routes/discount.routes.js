const express = require('express');
const router = express.Router();

const {
  getAllDiscounts,
  getAllDiscountUser,
  getDiscount,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  toggleDiscountStatus,
} = require('../controllers/discount.controller');
const authMiddleware = require('../middlewares/authMiddleware');

// Public routes
router.get('/all', getAllDiscounts);
router.get('/:id', getDiscount);
router.get('/by-user/:id', authMiddleware.verifyToken, getAllDiscountUser);

// Protected routes (admin only)
router.post('/create', authMiddleware.verifyTokenAndAdmin, createDiscount);
router.put('/:id', authMiddleware.verifyTokenAndAdmin, updateDiscount);
router.delete('/:id', authMiddleware.verifyTokenAndAdmin, deleteDiscount);
router.patch('/toggle/:id', authMiddleware.verifyTokenAndAdmin, toggleDiscountStatus);

module.exports = router;
