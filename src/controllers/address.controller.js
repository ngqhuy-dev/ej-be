const Address = require('../models/Address');
const User = require('../models/User');
const mongoose = require('mongoose');

module.exports = {
  // Lấy tất cả địa chỉ của một người dùng
  getAddressesByUser: async (req, res) => {
    try {
      let userId;
      if (req.params.id) {
        userId = req.params.id;
      } else {
        userId = req.user._id;
      }
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
      }

      const addresses = await Address.find({ _idUser: userId }).populate('_idUser', 'fullname phone').select('');

      return res.status(200).json({
        success: true,
        count: addresses.length,
        data: addresses,
      });
    } catch (error) {
      console.error('Lỗi khi lấy địa chỉ:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi server',
        error: error.message,
      });
    }
  },

  // Lấy một địa chỉ cụ thể
  getAddress: async (req, res) => {
    try {
      const addressId = req.params.addressId;

      if (!mongoose.Types.ObjectId.isValid(addressId)) {
        return res.status(400).json({ success: false, message: 'ID địa chỉ không hợp lệ' });
      }

      const address = await Address.findById(addressId);

      if (!address) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });
      }

      return res.status(200).json({ success: true, data: address });
    } catch (error) {
      console.error('Lỗi khi lấy địa chỉ:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi server',
        error: error.message,
      });
    }
  },

  // Thêm địa chỉ mới
  addAddress: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = req.user._id;
      const { detailed, district, city, province, isDefault } = req.body;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
      }

      // Kiểm tra người dùng có tồn tại không
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }

      // Nếu đây là địa chỉ mặc định, cập nhật các địa chỉ khác thành không mặc định
      if (isDefault) {
        await Address.updateMany({ _idUser: userId, isDefault: true }, { isDefault: false }, { session });
      }

      // Tạo địa chỉ mới
      const address = new Address({
        _idUser: userId,
        detailed,
        district,
        city,
        province,
        isDefault: isDefault || false,
      });

      const savedAddress = await address.save({ session });

      // Thêm địa chỉ vào mảng address của user
      await User.findByIdAndUpdate(userId, { $push: { address: savedAddress._id } }, { new: true, session });

      await session.commitTransaction();
      session.endSession();

      return res.status(201).json({
        success: true,
        message: 'Thêm địa chỉ thành công',
        data: savedAddress,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error('Lỗi khi thêm địa chỉ:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi server',
        error: error.message,
      });
    }
  },

  // Cập nhật địa chỉ
  updateAddress: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const addressId = req.params.addressId;
      const { detailed, district, city, province, isDefault } = req.body;

      if (!mongoose.Types.ObjectId.isValid(addressId)) {
        return res.status(400).json({ success: false, message: 'ID địa chỉ không hợp lệ' });
      }

      const address = await Address.findById(addressId);
      if (!address) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });
      }

      // Nếu đây là địa chỉ mặc định, cập nhật các địa chỉ khác thành không mặc định
      if (isDefault && !address.isDefault) {
        await Address.updateMany({ _idUser: address._idUser, isDefault: true }, { isDefault: false }, { session });
      }

      // Cập nhật địa chỉ
      const updatedAddress = await Address.findByIdAndUpdate(
        addressId,
        {
          detailed: detailed || address.detailed,
          district: district || address.district,
          city: city || address.city,
          province: province || address.province,
          city: city || address.city,
          isDefault: isDefault !== undefined ? isDefault : address.isDefault,
        },
        { new: true, runValidators: true, session },
      );

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: 'Cập nhật địa chỉ thành công',
        data: updatedAddress,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error('Lỗi khi cập nhật địa chỉ:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi server',
        error: error.message,
      });
    }
  },

  // Xóa địa chỉ
  deleteAddress: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const addressId = req.params.addressId;

      if (!mongoose.Types.ObjectId.isValid(addressId)) {
        return res.status(400).json({ success: false, message: 'ID địa chỉ không hợp lệ' });
      }

      const address = await Address.findById(addressId);
      if (!address) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });
      }

      // Xóa địa chỉ khỏi mảng address của user
      await User.findByIdAndUpdate(address._idUser, { $pull: { address: addressId } }, { session });

      // Xóa địa chỉ
      await Address.findByIdAndDelete(addressId, { session });

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: 'Xóa địa chỉ thành công',
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error('Lỗi khi xóa địa chỉ:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi server',
        error: error.message,
      });
    }
  },

  // Đặt địa chỉ mặc định
  setDefaultAddress: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const addressId = req.params.addressId;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(addressId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
      }

      // Kiểm tra địa chỉ có tồn tại không
      const address = await Address.findById(addressId);
      if (!address) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });
      }

      // Kiểm tra địa chỉ có thuộc về người dùng này không
      if (address._idUser.toString() !== userId) {
        return res.status(403).json({ success: false, message: 'Không có quyền truy cập địa chỉ này' });
      }

      // Cập nhật tất cả địa chỉ của người dùng thành không mặc định
      await Address.updateMany({ _idUser: userId }, { isDefault: false }, { session });

      // Đặt địa chỉ này làm mặc định
      await Address.findByIdAndUpdate(addressId, { isDefault: true }, { new: true, session });

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: 'Đặt địa chỉ mặc định thành công',
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error('Lỗi khi đặt địa chỉ mặc định:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi server',
        error: error.message,
      });
    }
  },

  // Lấy địa chỉ mặc định của người dùng
  getDefaultAddress: async (req, res) => {
    try {
      const userId = req.params.userId;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
      }

      const defaultAddress = await Address.findOne({ _idUser: userId, isDefault: true });

      if (!defaultAddress) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ mặc định' });
      }

      return res.status(200).json({ success: true, data: defaultAddress });
    } catch (error) {
      console.error('Lỗi khi lấy địa chỉ mặc định:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi server',
        error: error.message,
      });
    }
  },
};
