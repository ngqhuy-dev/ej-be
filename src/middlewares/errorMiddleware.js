// errorMiddleware.js
const errorHandler = (err, req, res, next) => {
  // Kiểm tra xem response đã được gửi chưa
  if (res.headersSent) {
    return next(err);
  }

  // Mã trạng thái mặc định là 500 nếu status code là 200
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  return res.status(statusCode).json({
    success: false, // Thêm trường này để nhất quán với các API khác
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { errorHandler };
