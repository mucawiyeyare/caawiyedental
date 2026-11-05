import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // ── Tenant association ──────────────────────────────────────────────────────
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null   // null = Super Admin (platform level)
  },
  is_super_admin: {
    type: Boolean,
    default: false
  },
  // ── Identity ────────────────────────────────────────────────────────────────
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password_hash: {
    type: String,
    required: true
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  },
  role: {
    type: String,
    enum: ['Super Admin', 'Admin', 'Doctor', 'Receptionist/Cashier'],
    required: true
  },
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  full_name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  profile_image: {
    type: String
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  last_login: {
    type: Date
  }
}, { timestamps: true });

userSchema.index({ tenant_id: 1, username: 1 });
userSchema.index({ tenant_id: 1, role: 1 });

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password_hash);
};

export default mongoose.model('User', userSchema);
