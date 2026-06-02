import mongoose from 'mongoose';

export const BusinessType = {
  SOLE_PROPRIETOR: 'SOLE_PROPRIETOR',
  PARTNERSHIP: 'PARTNERSHIP',
  PVT_LTD: 'PVT_LTD'
};

const businessSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pan: { type: String, required: true, unique: true },
  type: { type: String, enum: Object.values(BusinessType), required: true },
  ownerName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: String,
  addressLine1: String,
  addressLine2: String,
  city: String,
  province: String,
  country: String,
  zipCode: String,
  taxSystem: { type: String, default: 'PAN' },
  annualTurnover: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  rejectionReason: String,
  panPhoto: String,
  logo: String,
  enableBiometricLogin: { type: Boolean, default: false }
}, { timestamps: true });

businessSchema.pre('findOneAndDelete', async function() {
  const businessId = this.getQuery()._id;
  await mongoose.model('User').deleteMany({ businessId });
  await mongoose.model('Transaction').deleteMany({ businessId });
});

export default mongoose.model('Business', businessSchema);