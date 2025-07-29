const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    countBuy: {
      type: Number,
      default: 0,
    },
    _idCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    _idReview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    images: [
      {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' },
      },
    ],
    // 🔑 Key-value động
    information: {
      type: [
        {
          key: { type: String, required: true },
          value: { type: String, required: true },
        },
      ],
      default: [], // <- nên thêm để mặc định là mảng rỗng nếu không có
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Product', ProductSchema);
