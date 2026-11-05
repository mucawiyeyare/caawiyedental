/**
 * Dental Hub — Data Migration Script
 * 
 * Purpose: Safely migrates existing single-tenant data to multitenant schema.
 * - Creates Tenant records for Snab Dental Clinic and Al Furat Dental Clinic
 * - Assigns ALL existing records to Snab (confirmed by codebase analysis)
 * - Creates Super Admin user
 * - Creates default feature configurations for both clinics
 * - Creates initial Settings per tenant
 * 
 * Safety: All operations are additive. No records are deleted.
 * Run with: node utils/migrate.js
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Models
import Tenant from '../models/Tenant.js';
import TenantFeature, { ALL_MODULE_KEYS } from '../models/TenantFeature.js';
import User from '../models/User.js';
import Setting from '../models/Setting.js';
import Patient from '../models/Patient.js';
import Visit from '../models/Visit.js';
import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import Treatment from '../models/Treatment.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import DentalInventory from '../models/DentalInventory.js';
import DentalCategory from '../models/DentalCategory.js';
import DentalService from '../models/DentalService.js';
import Medicine from '../models/Medicine.js';
import Prescription from '../models/Prescription.js';
import LabTest from '../models/LabTest.js';
import LabRequest from '../models/LabRequest.js';
import LabResult from '../models/LabResult.js';
import Employee from '../models/Employee.js';
import Followup from '../models/Followup.js';
import AuditLog from '../models/AuditLog.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/snab_dental_ms';

async function migrate() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║       Dental Hub — Multitenant Migration Script          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  // ─── STEP 1: Record counts before migration ───────────────────────────────
  console.log('\n📊 Pre-migration record counts:');
  const counts = {
    users:       await User.countDocuments(),
    patients:    await Patient.countDocuments(),
    visits:      await Visit.countDocuments(),
    appointments:await Appointment.countDocuments(),
    consultations:await Consultation.countDocuments(),
    treatments:  await Treatment.countDocuments(),
    invoices:    await Invoice.countDocuments(),
    payments:    await Payment.countDocuments(),
    expenses:    await Expense.countDocuments(),
    inventory:   await DentalInventory.countDocuments(),
    services:    await DentalService.countDocuments(),
    medicines:   await Medicine.countDocuments(),
    prescriptions:await Prescription.countDocuments(),
    labTests:    await LabTest.countDocuments(),
    labRequests: await LabRequest.countDocuments(),
    labResults:  await LabResult.countDocuments(),
    employees:   await Employee.countDocuments(),
    followups:   await Followup.countDocuments(),
  };
  Object.entries(counts).forEach(([k, v]) => console.log(`   ${k.padEnd(15)}: ${v}`));

  // ─── STEP 2: Create SNAB Dental Clinic Tenant ────────────────────────────
  console.log('\n🏥 Creating Snab Dental Clinic tenant...');
  let snabTenant = await Tenant.findOne({ slug: 'snab-dental' });
  if (!snabTenant) {
    snabTenant = await Tenant.create({
      tenant_id: uuidv4(),
      name: 'Snab Dental MS',
      display_name: 'Snab Dental MS',
      slug: 'snab-dental',
      status: 'Active',
      address: 'Mogadishu Main Road, Isgoyska howalwadaag, Somalia',
      phone: '+252 61 2339093',
      email: 'info@snabdental.com',
      website: 'www.snabdental.com',
      primary_color: '#1a56db',
      secondary_color: '#0d1f4c',
      tagline: 'Dental Management System',
      currency: 'USD',
      currency_symbol: '$',
      subscription_plan: 'Enterprise',
      notes: 'Original clinic — migrated from single-tenant system'
    });
    console.log('   ✅ Snab tenant created:', snabTenant._id);
  } else {
    console.log('   ℹ️  Snab tenant already exists:', snabTenant._id);
  }

  // ─── STEP 3: Create Al Furat Dental Clinic Tenant ────────────────────────
  console.log('\n🏥 Creating Al Furat Dental Clinic tenant...');
  let alfuratTenant = await Tenant.findOne({ slug: 'alfurat-dental' });
  if (!alfuratTenant) {
    alfuratTenant = await Tenant.create({
      tenant_id: uuidv4(),
      name: 'Al Furat Dental Clinic',
      display_name: 'Al Furat Dental Clinic',
      slug: 'alfurat-dental',
      status: 'Active',
      address: '',
      phone: '',
      email: '',
      primary_color: '#059669',
      secondary_color: '#064e3b',
      tagline: 'Quality Dental Care',
      currency: 'USD',
      currency_symbol: '$',
      subscription_plan: 'Professional',
      notes: 'Al Furat clinic — new tenant'
    });
    console.log('   ✅ Al Furat tenant created:', alfuratTenant._id);
  } else {
    console.log('   ℹ️  Al Furat tenant already exists:', alfuratTenant._id);
  }

  // ─── STEP 4: Create Super Admin user ─────────────────────────────────────
  console.log('\n👤 Creating Super Admin user...');
  let superAdmin = await User.findOne({ role: 'Super Admin' });
  if (!superAdmin) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('DentalHub@2026!', salt);
    superAdmin = await User.create({
      tenant_id: null,
      is_super_admin: true,
      username: 'superadmin',
      password_hash,
      full_name: 'Dental Hub Super Admin',
      email: 'admin@dentalhub.com',
      role: 'Super Admin',
      status: 'Active'
    });
    console.log('   ✅ Super Admin created');
    console.log('   📝 Username: superadmin');
    console.log('   📝 Password: DentalHub@2026!');
    console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!');
  } else {
    console.log('   ℹ️  Super Admin already exists');
  }

  // ─── STEP 5: Assign existing users to Snab tenant ────────────────────────
  console.log('\n👥 Assigning existing users to Snab tenant...');
  const usersWithoutTenant = await User.find({ tenant_id: null, is_super_admin: { $ne: true }, role: { $ne: 'Super Admin' } });
  if (usersWithoutTenant.length > 0) {
    await User.updateMany(
      { tenant_id: null, is_super_admin: { $ne: true }, role: { $ne: 'Super Admin' } },
      { $set: { tenant_id: snabTenant._id } }
    );
    console.log(`   ✅ Assigned ${usersWithoutTenant.length} existing users to Snab`);
  } else {
    console.log('   ℹ️  All users already have tenant assignments');
  }

  // ─── STEP 6: Assign ALL existing data records to Snab ────────────────────
  console.log('\n📦 Assigning existing records to Snab tenant...');

  const models = [
    { name: 'Patient',       model: Patient },
    { name: 'Visit',         model: Visit },
    { name: 'Appointment',   model: Appointment },
    { name: 'Consultation',  model: Consultation },
    { name: 'Treatment',     model: Treatment },
    { name: 'Invoice',       model: Invoice },
    { name: 'Payment',       model: Payment },
    { name: 'Expense',       model: Expense },
    { name: 'DentalInventory',model: DentalInventory },
    { name: 'DentalCategory',model: DentalCategory },
    { name: 'DentalService', model: DentalService },
    { name: 'Medicine',      model: Medicine },
    { name: 'Prescription',  model: Prescription },
    { name: 'LabTest',       model: LabTest },
    { name: 'LabRequest',    model: LabRequest },
    { name: 'LabResult',     model: LabResult },
    { name: 'Employee',      model: Employee },
    { name: 'Followup',      model: Followup },
  ];

  for (const { name, model } of models) {
    const result = await model.updateMany(
      { tenant_id: { $exists: false } },
      { $set: { tenant_id: snabTenant._id } }
    );
    const result2 = await model.updateMany(
      { tenant_id: null },
      { $set: { tenant_id: snabTenant._id } }
    );
    const updated = result.modifiedCount + result2.modifiedCount;
    if (updated > 0) {
      console.log(`   ✅ ${name.padEnd(16)}: assigned ${updated} records`);
    }
  }

  // Assign audit logs to Snab (clinic-level ones)
  await AuditLog.updateMany(
    { tenant_id: null, role: { $ne: 'Super Admin' } },
    { $set: { tenant_id: snabTenant._id } }
  );
  console.log('   ✅ AuditLog      : existing logs assigned to Snab');

  // ─── STEP 7: Create feature configurations ───────────────────────────────
  console.log('\n⚙️  Creating feature configurations...');
  for (const tenant of [snabTenant, alfuratTenant]) {
    for (const moduleKey of ALL_MODULE_KEYS) {
      const exists = await TenantFeature.findOne({ tenant_id: tenant._id, module_key: moduleKey });
      if (!exists) {
        await TenantFeature.create({
          tenant_id: tenant._id,
          module_key: moduleKey,
          enabled: true
        });
      }
    }
    console.log(`   ✅ Features set for: ${tenant.name}`);
  }

  // ─── STEP 8: Create/migrate Settings ─────────────────────────────────────
  console.log('\n⚙️  Creating tenant Settings records...');
  const snabSetting = await Setting.findOne({ tenant_id: snabTenant._id });
  if (!snabSetting) {
    // Try to get old setting
    const oldSetting = await Setting.findOne({ tenant_id: null }) || await Setting.findOne({});
    await Setting.create({
      tenant_id: snabTenant._id,
      clinic_name: oldSetting?.clinic_name || 'Snab Dental MS',
      tagline: oldSetting?.tagline || 'Dental Management System',
      phone: oldSetting?.phone || '+252 61 2339093',
      email: oldSetting?.email || 'info@snabdental.com',
      address: oldSetting?.address || 'Mogadishu Main Road, Isgoyska howalwadaag, Somalia',
      website: oldSetting?.website || 'www.snabdental.com',
      consultation_fee: oldSetting?.consultation_fee || 20,
      default_lab_test_fee: oldSetting?.default_lab_test_fee || 3,
      currency: oldSetting?.currency || 'USD',
      currency_symbol: oldSetting?.currency_symbol || '$',
      tooth_numbering_system: oldSetting?.tooth_numbering_system || 'FDI (Two-digit notation)',
      tax_percentage: oldSetting?.tax_percentage || 0,
    });
    console.log('   ✅ Settings created for Snab');
  } else {
    console.log('   ℹ️  Settings already exist for Snab');
  }

  const alfuratSetting = await Setting.findOne({ tenant_id: alfuratTenant._id });
  if (!alfuratSetting) {
    await Setting.create({
      tenant_id: alfuratTenant._id,
      clinic_name: 'Al Furat Dental Clinic',
      tagline: 'Quality Dental Care',
      currency: 'USD',
      currency_symbol: '$',
    });
    console.log('   ✅ Settings created for Al Furat');
  } else {
    console.log('   ℹ️  Settings already exist for Al Furat');
  }

  // ─── STEP 9: Post-migration validation ───────────────────────────────────
  console.log('\n🔍 Post-migration validation:');
  const snabPatients = await Patient.countDocuments({ tenant_id: snabTenant._id });
  const unassigned = await Patient.countDocuments({ tenant_id: null });
  console.log(`   Snab patients: ${snabPatients}`);
  console.log(`   Unassigned patients: ${unassigned} ${unassigned > 0 ? '⚠️  REVIEW NEEDED' : '✅'}`);

  const snabUsers = await User.countDocuments({ tenant_id: snabTenant._id });
  const superAdmins = await User.countDocuments({ is_super_admin: true });
  console.log(`   Snab users: ${snabUsers}`);
  console.log(`   Super admins: ${superAdmins}`);

  // ─── DONE ─────────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║              Migration completed successfully!            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n📋 Summary:');
  console.log(`   Snab Tenant ID:    ${snabTenant._id}`);
  console.log(`   Al Furat Tenant ID: ${alfuratTenant._id}`);
  console.log('\n⚠️  Next steps:');
  console.log('   1. Change superadmin password at first login');
  console.log('   2. Set Al Furat branding via Super Admin dashboard');
  console.log('   3. Create Admin user for Al Furat clinic');
  console.log('   4. Restart the backend server\n');

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('\n❌ Migration failed:', err);
  mongoose.disconnect();
  process.exit(1);
});

