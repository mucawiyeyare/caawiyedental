import mongoose from 'mongoose';

// Registry of all available modules in Dental Hub
export const MODULE_REGISTRY = {
  patients:       { key: 'patients',       label: 'Patients & History',         description: 'Patient registration and medical history' },
  appointments:   { key: 'appointments',   label: 'Appointments',               description: 'Appointment scheduling and management' },
  visits:         { key: 'visits',         label: 'Visits & Queue',             description: 'Daily patient flow and live queue' },
  consultations:  { key: 'consultations',  label: 'Doctor Consultations',       description: 'Clinical consultation records' },
  treatments:     { key: 'treatments',     label: 'Dental Treatments',          description: 'Dental treatment plans and records' },
  services:       { key: 'services',       label: 'Dental Services',            description: 'Service catalog and pricing' },
  billing:        { key: 'billing',        label: 'Billing & Invoices',         description: 'Invoice generation and management' },
  payments:       { key: 'payments',       label: 'Cashier & Receipts',         description: 'Payment processing and receipts' },
  pharmacy:       { key: 'pharmacy',       label: 'Pharmacy & Medicines',       description: 'Medicine dispensing and prescriptions' },
  lab:            { key: 'lab',            label: 'Laboratory',                 description: 'Lab tests, requests and results' },
  inventory:      { key: 'inventory',      label: 'Dental Inventory',           description: 'Equipment and material management' },
  expenses:       { key: 'expenses',       label: 'Expenses',                   description: 'Operational expense tracking' },
  employees:      { key: 'employees',      label: 'Employee Directory',         description: 'Staff records and attendance' },
  reports:        { key: 'reports',        label: 'Reports & Analytics',        description: 'Financial and clinical reporting' },
  audit_logs:     { key: 'audit_logs',     label: 'Audit Logs',                 description: 'System event and activity logs' },
  settings:       { key: 'settings',       label: 'Settings',                   description: 'Clinic configuration and branding' },
};

export const ALL_MODULE_KEYS = Object.keys(MODULE_REGISTRY);

// Default: all modules enabled for new tenants
export const DEFAULT_ENABLED_MODULES = ALL_MODULE_KEYS;

const tenantFeatureSchema = new mongoose.Schema({
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  module_key: {
    type: String,
    required: true,
    enum: ALL_MODULE_KEYS
  },
  enabled: {
    type: Boolean,
    default: true
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

tenantFeatureSchema.index({ tenant_id: 1, module_key: 1 }, { unique: true });

export default mongoose.model('TenantFeature', tenantFeatureSchema);

