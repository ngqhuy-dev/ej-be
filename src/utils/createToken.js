const jwt = require('jsonwebtoken');

module.exports = {
  //COMMENT: Tạo token JWT
  generateToken: (user) => {
    return jwt.sign(
      {
        _id: user._id,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );
  },

  //COMMENT: Tạo refresh token JWT
  generateRefreshToken: (user) => {
    return jwt.sign(
      {
        _id: user._id,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' },
    );
  },
};
