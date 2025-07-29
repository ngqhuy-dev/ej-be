const jwt = require('jsonwebtoken');

const authMiddleware = {
  verifyToken: (req, res, next) => {
    const token = req.headers.token ?? req.headers.authorization;
    if (token) {
      const accessToken = token.split(' ')[1];
      jwt.verify(accessToken, process.env.JWT_SECRET, (err, user) => {
        if (err) {
          return res.status(403).json('Token không hợp lệ!');
        }
        req.user = user;
        next();
      });
    } else {
      return res.status(401).json('Bạn không được xác thực!');
    }
  },
  verifyTokenAndAdmin: (req, res, next) => {
    authMiddleware.verifyToken(req, res, () => {
      if (req.user && req.user.isAdmin) {
        next();
      } else {
        return res.status(403).json('Bạn không có quyền truy cập!');
      }
    });
  },
};

module.exports = authMiddleware;
