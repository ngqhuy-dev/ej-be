const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

const dashboard = {
  getDashboard: async (req, res) => {
    try {
      const [userCount, orderCount, productCount] = await Promise.all([
        User.countDocuments(),
        Order.countDocuments(),
        Product.countDocuments(),
      ]);

      // Tính tổng doanh thu từ các đơn hàng đã thanh toán
      const paidOrders = await Order.find({ isPaid: true }).select('totalAmount createdAt');
      const totalRevenue = paidOrders.reduce((acc, order) => acc + order.totalAmount, 0);

      // Tính doanh thu theo tháng cho năm hiện tại
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = Array(12).fill(0);

      paidOrders.forEach((order) => {
        const orderDate = new Date(order.createdAt);
        if (orderDate.getFullYear() === currentYear) {
          const month = orderDate.getMonth(); // 0-11
          monthlyRevenue[month] += order.totalAmount;
        }
      });

      res.status(200).json({
        userCount,
        orderCount,
        productCount,
        totalRevenue,
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy dữ liệu dashboard' });
    }
  },
};

module.exports = dashboard;
