const Category = require('../models/Category');
const { uploadImage, deleteImage } = require('../utils/cloudinary');
const fs = require('fs');
const path = require('path');
const os = require('os');

const getNextCategoryCode = async () => {
  try {
    const lastCategory = await Category.findOne().sort({ code: -1 });

    const lastCode = lastCategory ? parseInt(lastCategory.code.split('-')[1]) : 0;

    return `CAT-${String(lastCode + 1).padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating category code:', error);
    throw error;
  }
};

module.exports = {
  //NOTE: Get all category
  getAllCategory: async (req, res) => {
    try {
      const categories = await Category.find();

      return res.json(categories);
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  //NOTE: Get category
  getCategory: async (req, res) => {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ message: 'Danh mục không tồn tại' });
      }

      return res.status(200).json(category);
    } catch (error) {
      console.error('❌ Error fetching category:', error);
      return res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  },

  //NOTE: Create category
  createCategory: async (req, res) => {
    try {
      const { name, slug, description } = req.body;
      const trimmedName = name ? name.trim() : '';

      // Kiểm tra tên danh mục
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          error: 'Thiếu dữ liệu',
          message: 'Vui lòng nhập tên danh mục',
        });
      }

      // Kiểm tra độ dài mô tả
      if (description && description.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Mô tả quá dài',
          message: 'Mô tả không được vượt quá 500 ký tự',
        });
      }

      // Kiểm tra danh mục đã tồn tại
      const existingCategory = await Category.findOne({ name: trimmedName });
      if (existingCategory) {
        return res.status(409).json({
          success: false,
          error: 'Danh mục đã tồn tại',
          message: 'Vui lòng nhập tên khác',
        });
      }

      // Kiểm tra và tạo slug
      const finalSlug = slug ? slug.trim() : slugify(trimmedName, { lower: true, strict: true });
      if (!finalSlug || !/^[a-z0-9-]+$/.test(finalSlug)) {
        return res.status(400).json({
          success: false,
          error: 'Slug không hợp lệ',
          message: 'Slug chỉ được chứa chữ cái, số và dấu gạch ngang',
        });
      }
      const checkSlug = await Category.findOne({ slug: finalSlug });
      if (checkSlug) {
        return res.status(409).json({
          success: false,
          message: 'Slug đã tồn tại!',
        });
      }

      // Tạo mã danh mục
      const newCode = await getNextCategoryCode(); // Hoặc sử dụng uuidv4()
      if (!newCode) {
        return res.status(500).json({
          success: false,
          message: 'Không thể tạo mã danh mục',
        });
      }

      // Tải ảnh lên nếu có
      let imageData = { url: '', publicId: '' };
      if (req.file) {
        try {
          const result = await uploadImage(req.file.path, 'categories');
          imageData = {
            url: result.secure_url,
            publicId: result.public_id,
          };
          try {
            await fs.unlink(req.file.path);
          } catch (unlinkError) {
            console.error('Lỗi khi xóa tệp tạm:', unlinkError);
          }
        } catch (uploadError) {
          console.error('Lỗi khi tải ảnh lên Cloudinary:', uploadError);
          return res.status(500).json({
            success: false,
            message: 'Lỗi khi tải ảnh lên Cloudinary',
          });
        }
      }

      // Tạo danh mục mới
      const newCategory = new Category({
        code: newCode,
        name: trimmedName,
        slug: finalSlug,
        description: description || '',
        image: imageData,
      });

      const savedCategory = await newCategory.save();

      return res.status(200).json({
        success: true,
        data: savedCategory,
      });
    } catch (error) {
      console.error('Lỗi:', error);
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Danh mục, mã hoặc slug đã tồn tại',
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra, vui lòng thử lại',
      });
    }
  },

  //NOTE: Update category
  updateCategory: async (req, res) => {
    try {
      const { name, slug, description, isOutstanding, status } = req.body;
      const { id } = req.params;
      const category = await Category.findOne({ _id: id });

      if (!category) {
        return res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
      }

      if (name) {
        const trimmedName = name.trim();
        // Kiểm tra danh mục đã tồn tại theo tên (không phân biệt hoa thường)
        const existingCategory = await Category.findOne({
          name: { $regex: `^${trimmedName}$`, $options: 'i' },
        });
        if (existingCategory && existingCategory._id !== id) {
          return res.status(409).json({
            success: false,
            message: 'Danh mục này đã tồn tại',
          });
        }
      }

      if (slug) {
        const checkSlug = await Category.findOne({ slug: slug });
        if (checkSlug && checkSlug._id !== id) {
          return res.status(409).json({ success: false, message: 'Slug đã tồn tại!' });
        }
      }

      // Handle image upload if provided
      if (req.file) {
        try {
          // Delete old image from Cloudinary if exists
          if (category.image && category.image.publicId) {
            await deleteImage(category.image.publicId);
          }

          // Upload new image to Cloudinary
          const result = await uploadImage(req.file.path, 'categories');
          category.image = {
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

      // Cập nhật các trường khác
      if (name) category.name = trimmedName;
      if (slug) category.slug = slug;
      if (description) category.description = description;
      if (isOutstanding !== undefined) category.isOutstanding = isOutstanding;
      if (status) category.status = status;

      await category.save();
      return res.status(200).json({ success: true, data: category });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  //NOTE: Delete category
  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({ success: false, message: 'Danh mục không tồn tại' });
      }

      // Delete image from Cloudinary if exists
      if (category.image && category.image.publicId) {
        try {
          await deleteImage(category.image.publicId);
        } catch (deleteError) {
          console.error('Error deleting image from Cloudinary:', deleteError);
          // Continue with category deletion even if image deletion fails
        }
      }

      await Category.findByIdAndDelete(id);
      return res.status(200).json({ success: true, message: 'Xóa danh mục thành công.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Xóa danh mục thất bại!' });
    }
  },
};
