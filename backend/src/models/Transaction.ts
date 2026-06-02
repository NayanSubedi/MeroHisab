import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  date: { type: Date, required: true },
  type: { type: String, required: true }, 
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  vatAmount: { type: Number, default: 0 },
  partyName: String,
  partyPan: String,
  billNumber: String,
  imageUrl: String,
  invoiceDetails: { type: mongoose.Schema.Types.Mixed } 
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);