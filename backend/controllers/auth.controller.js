import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import TenantFeature from '../models/TenantFeature.js';
import { logAudit } from '../middleware/audit.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'dental_hub_secure_jwt_secret_key_2026_super_safe', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const buildUserResponse = async (user) => {
  let tenantData = null;
  let enabledModules = null;

  if (user.tenant_id) {
    const tenant = await Tenant.findById(user.tenant_id._id || user.tenant_id);
    if (tenant) {
      const features = await TenantFeature.find({ tenant_id: tenant._id, enabled: true });
      enabledModules = features.map(f => f.module_key);
      tenantData = {
        _id: tenant._id,
        name: tenant.name,
        display_name: tenant.display_name || tenant.name,
        slug: tenant.slug,
        logo: tenant.logo,
        favicon: tenant.favicon,
        primary_color: tenant.primary_color || '#1a56db',
        secondary_color: tenant.secondary_color || '#0d1f4c',
        accent_color: tenant.accent_color || '#0284c7',
        banner_style: tenant.banner_style || 'gradient',
        dashboard_theme: tenant.dashboard_theme || 'navy',
        banner_text_color: tenant.banner_text_color || '#ffffff',
        button_text_color: tenant.button_text_color || '#ffffff',
        header_bg: tenant.header_bg,
        sidebar_bg: tenant.sidebar_bg,
        currency: tenant.currency,
        currency_symbol: tenant.currency_symbol,
        tagline: tenant.tagline,
        status: tenant.status
      };
    }
  }

  return {
    id: user._id,
    _id: user._id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    email: user.email,
    profile_image: user.profile_image || '',
    employee: user.employee_id,
    is_super_admin: user.is_super_admin || false,
    tenant: tenantData,
    enabledModules: enabledModules || []
  };
};

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    const user = await User.findOne({ username: username.toLowerCase() }).populate('employee_id').populate('tenant_id');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Account has been deactivated. Please contact Administrator.' });
    }

    // Check tenant is active (unless super admin)
    if (!user.is_super_admin && user.role !== 'Super Admin') {
      const tenant = user.tenant_id;
      if (!tenant || tenant.status !== 'Active') {
        return res.status(403).json({
          success: false,
          message: 'Your clinic account is not active. Please contact Dental Hub support.'
        });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    user.last_login = new Date();
    await user.save();

    const token = generateToken(user._id);
    const userData = await buildUserResponse(user);

    await logAudit({
      user,
      tenant_id: user.tenant_id?._id || null,
      action: 'LOGIN',
      entity: 'User',
      entity_id: user._id,
      details: { username: user.username, role: user.role },
      ip_address: req.ip
    });

    res.json({ success: true, token, user: userData });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password_hash').populate('employee_id').populate('tenant_id');
    const userData = await buildUserResponse(user);
    res.json({ success: true, user: userData });
  } catch (error) {
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const { username, password, full_name, email, role } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ success: false, message: 'Please provide username, password, full name, and role.' });
    }

    const allowedRoles = ['Admin', 'Doctor', 'Receptionist/Cashier'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Username is already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      tenant_id: req.tenantId || null,
      username: username.toLowerCase().trim(),
      password_hash,
      full_name: full_name.trim(),
      email: email?.toLowerCase().trim() || '',
      role,
      status: 'Active'
    });

    await logAudit({
      user: { _id: newUser._id, username: newUser.username, role: newUser.role },
      tenant_id: req.tenantId,
      action: 'REGISTER',
      entity: 'User',
      entity_id: newUser._id,
      details: { username: newUser.username, role: newUser.role },
      ip_address: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!'
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { full_name, email, profile_image, password } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (full_name !== undefined) user.full_name = full_name.trim();
    if (email !== undefined) user.email = email.toLowerCase().trim();
    if (profile_image !== undefined) user.profile_image = profile_image;

    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(password.trim(), salt);
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password_hash').populate('employee_id').populate('tenant_id');
    const userData = await buildUserResponse(updatedUser);

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'UPDATE_PROFILE',
      entity: 'User',
      entity_id: user._id,
      details: { username: user.username },
      ip_address: req.ip
    });

    res.json({ success: true, message: 'Profile updated successfully', user: userData });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    await user.save();

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entity_id: user._id,
      details: { username: user.username }
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};
