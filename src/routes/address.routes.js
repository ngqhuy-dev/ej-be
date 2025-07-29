const express = require('express');
const router = express.Router();
const addressController = require('../controllers/address.controller');
const { verifyToken, verifyTokenAndAdmin } = require('../middlewares/authMiddleware');

// Lấy tất cả địa chỉ của một người dùng
router.get('/user/all', verifyToken, addressController.getAddressesByUser);

router.get('/user/all/:id', verifyTokenAndAdmin, addressController.getAddressesByUser);

// Lấy một địa chỉ cụ thể
router.get('/:addressId', verifyToken, addressController.getAddress);

// Thêm địa chỉ mới
router.post('/add', verifyToken, addressController.addAddress);

// Cập nhật địa chỉ
router.put('/:addressId', verifyToken, addressController.updateAddress);

// Xóa địa chỉ
router.delete('/:addressId', verifyToken, addressController.deleteAddress);

// Đặt địa chỉ mặc định
router.put('/:addressId/set-default', verifyToken, addressController.setDefaultAddress);

// Lấy địa chỉ mặc định của người dùng
router.get('/default/user/:userId', verifyTokenAndAdmin, addressController.getDefaultAddress);

module.exports = router;
