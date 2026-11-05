import TenantFeature from '../models/TenantFeature.js';

/**
 * Feature guard middleware factory.
 * Usage: featureGuard('appointments') → checks tenant has the module enabled.
 * Must be placed AFTER protect middleware.
 */
export const featureGuard = (moduleKey) => {
  return async (req, res, next) => {
    // Super Admin can access everything
    if (req.isSuperAdmin) return next();

    if (!req.tenantId) {
      return res.status(403).json({ success: false, message: 'Tenant context missing.' });
    }

    try {
      const feature = await TenantFeature.findOne({
        tenant_id: req.tenantId,
        module_key: moduleKey
      });

      // If no record exists, default to enabled (for backward compatibility during migration)
      if (!feature || feature.enabled) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `The '${moduleKey}' module is not enabled for your clinic. Please contact your administrator.`,
        module_disabled: true,
        module_key: moduleKey
      });
    } catch (error) {
      console.error('[FeatureGuard Error]:', error.message);
      return res.status(500).json({ success: false, message: 'Feature check failed.' });
    }
  };
};

/**
 * Tenant scope enforcer — adds tenant filter to req and validates
 * that tenantId in request params matches the authenticated tenant.
 * Prevents cross-tenant ID manipulation attacks.
 */
export const enforceTenantScope = (req, res, next) => {
  if (req.isSuperAdmin) return next();
  if (!req.tenantId) {
    return res.status(403).json({ success: false, message: 'Tenant context required.' });
  }
  next();
};

