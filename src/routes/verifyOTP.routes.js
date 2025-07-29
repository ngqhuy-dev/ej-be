const express = require('express');
const { sendOTPEmail, verifyOTP } = require('../controllers/verifyOTP.controller');

const router = express.Router();

router.post('/send-otp', sendOTPEmail);
router.post('/verify-otp', verifyOTP);

module.exports = router;
