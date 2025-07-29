const VerifyOTP = require('../models/VerifyOTP');
const _users = require('../models/User');
const MailJet = require('node-mailjet');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

require('dotenv').config();

// Initialize Mailjet client with API key and secret key
const mailJet = new MailJet({
  apiKey: process.env.MJ_APIKEY_PUBLIC,
  apiSecret: process.env.MJ_APIKEY_PRIVATE,
});

module.exports = {
  sendOTPEmail: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
      }

      const user = await _users.findOne({ email: email });
      if (!user) {
        return res.status(400).json({ message: 'Người dùng không tồn tại' });
      }

      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      let verifyOTP = await VerifyOTP.findOne({ user: user._id });
      if (!verifyOTP) {
        verifyOTP = new VerifyOTP({ user: user._id });
      }

      const hashedOtp = await bcrypt.hash(otp, 10);
      verifyOTP.otp = hashedOtp;
      verifyOTP.otpExpires = otpExpires;
      await verifyOTP.save();

      if (email) {
        await mailJet.post('send', { version: 'v3.1' }).request({
          Messages: [
            {
              From: { Email: process.env.MJ_SENDER, Name: 'Green Store' },
              To: [{ Email: email }],
              Subject: '[GreenStore] Reset Password',
              HTMLPart: `
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #1a73e8;">Xác nhận mã OTP của bạn</h2>
                        <p>Kính gửi Quý khách,</p>
                        <p>Để đảm bảo an toàn cho tài khoản của bạn, chúng tôi gửi đến bạn mã OTP để xác minh danh tính. Vui lòng sử dụng mã sau đây:</p>
                        <p style="font-size: 24px; font-weight: bold; color: #1a73e8;">${otp}</p>
                        <p>Mã này có hiệu lực trong vòng 5 phút kể từ thời điểm email này được gửi. Vui lòng nhập mã vào hệ thống để hoàn tất quá trình xác nhận.</p>
                        <p><strong>Lưu ý:</strong></p>
                        <ul>
                            <li>Không chia sẻ mã OTP này với bất kỳ ai, kể cả nhân viên hỗ trợ, để tránh rủi ro bảo mật.</li>
                            <li>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email hoặc liên hệ với chúng tôi qua ${process.env.MJ_SENDER} để được hỗ trợ.</li>
                        </ul>
                        <p>Trân trọng cảm ơn sự hợp tác của bạn. Nếu có bất kỳ thắc mắc nào, xin vui lòng liên hệ với chúng tôi qua [${process.env.MJ_SENDER}].</p>
                        <p>Trân trọng,<br>Đội ngũ hỗ trợ<br>Green Store</p>
                    </div>
                </body>
              `,
            },
          ],
        });
      }

      return res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Error sending OTP', error: error.message });
    }
  },

  verifyOTP: async (req, res) => {
    try {
      //NOTE: lấy email từ localStorage
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
      }

      const user = await _users.findOne({ email: email });
      console.log(user);

      const verifyOTP = await VerifyOTP.findOne({ user: user._id });
      const isMatch = await bcrypt.compare(otp, verifyOTP.otp);
      if (!verifyOTP || !isMatch || verifyOTP.otpExpires < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      await VerifyOTP.updateOne(
        { user: user._id },
        { otp: null, otpExpires: null, isEmailVerified: true, isPhoneVerified: false },
      );
      return res.status(200).json({ message: 'OTP verified successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Error verifying OTP', error: error.message });
    }
  },
};
