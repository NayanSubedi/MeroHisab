import mongoose from 'mongoose';

export const AuditAction = {
  VERIFY_BUSINESS: 'VERIFY_BUSINESS',
  REJECT_BUSINESS: 'REJECT_BUSINESS',
  DELETE_BUSINESS: 'DELETE_BUSINESS',
  CREATE_ADMIN: 'CREATE_ADMIN',
  DELETE_ADMIN: 'DELETE_ADMIN', // actually just DELETE_USER since they share a table
  DELETE_USER: 'DELETE_USER',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD'
};

const auditLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminName: { type: String, required: true },
  action: { type: String, enum: Object.values(AuditAction), required: true },
  details: { type: String, required: true },
  targetId: { type: String, required: false }
}, { timestamps: true });

export default mongoose.model('AuditLog', auditLogSchema);
