import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  // ── Tenant association ──────────────────────────────────────────────────────
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    unique: true
  },
  // ── Clinic identity ─────────────────────────────────────────────────────────
  logo: {
    type: String,
    default: null
  },
  primary_color: {
    type: String,
    default: '#1a56db'
  },
  secondary_color: {
    type: String,
    default: '#0d1f4c'
  },
  accent_color: {
    type: String,
    default: '#0284c7'
  },
  banner_style: {
    type: String,
    default: 'gradient'
  },
  dashboard_theme: {
    type: String,
    default: 'navy'
  },
  banner_text_color: {
    type: String,
    default: '#ffffff'
  },
  button_text_color: {
    type: String,
    default: '#ffffff'
  },
  sidebar_bg: {
    type: String,
    default: '#0d1f4c'
  },
  header_bg: {
    type: String,
    default: '#ffffff'
  },
  clinic_name: {
    type: String,
    default: 'Dental Clinic'
  },
  tagline: {
    type: String,
    default: 'Professional Dental Care'
  },
  phone: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  // ── Financial ────────────────────────────────────────────────────────────────
  consultation_fee: {
    type: Number,
    default: 20
  },
  default_lab_test_fee: {
    type: Number,
    default: 3
  },
  currency: {
    type: String,
    default: 'USD'
  },
  currency_symbol: {
    type: String,
    default: '$'
  },
  tax_percentage: {
    type: Number,
    default: 0
  },
  // ── Clinical ─────────────────────────────────────────────────────────────────
  tooth_numbering_system: {
    type: String,
    enum: ['FDI (Two-digit notation)', 'Universal (1-32)', 'Palmer Notation'],
    default: 'FDI (Two-digit notation)'
  }
}, { timestamps: true });

export default mongoose.model('Setting', settingSchema);
