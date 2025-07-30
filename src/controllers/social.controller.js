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
      console.error('Google callback: No user or googleId found');
      return res.redirect(`${APP_URL}/login?error=google_auth_failed`);
    }

    // Kiểm tra hoặc tạo người dùng trong cơ sở dữ liệu
    let existingUser = await User.findOne({ googleId: user.googleId });
    if (!existingUser) {
      const email = user.email;
      if (!email) {
        console.error('Google callback: No email found');
        return res.redirect(`${APP_URL}/login?error=no_email`);
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

    // FIX 1: Lưu user vào session để loginSuccess có thể truy cập
    req.session.user = {
      _id: existingUser._id,
      googleId: existingUser.googleId,
      email: existingUser.email,
      fullname: existingUser.fullname,
      username: existingUser.username,
      avatar: existingUser.avatar,
      authProvider: existingUser.authProvider,
      isAdmin: existingUser.isAdmin,
    };

    // FIX 2: Cấu hình cookie chính xác
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    // FIX 3: Chỉ set domain trong production và khi có COOKIE_DOMAIN
    if (process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    console.log('Setting cookie with options:', cookieOptions);

    return res.cookie('refreshToken', refreshToken, cookieOptions).redirect(`${APP_URL}/login-google/success`);
  } catch (error) {
    console.error('Google callback error:', error);
    return res.redirect(`${APP_URL}/login?error=server_error`);
  }
};

const loginSuccess = async (req, res) => {
  try {
    let infoUser = null;
    let newAccessToken = null;

    // FIX 4: Ưu tiên session user trước, sau đó mới check refresh token
    if (req.session?.user && req.session.user.googleId) {
      console.log('Found user in session');

      // Lấy thông tin user mới nhất từ database
      infoUser = await User.findOne({ googleId: req.session.user.googleId });

      if (!infoUser) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng',
        });
      }

      // Tạo access token mới
      newAccessToken = generateToken(infoUser);
    } else if (req.cookies?.refreshToken) {
      console.log('No session user, trying refresh token');

      try {
        // Verify refresh token để lấy thông tin user
        const decoded = jwt.verify(req.cookies.refreshToken, process.env.JWT_REFRESH_SECRET);
        const userId = decoded._id;

        // Tìm user trong database
        infoUser = await User.findById(userId);
        if (!infoUser) {
          return res.status(404).json({
            success: false,
            message: 'Không tìm thấy người dùng',
          });
        }

        // Tạo access token mới
        newAccessToken = generateToken(infoUser);
      } catch (refreshError) {
        console.error('Refresh token error:', refreshError);
        return res.status(401).json({
          success: false,
          message: 'Phiên đăng nhập đã hết hạn',
          error: refreshError.message,
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        message: 'Không có thông tin đăng nhập',
      });
    }

    // FIX 5: Xử lý userData an toàn hơn
    let userData;
    if (infoUser._doc) {
      userData = { ...infoUser._doc };
    } else if (typeof infoUser.toObject === 'function') {
      userData = infoUser.toObject();
    } else {
      userData = { ...infoUser };
    }

    const { password, googleId, ...others } = userData;

    console.log('Login successful for user:', userData.email);

    // FIX 6: Clear session sau khi đã lấy được thông tin
    if (req.session?.user) {
      delete req.session.user;
    }

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      ...others,
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
        cookie: req.headers.cookie, // Thêm để debug
      },
      env: {
        NODE_ENV: process.env.NODE_ENV,
        SECURE_COOKIES: process.env.SECURE_COOKIES,
        COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
        CLIENT_URL_V1: process.env.CLIENT_URL_V1,
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
