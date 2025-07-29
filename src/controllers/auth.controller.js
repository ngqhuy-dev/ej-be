const _user = require('../models/User');
const { generateRefreshToken, generateToken } = require('../utils/createToken');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { http, add } = require('winston');

const authController = {
  //NOTE: Đăng ký
  registerUser: async (req, res) => {
    try {
      const { fullname, username, email, password, confirmPassword } = req.body;

      const fullnameRegex = /^[\p{L}\s]+$/u;
      if (!fullnameRegex.test(fullname)) {
        return res.status(400).json({ message: 'Tên người dùng không hợp lệ' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Email không hợp lệ' });
      }

      const userRegex = /^[a-zA-Z0-9_]+$/;
      if (!userRegex.test(username)) {
        return res.status(400).json({ message: 'Username không hợp lệ' });
      }

      if (!validator.isStrongPassword(password, { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1 })) {
        return res.status(400).json({ message: `Mật khẩu ít nhất 8 ký tự bao gồm chữ thường, in hoa, số` });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Vui lòng nhập lại xác nhận mật khẩu' });
      }

      if (!fullname || !username || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
      }

      // Kiểm tra username và email đồng thời để tối ưu hiệu suất
      const [userCheck, emailCheck] = await Promise.all([
        _user.findOne({ username: username }),
        _user.findOne({ email: email.trim() }),
      ]);

      if (userCheck) {
        return res.status(400).json({ err: 'username', message: 'Username đã được sử dụng.' });
      }

      if (emailCheck) {
        return res.status(400).json({ err: 'email', message: 'Email đã được sử dụng.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const normalizedEmail = email.trim();

      const newUser = await new _user({
        fullname: fullname,
        username: username,
        email: normalizedEmail,
        password: hashedPassword,
      });

      const user = await newUser.save();
      return res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
    }
  },

  //NOTE: Đăng nhập
  loginUser: async (req, res) => {
    try {
      const { usernameOrEmail, password, pathname } = req.body;

      // 1. Validate input
      if (!usernameOrEmail || !password) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ thông tin',
        });
      }

      // 2. Find user
      const user = await _user
        .findOne({
          $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
        })
        .select('+password')
        .lean();

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Tên đăng nhập hoặc mật khẩu không đúng',
        });
      }

      // 3. Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ admin.',
        });
      }

      // 4. Check if user has password (not Google-only user)
      if (!user.password) {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản này đăng ký qua Google. Vui lòng đăng nhập bằng Google.',
        });
      }

      // 5. Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Tên đăng nhập hoặc mật khẩu không đúng',
        });
      }

      // 6. Check user role and pathname permission
      const isAdminLogin = pathname === '/admin/login';
      const isUserLogin = pathname === '/login';

      if (isAdminLogin && !user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập admin',
        });
      }

      if (isUserLogin && user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Tên đăng nhập hoặc mật khẩu không đúng.',
        });
      }

      // 7. Generate tokens
      const accessToken = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      // 9. Set cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // true in production
        path: '/',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
      });

      // 10. Return success response
      const { password: userPassword, googleId, ...userData } = user;
      return res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          ...userData,
          accessToken,
          hasPassword: true,
        },
      });
    } catch (error) {
      console.error('❌ Lỗi đăng nhập:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  // NOTE: lấy request Token
  requestRefreshToken: async (req, res) => {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Bạn không có quyền!' });
      }

      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, user) => {
        if (err) {
          console.log(err);
          return res.status(403).json('Token không hợp lệ!');
        }

        try {
          const newAccessToken = generateToken(user);
          const newRefreshToken = generateRefreshToken(user);

          return res
            .cookie('refreshToken', newRefreshToken, {
              httpOnly: true,
              secure: false,
              path: '/',
              sameSite: 'strict',
              maxAge: 30 * 24 * 60 * 60 * 1000,
            })
            .status(200)
            .json({
              accessToken: newAccessToken,
            });
        } catch (tokenError) {
          console.error('❌ Lỗi khi tạo token mới:', tokenError);
          return res.status(500).json({ message: 'Lỗi khi tạo token mới' });
        }
      });
    } catch (error) {
      console.error('❌ Lỗi refresh token:', error);
      return res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
    }
  },

  //NOTE: Logout
  userLogout: async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      return res.clearCookie('refreshToken').status(200).json({
        success: true,
        message: 'Đăng xuất thành công!',
      });
    } catch (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Có lỗi khi đăng xuất',
        error: err.message,
      });
    }
  },
};

module.exports = authController;
