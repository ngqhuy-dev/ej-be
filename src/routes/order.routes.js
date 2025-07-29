const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { verifyToken, verifyTokenAndAdmin } = require('../middlewares/authMiddleware');

router.post('/create', verifyToken, orderController.createOrder);
router.get('/my-order', verifyToken, orderController.getOrdersStatus);
router.get('/user/:id', verifyTokenAndAdmin, orderController.getOrdersStatus);
router.get('/list', verifyTokenAndAdmin, orderController.getAllOrders);
router.get('/details/:id', verifyToken, orderController.getOrderDetails);
router.put('/update-status/:id', verifyToken, orderController.updateOrderStatus);
router.delete('/delete/:id', verifyTokenAndAdmin, orderController.deleteOrder);
module.exports = router;
