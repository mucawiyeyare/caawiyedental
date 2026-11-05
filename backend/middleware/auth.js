import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';

/**
 * Authentication middleware — verifies JWT, loads user + tenant context.
 * req.user      → the authenticated user document
 * req.tenantId  → the tenant ObjectId (null for Super Admin)
 * req.tenant    → the full Tenant document (null for Super Admin)
 */
export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dental_hub_secure_jwt_secret_key_2026_super_safe');
    const user = await User.findById(decoded.id).populate('employee_id').populate('tenant_id');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User belonging to token no longer exists' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact Administrator.' });
    }

    // Super Admin can operate across tenants
    req.user = user;
    req.isSuperAdmin = user.is_super_admin || user.role === 'Super Admin';

    if (!req.isSuperAdmin) {
      if (!user.tenant_id) {
        return res.status(403).json({ success: false, message: 'User is not associated with any clinic.' });
      }

      const tenant = user.tenant_id; // already populated
      if (!tenant || tenant.status !== 'Active') {
        return res.status(403).json({ success: false, message: 'Your clinic account is not active. Please contact SODMAS support.' });
      }

      req.tenantId = tenant._id;
      req.tenant = tenant;
    } else {
      req.tenantId = null;
      req.tenant = null;
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

/**
 * Role-based authorization — must be used AFTER protect middleware.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    // Super Admins have platform-level access across all routes
    if (req.isSuperAdmin) {
      return next();
    }

    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized to access this resource`
      });
    }
    next();
  };
};

/**
 * Super Admin only guard.
 */
export const superAdminOnly = (req, res, next) => {
  if (!req.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Platform Super Admin privileges required.'
    });
  }
  next();
};
