const VerifyOTP = require('../../models/VerifyOTP');
const { uploadImage, deleteImage } = require('../../utils/cloudinary');
const User = require('../../models/User');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const fs = require('fs');

module.exports = {
  //NOTE: Get information user
  getUserInfo: async (req, res) => {
    try {
      let id;
      if (req.params.id) {
        id = req.params.id;
      } else {
        id = req.user._id;
      }
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp ID người dùng',
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID người dùng không hợp lệ',
        });
      }

      const infoUser = await User.findById(id).select('-password -googleId -facebookId').populate('address');

      if (!infoUser) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại',
        });
      }

      const { ...other } = infoUser._doc;

      return res.status(200).json({
        success: true,
        message: 'Thông tin người dùng',
        user: other,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
        error: error.message,
      });
    }
  },

  //NOTE: Update any user information - Unified update method
  updateUser: async (req, res) => {
    try {
      const id = req.params.id ?? req.user._id;
      const updates = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID người dùng không hợp lệ',
        });
      }

      // Kiểm tra quyền, người dùng chỉ có thể cập nhật thông tin của chính họ, trừ khi là admin
      if (req.user && id !== req.user._id && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cập nhật thông tin của người dùng khác',
        });
      }

      // Kiểm tra trường hợp đặc biệt: chỉ admin mới có thể cập nhật isAdmin và isActive
      if ((updates.isAdmin !== undefined || updates.isActive !== undefined) && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền thay đổi quyền admin hoặc trạng thái hoạt động',
        });
      }

      // Tạo object chứa các trường thông tin được phép cập nhật
      const updateData = {};

      // Validate và xử lý từng trường
      if (updates.fullname !== undefined) {
        if (updates.fullname.length < 2 || updates.fullname.length > 50) {
          return res.status(400).json({
            success: false,
            message: 'Họ và tên phải có từ 2 đến 50 ký tự',
          });
        }
        updateData.fullname = updates.fullname;
      }

      if (updates.gender !== undefined) {
        if (!['male', 'female', 'other'].includes(updates.gender)) {
          return res.status(400).json({
            success: false,
            message: 'Giới tính phải là "nam" hoặc "nu"',
          });
        }
        updateData.gender = updates.gender;
      }

      if (updates.dateBirth !== undefined) {
        const birthDate = new Date(updates.dateBirth);
        if (isNaN(birthDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Ngày sinh không hợp lệ',
          });
        }
        updateData.dateBirth = birthDate;
      }

      if (updates.phone !== undefined) {
        if (!/^[0-9]{10,11}$/.test(updates.phone)) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại không hợp lệ',
          });
        }
        updateData.phone = updates.phone;
      }
      const currentUser = await User.findById(id);
      if (req.file) {
        try {
          // Xóa ảnh cũ nếu có
          if (currentUser?.avatar?.publicId) {
            const result = await deleteImage(currentUser.avatar.publicId);
            console.log('Delete result:', result);
          }

          // Upload new image to Cloudinary
          const result = await uploadImage(req.file.path, 'users');
          updateData.avatar = {
            url: result.secure_url,
            publicId: result.public_id,
          };

          // Clean up the temporary file
          fs.unlinkSync(req.file.path);
        } catch (uploadError) {
          console.error('Error handling image:', uploadError);
          return res.status(500).json({
            success: false,
            message: 'Lỗi khi xử lý ảnh',
          });
        }
      }

      // Chỉ admin mới có thể thay đổi các trường này
      if (req.user.isAdmin && id !== req.user._id) {
        if (updates.isAdmin !== undefined) {
          updateData.isAdmin = updates.isAdmin;
        }

        if (updates.isActive !== undefined) {
          updateData.isActive = updates.isActive;
        }
      }

      // Không cho phép cập nhật username, email và password qua endpoint này
      if (updates.username !== undefined || updates.email !== undefined || updates.password !== undefined) {
        return res.status(400).json({
          success: false,
          message: 'Không thể cập nhật username, email hoặc password qua endpoint này',
        });
      }

      // Kiểm tra xem có bất kỳ trường nào được cập nhật không
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có thông tin nào được cập nhật',
        });
      }

      const user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
        .select('-password -googleId -facebookId')
        .populate('address');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng này không tồn tại',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin thành công',
        user,
      });
    } catch (error) {
      console.error('Lỗi server:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
        error: error.message,
      });
    }
  },

  //NOTE: Update password
  updatePassword: async (req, res) => {
    try {
      const { email, password, confirmPassword } = req.body;
      if (!email || !password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ thông tin',
        });
      }

      const user = await User.findOne({ email: email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại',
        });
      }

      // Kiểm tra xem user có phải là local auth không
      if (user.authProvider !== 'local' && user.password === null) {
        return res.status(400).json({
          success: false,
          message: `Không thể thay đổi mật khẩu cho tài khoản đăng nhập bằng ${user.authProvider}`,
        });
      }

      const verifyOTP = await VerifyOTP.findOne({ user: user._id });
      if (!verifyOTP || !verifyOTP.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: 'Vui lòng xác minh email trước',
        });
      }

      if (password !== confirmPassword) {
        return res.status(409).json({
          success: false,
          message: 'Mật khẩu xác nhận không khớp',
        });
      }

      if (!validator.isStrongPassword(password, { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1 })) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu ít nhất 8 ký tự bao gồm chữ thường, in hoa, số',
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await User.findByIdAndUpdate(user._id, { password: hashedPassword }, { new: true });

      await VerifyOTP.deleteOne({ user: user._id });

      return res.status(200).json({
        success: true,
        message: 'Cập nhật mật khẩu thành công',
      });
    } catch (error) {
      console.error('Lỗi server:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
        error: error.message,
      });
    }
  },

  // NOTE: Change password
  changePassword: async (req, res) => {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Người dùng không tồn tại',
        });
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;

      // Kiểm tra thông tin bắt buộc
      if (!newPassword || !confirmPassword || (user.password && !currentPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ thông tin',
        });
      }

      // Nếu user có password, kiểm tra mật khẩu cũ
      if (user.password) {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({
            success: false,
            message: 'Mật khẩu cũ không đúng',
          });
        }
      }

      // Kiểm tra xác nhận mật khẩu
      if (newPassword !== confirmPassword) {
        return res.status(409).json({
          success: false,
          message: 'Mật khẩu xác nhận không khớp',
        });
      }

      // Kiểm tra độ mạnh mật khẩu
      if (
        !validator.isStrongPassword(newPassword, {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
        })
      ) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu ít nhất 8 ký tự bao gồm chữ thường, in hoa, số',
        });
      }

      // Hash và cập nhật
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.findByIdAndUpdate(user._id, { password: hashedPassword });

      return res.status(200).json({
        success: true,
        message: 'Cập nhật mật khẩu thành công',
      });
    } catch (error) {
      console.error('Lỗi server:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi server',
        error: error.message,
      });
    }
  },
};
