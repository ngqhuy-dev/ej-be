const { isDate } = require('validator');
const Discount = require('../models/Discount');
const Order = require('../models/Order');
const mongoose = require('mongoose');

module.exports = {
  //NOTE: Get all discounts
  getAllDiscounts: async (req, res) => {
    try {
      const discounts = await Discount.find().lean();
      if (discounts.length === 0) {
        return res.status(200).json([]);
      }
      return res.status(200).json(discounts);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  //NOTE: Get all discount by user (chưa sử dụng)
  getAllDiscountUser: async (req, res) => {
    try {
      const userId = req.params.id;

      // Aggregate để lấy thông tin discount và số lần sử dụng
      const availableDiscounts = await Discount.aggregate([
        {
          $match: {
            isActive: true,
            activation: { $lte: new Date() },
            expiration: { $gte: new Date() },
          },
        },
        {
          $lookup: {
            from: 'orders',
            let: { discountId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$discount', '$$discountId'] },
                      { $eq: ['$_idUser', new mongoose.Types.ObjectId(userId)] },
                    ],
                  },
                },
              },
            ],
            as: 'userUsage',
          },
        },
        {
          $addFields: {
            hasBeenUsedByUser: { $gt: [{ $size: '$userUsage' }, 0] },
          },
        },
        {
          $match: {
            hasBeenUsedByUser: false,
            $expr: { $lt: ['$quantityUsed', '$quantityLimit'] },
          },
        },
      ]);

      return res.status(200).json({
        success: true,
        data: availableDiscounts,
      });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách discount của user:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server',
        error: error.message,
      });
    }
  },

  //NOTE: Get discount
  getDiscount: async (req, res) => {
    try {
      const { id } = req.params;
      const discount = await Discount.findById(id).lean();
      if (!discount) {
        return res.status(404).json({ message: 'Discount not found' });
      }
      return res.status(200).json(discount);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  //NOTE: Create discount
  createDiscount: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { code, type, value, maxPercent, activation, expiration, minOrderAmount, isActive, quantityLimit } =
        req.body;

      // Kiểm tra code trùng
      const checkCode = await Discount.findOne({ code: code.trim() });
      if (checkCode) {
        return res.status(400).json({ err: 'code', message: 'Mã giảm giá đã tồn tại' });
      }

      // Validate type
      if (!['fixed', 'percentage'].includes(type)) {
        return res.status(400).json({ err: 'type', message: 'Loại giảm giá không hợp lệ' });
      }

      // Validate value
      if (type === 'fixed' && (value === undefined || isNaN(value))) {
        return res.status(400).json({ err: 'value', message: 'Giá trị giảm cố định phải là số' });
      }

      // Validate maxPercent
      if (type === 'percentage') {
        if (maxPercent === undefined || isNaN(maxPercent)) {
          return res.status(400).json({ err: 'maxPercent', message: 'Giá trị phần trăm tối đa phải là số' });
        }
        if (maxPercent > 100 || maxPercent < 0) {
          return res.status(400).json({ err: 'maxPercent', message: 'maxPercent phải nằm trong khoảng 0-100' });
        }
      }

      if (quantityLimit && isNaN(quantityLimit)) {
        return res.status(400).json({ err: 'quantityLimit', message: 'Số lượng tối đa phải là số' });
      }

      if (minOrderAmount && isNaN(minOrderAmount)) {
        return res.status(400).json({ err: 'minOrderAmount', message: 'Giá trị đơn hàng tối thiểu phải là số' });
      }

      if (activation && isNaN(Date.parse(activation))) {
        return res.status(400).json({ err: 'activation', message: 'Ngày kích hoạt không hợp lệ' });
      }

      if (expiration && isNaN(Date.parse(expiration))) {
        return res.status(400).json({ err: 'expiration', message: 'Ngày hết hạn không hợp lệ' });
      }

      if (expiration && activation && new Date(expiration) < new Date(activation)) {
        return res.status(400).json({
          err: 'expiration',
          message: 'Ngày hết hạn phải sau ngày kích hoạt',
        });
      }

      // Tạo mới mã giảm giá
      const newDiscount = new Discount({
        code: code.trim(),
        type: type.toLowerCase(),
        value: type === 'fixed' ? value : undefined,
        maxPercent: type === 'percentage' ? maxPercent : undefined,
        activation: activation || new Date(),
        expiration,
        isActive: isActive || false,
        minOrderAmount: minOrderAmount || 0,
        quantityLimit: quantityLimit || 100,
      });

      const savedDiscount = await newDiscount.save({ session });
      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({ success: true, data: savedDiscount });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      console.error('Lỗi khi tạo mã giảm giá:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi server',
        error: error.message,
      });
    }
  },

  //NOTE: Update discount
  updateDiscount: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // If trying to update code, check if it already exists
      if (updateData.code) {
        const existingDiscount = await Discount.findOne({
          code: updateData.code,
          _id: { $ne: id }, // exclude the current discount
        });

        if (existingDiscount) {
          return res.status(400).json({
            err: 'code',
            message: 'Mã giảm giá đã tồn tại',
          });
        }
      }

      const discount = await Discount.findByIdAndUpdate(id, updateData, { new: true });

      if (!discount) {
        return res.status(404).json({ message: 'Discount not found' });
      }

      return res.status(200).json(discount);
    } catch (error) {
      console.error('Lỗi server:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  },

  //NOTE: Delete discount
  deleteDiscount: async (req, res) => {
    try {
      const { id } = req.params;
      const discount = await Discount.findByIdAndDelete(id);
      if (!discount) {
        return res.status(404).json({ message: 'Discount not found' });
      }
      return res.status(200).json({ message: 'Discount deleted successfully' });
    } catch (error) {
      console.error('Lỗi server:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  },

  // NOTE: Toggle discount active status
  toggleDiscountStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const discount = await Discount.findById(id);

      if (!discount) {
        return res.status(404).json({ message: 'Discount not found' });
      }

      discount.isActive = !discount.isActive;
      await discount.save();

      return res.status(200).json(discount);
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái:', error);
      res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  },
};
