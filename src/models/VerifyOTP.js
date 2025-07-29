const mongoose = require('mongoose');

const VerifyOTPSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  otp: { type: String }, // Lưu mã OTP tạm thời
  otpExpires: { type: Date }, // Thời gian hết hạn OTP
});

module.exports = mongoose.model('VerifyOTP', VerifyOTPSchema);
