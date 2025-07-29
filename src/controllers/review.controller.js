const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { isAbaRouting } = require('validator');

module.exports = {
  //NOTE:  Create a new review
  createReview: async (req, res, next) => {
    try {
      const { productId, rating, comment } = req.body;
      const userId = req.user._id;

      // Kiểm tra sản phẩm có tồn tại không
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(403).json({ message: 'Sản phẩm không tìm thấy' });
      }

      // Kiểm tra người dùng đã từng đánh giá chưa
      const existingReview = await Review.findOne({ user: userId, product: productId });
      if (existingReview) {
        return res.status(400).json({
          success: false,
          isBought: true,
          message: 'Bạn đã đánh giá sản phẩm này rồi!',
        });
      }

      // Kiểm tra người dùng đã mua sản phẩm hay chưa
      const hasPurchased = await Order.exists({
        _idUser: userId,
        orderItems: {
          $elemMatch: {
            _idProduct: productId,
          },
        },
        status: 'received',
      });

      if (!hasPurchased) {
        return res.status(400).json({
          success: false,
          isBought: false,
          message: 'Bạn cần mua sản phẩm này trước khi đánh giá!',
        });
      }

      // Tạo đánh giá
      const review = new Review({
        user: userId,
        product: productId,
        rating,
        comment,
      });

      await review.save();

      // Tính lại điểm trung bình
      const reviews = await Review.find({ product: productId });
      const averageRating =
        reviews.length > 0 ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length : 0;

      await Product.findByIdAndUpdate(productId, { averageRating });

      return res.status(201).json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  },

  //NOTE: Get review by id
  getReviewById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const review = await Review.findById(id);

      return res.status(200).json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  },

  //NOTE: Get all reviews for a product
  getProductReviews: async (req, res, next) => {
    try {
      const { id } = req.params;
      const reviews = await Review.find({ product: id }).populate('user', 'fullname').sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      next(error);
    }
  },

  //NOTE: Get all reviews
  getAllReviews: async (req, res, next) => {
    try {
      const reviews = await Review.find()
        .populate('user', 'fullname email')
        .populate('product', 'name')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      next(error);
    }
  },

  //NOTE: Delete a review
  deleteReview: async (req, res, next) => {
    try {
      const { reviewId } = req.params;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Chưa xác thực người dùng' });
      }

      const userId = req.user._id;

      const review = await Review.findById(reviewId);
      if (!review) {
        const error = new Error('Review not found');
        error.statusCode = 404;
        throw error;
      }

      // Kiểm tra quyền
      if (review.user.toString() !== userId.toString() && !req.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Bạn không thể xóa đánh giá này!' });
      }

      await Review.deleteOne({ _id: reviewId });

      return res.status(200).json({
        success: true,
        message: 'Xóa đánh giá thành công!',
      });
    } catch (error) {
      next(error);
    }
  },

  //NOTE: Update a review
  updateReview: async (req, res, next) => {
    try {
      const { reviewId } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user._id;

      // Validation
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Điểm đánh giá phải từ 1 đến 5 sao',
        });
      }

      if (!comment || comment.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập nhận xét',
        });
      }

      const review = await Review.findById(reviewId);
      if (!review) {
        return ré.status(404).json({ success: false, message: 'Đánh giá không tồn tại!' });
      }

      // Check if user is the owner of the review
      if (review.user.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền chỉnh sửa đánh giá này!',
        });
      }

      // Store product ID before updating
      const productId = review.product;

      // Update review
      review.rating = parseInt(rating);
      review.comment = comment.trim();
      review.updatedAt = new Date();
      await review.save();

      // Update product's average rating
      const reviews = await Review.find({ product: productId });

      if (reviews.length > 0) {
        const totalRating = reviews.reduce((acc, curr) => acc + curr.rating, 0);
        const averageRating = Math.round((totalRating / reviews.length) * 10) / 10; // Round to 1 decimal place

        await Product.findByIdAndUpdate(productId, {
          averageRating: averageRating,
        });
      } else {
        // If no reviews left, reset rating
        await Product.findByIdAndUpdate(productId, {
          averageRating: 0,
          totalReviews: 0,
        });
      }

      // Populate user info for response
      const updatedReview = await Review.findById(reviewId).populate('user', 'fullname email');

      return res.status(200).json({
        success: true,
        message: 'Cập nhật đánh giá thành công',
        data: updatedReview,
      });
    } catch (error) {
      console.error('Error updating review:', error);
      next(error);
    }
  },

  togglePublish: async (req, res, next) => {
    try {
      const { reviewId } = req.params;
      const review = await Review.findById(reviewId);

      if (!review) {
        return res.status(404).json({ success: false, message: 'Đánh giá không tồn tại!' });
      }

      review.isReport = !review.isReport;
      await review.save();

      return res.status(200).json({
        success: true,
        message: 'Cập nhật trang thai đánh giá thanh cong',
        data: review,
      });
    } catch (error) {
      next(error);
    }
  },

  getUserReviews: async (req, res, next) => {
    try {
      const userId = req.user._id;
      const reviews = await Review.find({ user: userId }).populate('_idProduct', 'name images').sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      next(error);
    }
  },
};
