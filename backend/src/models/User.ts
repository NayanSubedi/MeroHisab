import mongoose from 'mongoose';

export const UserRole = {
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
  ACCOUNTANT: 'ACCOUNTANT',
  STAFF: 'STAFF'
};

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), required: true },
  status: { type: String, default: 'Active' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null }
}, { timestamps: true });

export default mongoose.model('User', userSchema);