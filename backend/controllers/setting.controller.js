import Setting from '../models/Setting.js';
import Tenant from '../models/Tenant.js';
import { logAudit } from '../middleware/audit.js';

export const getSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne({ tenant_id: req.tenantId });
    const tenantData = req.tenant || await Tenant.findById(req.tenantId) || {};

    if (!settings) {
      // Create default settings for this tenant from tenant branding if available
      settings = await Setting.create({
        tenant_id: req.tenantId,
        logo: tenantData.logo || null,
        primary_color: tenantData.primary_color || '#1a56db',
        secondary_color: tenantData.secondary_color || '#0d1f4c',
        accent_color: tenantData.accent_color || '#0284c7',
        banner_style: tenantData.banner_style || 'gradient',
        dashboard_theme: tenantData.dashboard_theme || 'navy',
        banner_text_color: tenantData.banner_text_color || '#ffffff',
        button_text_color: tenantData.button_text_color || '#ffffff',
        sidebar_bg: tenantData.sidebar_bg || '#0d1f4c',
        header_bg: tenantData.header_bg || '#ffffff',
        clinic_name: tenantData.name || 'Dental Clinic',
        tagline: tenantData.tagline || 'Professional Dental Care',
        phone: tenantData.phone || '',
        email: tenantData.email || '',
        address: tenantData.address || '',
        website: tenantData.website || '',
        consultation_fee: tenantData.consultation_fee || 20,
        currency: tenantData.currency || 'USD',
        currency_symbol: tenantData.currency_symbol || '$',
        tooth_numbering_system: 'FDI (Two-digit notation)'
      });
    } else if (settings.logo === undefined || settings.logo === null) {
      // Ensure sync with tenant if tenant has logo
      if (tenantData.logo) {
        settings.logo = tenantData.logo;
        await settings.save();
      }
    }

    res.json({ success: true, data: settings, tenant: tenantData });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    let settings = await Setting.findOne({ tenant_id: req.tenantId });
    if (!settings) {
      settings = await Setting.create({ ...req.body, tenant_id: req.tenantId });
    } else {
      settings = await Setting.findByIdAndUpdate(settings._id, req.body, {
        new: true,
        runValidators: true
      });
    }

    // Sync branding and metadata to Tenant record
    const tenantUpdates = {};
    if (req.body.logo !== undefined) tenantUpdates.logo = req.body.logo;
    if (req.body.clinic_name) tenantUpdates.name = req.body.clinic_name;
    if (req.body.primary_color !== undefined) tenantUpdates.primary_color = req.body.primary_color;
    if (req.body.secondary_color !== undefined) tenantUpdates.secondary_color = req.body.secondary_color;
    if (req.body.accent_color !== undefined) tenantUpdates.accent_color = req.body.accent_color;
    if (req.body.banner_style !== undefined) tenantUpdates.banner_style = req.body.banner_style;
    if (req.body.dashboard_theme !== undefined) tenantUpdates.dashboard_theme = req.body.dashboard_theme;
    if (req.body.banner_text_color !== undefined) tenantUpdates.banner_text_color = req.body.banner_text_color;
    if (req.body.button_text_color !== undefined) tenantUpdates.button_text_color = req.body.button_text_color;
    if (req.body.sidebar_bg !== undefined) tenantUpdates.sidebar_bg = req.body.sidebar_bg;
    if (req.body.header_bg !== undefined) tenantUpdates.header_bg = req.body.header_bg;
    if (req.body.tagline !== undefined) tenantUpdates.tagline = req.body.tagline;
    if (req.body.phone !== undefined) tenantUpdates.phone = req.body.phone;
    if (req.body.email !== undefined) tenantUpdates.email = req.body.email;
    if (req.body.address !== undefined) tenantUpdates.address = req.body.address;
    if (req.body.website !== undefined) tenantUpdates.website = req.body.website;
    if (req.body.currency !== undefined) tenantUpdates.currency = req.body.currency;
    if (req.body.currency_symbol !== undefined) tenantUpdates.currency_symbol = req.body.currency_symbol;
    if (req.body.consultation_fee !== undefined) tenantUpdates.consultation_fee = req.body.consultation_fee;

    let updatedTenant = null;
    if (Object.keys(tenantUpdates).length > 0) {
      updatedTenant = await Tenant.findByIdAndUpdate(req.tenantId, tenantUpdates, { new: true });
    }

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'UPDATE_SETTINGS',
      entity: 'Setting',
      entity_id: settings._id,
      details: { clinic_name: settings.clinic_name, consultation_fee: settings.consultation_fee, has_custom_logo: Boolean(settings.logo) }
    });

    res.json({ success: true, data: settings, tenant: updatedTenant });
  } catch (error) {
    next(error);
  }
};
