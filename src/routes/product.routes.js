const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const os = require('os');

const {
  getAllProducts,
  getProductById,
  getProductByIdCategory,
  createProduct,
  editProduct,
  deleteProduct,
} = require('../controllers/product.controller');
const authMiddleware = require('../middlewares/authMiddleware');

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

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.get('/category/:idCategory', getProductByIdCategory);
router.post('/create', authMiddleware.verifyTokenAndAdmin, upload.array('images', 5), createProduct);
router.patch('/update/:id', authMiddleware.verifyTokenAndAdmin, upload.array('images', 5), editProduct);
router.delete('/delete/:id', authMiddleware.verifyTokenAndAdmin, deleteProduct);

module.exports = router;
