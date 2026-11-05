import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const tenantSchema = new mongoose.Schema({
  tenant_id: {
    type: String,
    unique: true,
    default: () => uuidv4()
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  display_name: {
    type: String,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended', 'Inactive'],
    default: 'Active'
  },
  // Branding
  logo: { type: String, default: null },
  favicon: { type: String, default: null },
  primary_color: { type: String, default: '#1a56db' },
  secondary_color: { type: String, default: '#0d1f4c' },
  accent_color: { type: String, default: '#0284c7' },
  banner_style: { type: String, default: 'gradient' },
  dashboard_theme: { type: String, default: 'navy' },
  banner_text_color: { type: String, default: '#ffffff' },
  button_text_color: { type: String, default: '#ffffff' },
  header_bg: { type: String, default: '#ffffff' },
  sidebar_bg: { type: String, default: '#0d1f4c' },
  // Contact Info
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  website: { type: String, default: '' },
  // Locale
  currency: { type: String, default: 'USD' },
  currency_symbol: { type: String, default: '$' },
  timezone: { type: String, default: 'UTC' },
  // Clinic config
  tagline: { type: String, default: 'Professional Dental Care' },
  consultation_fee: { type: Number, default: 20 },
  default_lab_test_fee: { type: Number, default: 3 },
  tooth_numbering_system: {
    type: String,
    enum: ['FDI (Two-digit notation)', 'Universal (1-32)', 'Palmer Notation'],
    default: 'FDI (Two-digit notation)'
  },
  tax_percentage: { type: Number, default: 0 },
  // Subscription
  subscription_plan: {
    type: String,
    enum: ['Free', 'Basic', 'Professional', 'Enterprise'],
    default: 'Professional'
  },
  subscription_expires_at: { type: Date },
  // Owner
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  owner_name: { type: String, default: '' },
  // Notes
  notes: { type: String, default: '' }
}, { timestamps: true });

tenantSchema.index({ status: 1 });

export default mongoose.model('Tenant', tenantSchema);

