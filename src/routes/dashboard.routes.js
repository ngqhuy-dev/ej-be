const mongoose = require('mongoose');

const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authMiddleware');
const dashboardController = require('../controllers/dashboard.controller');

router.get('/', authMiddleware.verifyTokenAndAdmin, dashboardController.getDashboard);

module.exports = router;
