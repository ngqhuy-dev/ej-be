const express = require('express');
const router = express.Router();
const {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  getReviewById,
  getUserReviews,
  togglePublish,
  getAllReviews,
} = require('../controllers/review.controller');
const { verifyToken, verifyTokenAndAdmin } = require('../middlewares/authMiddleware');

router.get('/', verifyTokenAndAdmin, getAllReviews);
router.get('/:id', verifyToken, getReviewById);
router.post('/create', verifyToken, createReview);
router.get('/product/:id', getProductReviews);
router.delete('/delete/:reviewId', verifyTokenAndAdmin, deleteReview);
router.patch('/update/:reviewId', verifyToken, updateReview);
router.patch('/publish/:reviewId', verifyTokenAndAdmin, togglePublish);

// router.get('/user', getUserReviews);
module.exports = router;
