const mongoose = require('mongoose');

// Schema cho giao dịch thanh toán
const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    transactionId: {
      type: String,
      required: function () {
        // Chỉ yêu cầu có transactionId khi thanh toán qua VNPay và đã thanh toán thành công
        return this.status === 'paid' && this._orderPaymentMethod === 'vnpay';
      },
    },

    // Lưu phương thức thanh toán của đơn hàng để validate
    _orderPaymentMethod: {
      type: String,
      enum: ['vnpay', 'cod'],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },

    paymentTime: {
      type: Date,
    },

    vnpayResponse: {
      type: mongoose.Schema.Types.Mixed,
      required: function () {
        return this._orderPaymentMethod === 'vnpay';
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Payment', paymentSchema);
