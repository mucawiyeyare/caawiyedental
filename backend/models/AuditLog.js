import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // ── Tenant context ──────────────────────────────────────────────────────────
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null  // null = platform-level action
  },
  // ── Actor ────────────────────────────────────────────────────────────────────
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  username: {
    type: String,
    default: 'System'
  },
  role: {
    type: String,
    default: ''
  },
  // ── Event ────────────────────────────────────────────────────────────────────
  action: {
    type: String,
    required: true
  },
  entity: {
    type: String,
    required: true
  },
  entity_id: {
    type: String,
    default: ''
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip_address: {
    type: String,
    default: ''
  },
  date_time: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

auditLogSchema.index({ tenant_id: 1, date_time: -1 });
auditLogSchema.index({ user_id: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
