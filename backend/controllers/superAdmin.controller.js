import Tenant from '../models/Tenant.js';
import TenantFeature from '../models/TenantFeature.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Setting from '../models/Setting.js';
import AuditLog from '../models/AuditLog.js';
import Visit from '../models/Visit.js';
import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import Treatment from '../models/Treatment.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import Employee from '../models/Employee.js';
import Followup from '../models/Followup.js';
import DentalService from '../models/DentalService.js';
import DentalInventory from '../models/DentalInventory.js';
import DentalCategory from '../models/DentalCategory.js';
import Medicine from '../models/Medicine.js';
import Prescription from '../models/Prescription.js';
import LabRequest from '../models/LabRequest.js';
import LabResult from '../models/LabResult.js';
import LabTest from '../models/LabTest.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { ALL_MODULE_KEYS, DEFAULT_ENABLED_MODULES } from '../models/TenantFeature.js';
import { logAudit } from '../middleware/audit.js';

/**
 * GET /api/super-admin/tenants
 * List all tenants with stats
 */
export const getTenants = async (req, res, next) => {
  try {
    const tenants = await Tenant.find().populate('owner_id', 'full_name username email').sort({ createdAt: -1 });

    // Attach user counts
    const enriched = await Promise.all(tenants.map(async (t) => {
      const [userCount, patientCount] = await Promise.all([
        User.countDocuments({ tenant_id: t._id }),
        Patient.countDocuments({ tenant_id: t._id })
      ]);
      const features = await TenantFeature.find({ tenant_id: t._id });
      const enabledModules = features.filter(f => f.enabled).map(f => f.module_key);
      return {
        ...t.toObject(),
        stats: { userCount, patientCount },
        enabledModules
      };
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/super-admin/tenants/:id
 */
export const getTenantById = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id).populate('owner_id', 'full_name username email');
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    const features = await TenantFeature.find({ tenant_id: tenant._id });
    const users = await User.find({ tenant_id: tenant._id }).select('-password_hash');

    res.json({ success: true, data: { tenant, features, users } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/super-admin/tenants
 * Create a new tenant (clinic) with its default features and optional admin user
 */
export const createTenant = async (req, res, next) => {
  try {
    const {
      name, display_name, slug, address, phone, email, website,
      primary_color, secondary_color, accent_color, banner_style, dashboard_theme, logo, favicon, tagline,
      currency, currency_symbol, subscription_plan, notes,
      // Optional initial admin user
      admin_username, admin_password, admin_full_name, admin_email
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'Clinic name and slug are required.' });
    }

    const existingSlug = await Tenant.findOne({ slug: slug.toLowerCase() });
    if (existingSlug) {
      return res.status(409).json({ success: false, message: 'A clinic with this slug already exists.' });
    }

    // Create tenant
    const tenant = await Tenant.create({
      tenant_id: uuidv4(),
      name: name.trim(),
      display_name: display_name || name.trim(),
      slug: slug.toLowerCase().trim(),
      address: address || '',
      phone: phone || '',
      email: email || '',
      website: website || '',
      primary_color: primary_color || '#1a56db',
      secondary_color: secondary_color || '#0d1f4c',
      accent_color: accent_color || '#0284c7',
      banner_style: banner_style || 'gradient',
      dashboard_theme: dashboard_theme || 'navy',
      logo: logo || null,
      favicon: favicon || null,
      tagline: tagline || 'Professional Dental Care',
      currency: currency || 'USD',
      currency_symbol: currency_symbol || '$',
      subscription_plan: subscription_plan || 'Professional',
      notes: notes || '',
      status: 'Active'
    });

    // Create default feature configuration (all enabled)
    const featureDocs = ALL_MODULE_KEYS.map(key => ({
      tenant_id: tenant._id,
      module_key: key,
      enabled: DEFAULT_ENABLED_MODULES.includes(key),
      updated_by: req.user._id
    }));
    await TenantFeature.insertMany(featureDocs);

    // Create corresponding Setting document
    await Setting.create({
      tenant_id: tenant._id,
      clinic_name: name.trim(),
      tagline: tagline || 'Professional Dental Care',
      primary_color: primary_color || '#1a56db',
      secondary_color: secondary_color || '#0d1f4c',
      accent_color: accent_color || '#0284c7',
      banner_style: banner_style || 'gradient',
      dashboard_theme: dashboard_theme || 'navy',
      phone: phone || '',
      email: email || '',
      address: address || '',
      website: website || '',
      currency: currency || 'USD',
      currency_symbol: currency_symbol || '$'
    });

    // Optionally create admin user for tenant
    let adminUser = null;
    if (admin_username && admin_password) {
      if (admin_password.length < 6) {
        return res.status(400).json({ success: false, message: 'Admin password must be at least 6 characters.' });
      }
      const existingUser = await User.findOne({ username: admin_username.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'Username already taken.' });
      }
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(admin_password, salt);
      adminUser = await User.create({
        tenant_id: tenant._id,
        username: admin_username.toLowerCase().trim(),
        password_hash,
        full_name: admin_full_name || admin_username,
        email: admin_email || '',
        role: 'Admin',
        status: 'Active'
      });

      // Link as owner
      tenant.owner_id = adminUser._id;
      tenant.owner_name = adminUser.full_name;
      await tenant.save();
    }

    await logAudit({
      user: req.user,
      tenant_id: null, // platform-level action
      action: 'CREATE_TENANT',
      entity: 'Tenant',
      entity_id: tenant._id,
      details: { name: tenant.name, slug: tenant.slug, adminUser: adminUser?.username },
      ip_address: req.ip
    });

    res.status(201).json({
      success: true,
      message: `Clinic "${tenant.name}" created successfully.`,
      data: { tenant, adminUser: adminUser ? { _id: adminUser._id, username: adminUser.username } : null }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/super-admin/tenants/:id
 */
export const updateTenant = async (req, res, next) => {
  try {
    const { status, ...updateData } = req.body;

    // Prevent changing slug if it conflicts
    if (updateData.slug) {
      const conflict = await Tenant.findOne({ slug: updateData.slug.toLowerCase(), _id: { $ne: req.params.id } });
      if (conflict) return res.status(409).json({ success: false, message: 'Slug already taken.' });
      updateData.slug = updateData.slug.toLowerCase().trim();
    }

    if (status) updateData.status = status;

    const tenant = await Tenant.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    // Sync Setting clinic_name and branding if changed
    await Setting.findOneAndUpdate(
      { tenant_id: tenant._id },
      {
        ...(updateData.logo !== undefined && { logo: updateData.logo }),
        ...(updateData.primary_color !== undefined && { primary_color: updateData.primary_color }),
        ...(updateData.secondary_color !== undefined && { secondary_color: updateData.secondary_color }),
        ...(updateData.accent_color !== undefined && { accent_color: updateData.accent_color }),
        ...(updateData.banner_style !== undefined && { banner_style: updateData.banner_style }),
        ...(updateData.dashboard_theme !== undefined && { dashboard_theme: updateData.dashboard_theme }),
        ...(updateData.banner_text_color !== undefined && { banner_text_color: updateData.banner_text_color }),
        ...(updateData.button_text_color !== undefined && { button_text_color: updateData.button_text_color }),
        ...(updateData.sidebar_bg !== undefined && { sidebar_bg: updateData.sidebar_bg }),
        ...(updateData.name && { clinic_name: updateData.name }),
        ...(updateData.tagline !== undefined && { tagline: updateData.tagline }),
        ...(updateData.phone !== undefined && { phone: updateData.phone }),
        ...(updateData.email !== undefined && { email: updateData.email }),
        ...(updateData.address !== undefined && { address: updateData.address }),
        ...(updateData.website !== undefined && { website: updateData.website }),
        ...(updateData.currency && { currency: updateData.currency }),
        ...(updateData.currency_symbol && { currency_symbol: updateData.currency_symbol }),
      }
    );

    await logAudit({
      user: req.user,
      tenant_id: null,
      action: status ? `TENANT_STATUS_CHANGE` : 'UPDATE_TENANT',
      entity: 'Tenant',
      entity_id: tenant._id,
      details: { name: tenant.name, changes: updateData },
      ip_address: req.ip
    });

    res.json({ success: true, message: 'Clinic updated successfully.', data: tenant });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/super-admin/tenants/:id/status
 */
export const changeTenantStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Suspended', 'Inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const tenant = await Tenant.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    await logAudit({
      user: req.user,
      tenant_id: null,
      action: 'TENANT_STATUS_CHANGE',
      entity: 'Tenant',
      entity_id: tenant._id,
      details: { name: tenant.name, newStatus: status },
      ip_address: req.ip
    });

    res.json({ success: true, message: `Clinic status changed to ${status}.`, data: tenant });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/super-admin/features/:tenantId
 */
export const getTenantFeatures = async (req, res, next) => {
  try {
    const features = await TenantFeature.find({ tenant_id: req.params.tenantId });
    res.json({ success: true, data: features });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/super-admin/features/:tenantId
 * Body: { features: { patients: true, lab: false, ... } }
 */
export const updateTenantFeatures = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { features } = req.body;

    if (!features || typeof features !== 'object') {
      return res.status(400).json({ success: false, message: 'Features object required.' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    const updates = [];
    for (const [moduleKey, enabled] of Object.entries(features)) {
      if (!ALL_MODULE_KEYS.includes(moduleKey)) continue;
      updates.push(
        TenantFeature.findOneAndUpdate(
          { tenant_id: tenantId, module_key: moduleKey },
          { enabled: Boolean(enabled), updated_by: req.user._id },
          { upsert: true, new: true }
        )
      );
    }
    await Promise.all(updates);

    await logAudit({
      user: req.user,
      tenant_id: null,
      action: 'UPDATE_TENANT_FEATURES',
      entity: 'TenantFeature',
      entity_id: tenantId,
      details: { tenant: tenant.name, features },
      ip_address: req.ip
    });

    res.json({ success: true, message: 'Feature configuration updated.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/super-admin/stats
 * Platform-wide statistics
 */
export const getPlatformStats = async (req, res, next) => {
  try {
    const [totalTenants, activeTenants, totalUsers, totalPatients, recentAuditLogs] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: 'Active' }),
      User.countDocuments({ is_super_admin: false }),
      Patient.countDocuments(),
      AuditLog.find({ tenant_id: null }).sort({ date_time: -1 }).limit(20)
    ]);

    const tenantBreakdown = await Tenant.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        suspendedTenants: tenantBreakdown.find(t => t._id === 'Suspended')?.count || 0,
        inactiveTenants: tenantBreakdown.find(t => t._id === 'Inactive')?.count || 0,
        totalUsers,
        totalPatients,
        recentAuditLogs
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/super-admin/audit-logs
 * Platform-level audit logs
 */
export const getPlatformAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const total = await AuditLog.countDocuments({ tenant_id: null });
    const logs = await AuditLog.find({ tenant_id: null })
      .sort({ date_time: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ success: true, total, data: logs });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/super-admin/tenants/:id
 * Permanently delete a tenant clinic and cascade delete its associated records
 */
export const deleteTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Clinic not found.' });
    }

    // Safety guard: Protect primary system clinic (Snab Dental) from accidental deletion
    if (tenant.slug === 'snab-dental') {
      return res.status(400).json({
        success: false,
        message: 'The primary system clinic (Snab Dental) cannot be deleted as it contains core migrated historical data.'
      });
    }

    const tenantId = tenant._id;
    const clinicName = tenant.name;

    // Delete all tenant-associated records
    await Promise.all([
      TenantFeature.deleteMany({ tenant_id: tenantId }),
      Setting.deleteMany({ tenant_id: tenantId }),
      User.deleteMany({ tenant_id: tenantId }),
      Patient.deleteMany({ tenant_id: tenantId }),
      Visit.deleteMany({ tenant_id: tenantId }),
      Appointment.deleteMany({ tenant_id: tenantId }),
      Consultation.deleteMany({ tenant_id: tenantId }),
      Treatment.deleteMany({ tenant_id: tenantId }),
      Invoice.deleteMany({ tenant_id: tenantId }),
      Payment.deleteMany({ tenant_id: tenantId }),
      Expense.deleteMany({ tenant_id: tenantId }),
      Employee.deleteMany({ tenant_id: tenantId }),
      Followup.deleteMany({ tenant_id: tenantId }),
      DentalService.deleteMany({ tenant_id: tenantId }),
      DentalInventory.deleteMany({ tenant_id: tenantId }),
      DentalCategory.deleteMany({ tenant_id: tenantId }),
      Medicine.deleteMany({ tenant_id: tenantId }),
      Prescription.deleteMany({ tenant_id: tenantId }),
      LabRequest.deleteMany({ tenant_id: tenantId }),
      LabResult.deleteMany({ tenant_id: tenantId }),
      LabTest.deleteMany({ tenant_id: tenantId }),
      AuditLog.deleteMany({ tenant_id: tenantId })
    ]);

    // Finally delete the tenant itself
    await Tenant.findByIdAndDelete(tenantId);

    await logAudit({
      user: req.user,
      tenant_id: null,
      action: 'DELETE_TENANT',
      entity: 'Tenant',
      entity_id: tenantId,
      details: { name: clinicName, slug: tenant.slug },
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: `Clinic "${clinicName}" and all its records have been permanently deleted.`
    });
  } catch (error) {
    next(error);
  }
};

