const mongoose = require('mongoose');

const DiscountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['fixed', 'percentage'], lowercase: true },
  value: {
    type: Number,
    required: function () {
      return this.type === 'fixed';
    },
    min: 0,
  },
  maxPercent: {
    type: Number,
    max: 100,
    required: function () {
      return this.type === 'percentage';
    },
  },
  activation: { type: Date, required: true },
  expiration: { type: Date, required: true },
  isActive: { type: Boolean, default: false },
  minOrderAmount: { type: Number, default: 0 },
  quantityLimit: { type: Number, default: 100 },
  quantityUsed: { type: Number, default: 0 },
});

module.exports = mongoose.model('Discount', DiscountSchema);
