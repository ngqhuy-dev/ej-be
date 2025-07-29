const User = require('../../models/User');
const { generateToken, generateRefreshToken } = require('../../utils/createToken');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const mongoose = require('mongoose');

// REFACTOR: auth cho mobile và website(truyền type platform để phân biệt 2 nền tảng)
const mobileController = {
  login: async (req, res) => {
    try {
      const { usernameOrEmail, password } = req.body;
      if (!usernameOrEmail || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
      }

      const user = await User.findOne({
        $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
      }).select('+password');

      if (!user) return res.status(401).json({ message: 'Người dùng không tồn tại.' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Sai mật khẩu.' });

      const accessToken = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      const { password: pwd, ...others } = user._doc;

      return res.status(200).json({
        ...others,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  },

  // Làm mới token
  refresh: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(401).json({ message: 'Không có refresh token.' });
      }
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, user) => {
        if (err) {
          return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
        }

        const newAccessToken = generateToken(user);
        const newRefreshToken = generateRefreshToken(user);

        return res.status(200).json({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi server khi refresh token', error: error.message });
    }
  },

  // Đăng xuất
  logout: async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: 'Thiếu userId' });
      }

      return res.status(200).json({ success: true, message: 'Đăng xuất thành công' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  },

  // Đăng nhập Google từ mobile
  loginWithGoogle: async (req, res) => {
    try {
      const { idToken } = req.body;

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { sub: googleId, email, name: fullname, picture: avatar } = payload;

      let user = await User.findOne({ googleId });
      if (!user) {
        user = await User.findOne({ email });
        if (user) {
          user.googleId = googleId;
          user.authProvider = 'google';
          await user.save();
        } else {
          user = await User.create({
            googleId,
            email,
            fullname,
            username: email.split('@')[0],
            avatar,
            authProvider: 'google',
          });
        }
      }

      const accessToken = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      const { password, ...others } = user._doc;

      return res.status(200).json({
        ...others,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi Google Login', error: error.message });
    }
  },
};

module.exports = mobileController;
