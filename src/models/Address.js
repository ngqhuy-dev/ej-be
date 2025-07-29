const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema(
  {
    _idUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    //Cụ thể
    detailed: { type: String, trim: true },
    //Phường/Xã
    district: { type: String, trim: true },
    //Quận/Huyện
    city: { type: String, trim: true },
    //Tỉnh/Thành phố
    province: { type: String, trim: true },
    isDefault: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Address', AddressSchema);
