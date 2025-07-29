const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Tên đăng nhập là bắt buộc'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [6, 'Tên đăng nhập phải có ít nhất 6 ký tự'],
      maxlength: [20, 'Tên đăng nhập không được vượt quá 20 ký tự'],
      match: [/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới'],
    },
    fullname: {
      type: String,
      required: [true, 'Họ và tên là bắt buộc'],
      trim: true,
      minlength: [2, 'Họ và tên phải có ít nhất 2 ký tự'],
      maxlength: [50, 'Họ và tên không được vượt quá 50 ký tự'],
      match: [/^[\p{L}\s]+$/u, 'Họ và tên chỉ được chứa chữ cái và khoảng trắng'],
    },
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email không đúng định dạng'],
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider === 'local';
      },
      minlength: [8, 'Mật khẩu phải có ít nhất 8 ký tự'],
    },
    phone: {
      type: String,
      match: [/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    dateBirth: {
      type: Date,
    },
    address: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
        required: true,
      },
    ],
    isAdmin: {
      type: Boolean,
      default: false,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
      required: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    facebookId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      url: { type: String, default: '', trim: true },
      publicId: { type: String, default: '', trim: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

UserSchema.pre('save', function (next) {
  if (this.authProvider === 'google') {
    this.isAdmin = false;
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);
