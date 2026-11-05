import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import TenantFeature, { ALL_MODULE_KEYS } from '../models/TenantFeature.js';
import Setting from '../models/Setting.js';

const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/caawiyedental';

async function setupSuperAdmin() {
  const username = (process.argv[2] || 'superadmin').toLowerCase().trim();
  const password = process.argv[3] || 'caawiyedental123456';
  const email = (process.argv[4] || 'admin@sodmas.org').toLowerCase().trim();
  const fullName = process.argv[5] || 'Caawiye Dental Super Admin';

  console.log(`\n======================================================`);
  console.log(`   🦷 SODMAS — Super Admin & Clinic Setup`);
  console.log(`======================================================`);
  console.log(`Connecting to MongoDB at: ${dbUri}`);

  await mongoose.connect(dbUri);
  console.log(`✅ Connected to database: ${mongoose.connection.name}`);

  // 1. Setup Super Admin
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  let user = await User.findOne({ username });
  if (user) {
    user.password_hash = password_hash;
    user.role = 'Super Admin';
    user.is_super_admin = true;
    user.tenant_id = null;
    user.status = 'Active';
    user.full_name = fullName;
    user.email = email;
    await user.save();
    console.log(`✅ Updated existing user "${username}" as Super Admin.`);
  } else {
    user = await User.create({
      username,
      password_hash,
      role: 'Super Admin',
      is_super_admin: true,
      tenant_id: null,
      full_name: fullName,
      email,
      status: 'Active'
    });
    console.log(`✅ Created new Super Admin user "${username}".`);
  }

  // 2. Ensure at least one active Clinic / Tenant exists
  let tenant = await Tenant.findOne({ slug: 'caawiye-dental' });
  if (!tenant) {
    const existingAnyTenant = await Tenant.findOne();
    if (!existingAnyTenant) {
      tenant = await Tenant.create({
        tenant_id: uuidv4(),
        name: 'Caawiye Dental Clinic',
        display_name: 'Caawiye Dental Clinic',
        slug: 'caawiye-dental',
        status: 'Active',
        address: 'Mogadishu, Somalia',
        phone: '+252 61 2339093',
        email: 'info@sodmas.org',
        website: 'www.sodmas.org',
        primary_color: '#1a56db',
        secondary_color: '#0d1f4c',
        tagline: 'Excellence in Dental Care',
        currency: 'USD',
        currency_symbol: '$',
        subscription_plan: 'Enterprise',
        notes: 'Primary clinic tenant'
      });
      console.log(`✅ Created primary tenant: ${tenant.name} (${tenant.slug})`);

      // Seed all tenant features
      for (const moduleKey of ALL_MODULE_KEYS) {
        await TenantFeature.create({
          tenant_id: tenant._id,
          module_key: moduleKey,
          enabled: true
        });
      }
      console.log(`✅ Enabled all platform features for ${tenant.name}`);

      // Seed settings
      await Setting.create({
        tenant_id: tenant._id,
        clinic_name: 'Caawiye Dental Clinic',
        tagline: 'Excellence in Dental Care',
        phone: '+252 61 2339093',
        email: 'info@sodmas.org',
        address: 'Mogadishu, Somalia',
        website: 'www.sodmas.org',
        consultation_fee: 20,
        default_lab_test_fee: 5,
        currency: 'USD',
        currency_symbol: '$'
      });
      console.log(`✅ Initialized settings for ${tenant.name}`);
    } else {
      console.log(`ℹ️  Existing tenant found: ${existingAnyTenant.name}`);
    }
  } else {
    console.log(`ℹ️  Caawiye Dental tenant already exists.`);
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`🎉 Super Admin Credentials:`);
  console.log(`   Username : ${username}`);
  console.log(`   Password : ${password}`);
  console.log(`   Email    : ${email}`);
  console.log(`   Role     : Super Admin`);
  console.log(`------------------------------------------------------\n`);

  await mongoose.disconnect();
}

setupSuperAdmin().catch((err) => {
  console.error('❌ Error setting up Super Admin:', err);
  process.exit(1);
});
