const express = require('express');
const passport = require('passport');
require('dotenv').config();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const socialController = require('../controllers/social.controller');

const router = express.Router();

router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/refresh', authController.requestRefreshToken);
router.post('/logout', authMiddleware.verifyToken, authController.userLogout);

router.get('/login/success', socialController.loginSuccess);
router.get('/debug', socialController.debugCookies); // Route debug

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login/failed' }),
  socialController.googleCallback,
);

module.exports = router;
