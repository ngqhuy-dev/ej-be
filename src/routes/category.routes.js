const express = require('express');
const {
  getAllCategory,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/category.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const os = require('os');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use OS temp directory for temporary storage
    cb(null, os.tmpdir());
  },
  filename: function (req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

router.get('/', getAllCategory);
router.get('/:id', getCategory);
router.post('/create', authMiddleware.verifyTokenAndAdmin, upload.single('image'), createCategory);
router.patch('/update/:id', authMiddleware.verifyTokenAndAdmin, upload.single('image'), updateCategory);
router.delete('/delete/:id', authMiddleware.verifyTokenAndAdmin, deleteCategory);

module.exports = router;
