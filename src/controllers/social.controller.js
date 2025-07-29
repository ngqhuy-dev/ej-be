const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { generateRefreshToken, generateToken } = require('../utils/createToken');
const { generateUsername } = require('../utils/generateUsername');
const User = require('../models/User');

const APP_URL = process.env.CLIENT_URL_V1;

// Callback từ Google
const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.googleId) {
      return res.status(400).json({ message: 'Không thể lấy thông tin từ Google' });
    }

    // Kiểm tra hoặc tạo người dùng trong cơ sở dữ liệu
    let existingUser = await User.findOne({ googleId: user.googleId });
    if (!existingUser) {
      const email = user.email;
      if (!email) {
        return res.status(400).json({ message: 'Không thể lấy email từ Google' });
      }

      const resultUser = await User.findOne({ email: email });

      // Sửa lỗi: Kiểm tra avatar trước khi log
      if (user.avatar && user.avatar.url) {
        console.log('avatar', user.avatar.url);
      }

      if (resultUser && !resultUser.isAdmin) {
        resultUser.authProvider = 'google';
        resultUser.googleId = user.googleId;
        resultUser.isAdmin = false;
        if (resultUser.fullname === null) {
          resultUser.fullname = user.fullname;
        }

        // Chỉ lưu avatar nếu DB chưa có và Google có avatar
        if (!resultUser.avatar?.url && user.avatar?.url) {
          resultUser.avatar = {
            url: user.avatar.url,
            publicId: user.avatar.publicId || '',
          };
        }

        await resultUser.save();
        existingUser = resultUser;
      } else {
        const username = generateUsername(user.fullname);
        existingUser = await User.create({
          authProvider: 'google',
          username,
          googleId: user.googleId,
          fullname: user.fullname,
          email,
          isAdmin: false,
          avatar: user.avatar || null,
        });
      }
    }

    // Tạo access token và refresh token
    const accessToken = generateToken(existingUser);
    const refreshToken = generateRefreshToken(existingUser);

    return res
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES !== 'false',
        path: '/',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
      })
      .redirect(`${APP_URL}/login-google/success`);
  } catch (error) {
    console.error('Google callback error:', error);
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const loginSuccess = async (req, res) => {
  try {
    if (!req.user && !req.session?.user) {
      const refreshToken = req.cookies?.refreshToken ?? req.user?.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Không có thông tin đăng nhập',
        });
      }

      try {
        // Verify refresh token để lấy thông tin user
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const userId = decoded._id;

        // Tìm user trong database
        const infoUser = await User.findById(userId);
        if (!infoUser) {
          return res.status(404).json({
            success: false,
            message: 'Không tìm thấy người dùng',
          });
        }

        // Tạo access token mới
        const newAccessToken = generateToken(infoUser);

        // Sửa lỗi: Kiểm tra _doc trước khi destructure
        const userData = infoUser._doc || infoUser.toObject ? infoUser.toObject() : infoUser;
        const { password, googleId, ...others } = userData;

        console.log('infoUser from refresh token', infoUser);
        return res.status(200).json({
          success: true,
          message: 'Đăng nhập thành công',
          ...others,
          isAdmin: false,
          accessToken: newAccessToken,
          hasPassword: !!password,
        });
      } catch (refreshError) {
        console.error('Refresh token error:', refreshError);
        return res.status(401).json({
          success: false,
          message: 'Phiên đăng nhập đã hết hạn',
          error: refreshError.message,
        });
      }
    }

    // Nếu có session user
    const user = req.user || req.session?.user;
    if (!user || !user.googleId) {
      return res.status(400).json({
        success: false,
        message: 'Không có thông tin người dùng từ Google',
      });
    }

    const infoUser = await User.findOne({ googleId: user.googleId });
    if (!infoUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng',
      });
    }

    // Tạo access token mới
    const newAccessToken = generateToken(infoUser);

    // Sửa lỗi: Kiểm tra _doc trước khi destructure
    const userData = infoUser._doc || infoUser.toObject ? infoUser.toObject() : infoUser;
    const { password, googleId, ...others } = userData;

    console.log('infoUser from session', infoUser);
    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      ...others,
      isAdmin: false,
      accessToken: newAccessToken,
      hasPassword: !!password,
    });
  } catch (error) {
    console.error('Login success error:', error);

    // Xử lý lỗi JWT
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ',
        error: error.message,
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn',
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin đăng nhập',
      error: error.message,
    });
  }
};

const debugCookies = async (req, res) => {
  try {
    const debugInfo = {
      cookies: req.cookies,
      session: req.session,
      user: req.user,
      headers: {
        origin: req.headers.origin,
        referer: req.headers.referer,
        'user-agent': req.headers['user-agent'],
      },
      env: {
        NODE_ENV: process.env.NODE_ENV,
        SECURE_COOKIES: process.env.SECURE_COOKIES,
        COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
      },
    };

    console.log('Debug info:', JSON.stringify(debugInfo, null, 2));

    return res.status(200).json({
      success: true,
      message: 'Debug info',
      data: debugInfo,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error.message,
    });
  }
};

module.exports = {
  googleCallback,
  loginSuccess,
  debugCookies,
};
