import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Tenant from '../models/Tenant.js';
import { generateEmployeeCode } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';

export const getUsers = async (req, res, next) => {
  try {
    const filter = req.isSuperAdmin ? {} : { tenant_id: req.tenantId };
    const users = await User.find(filter)
      .select('-password_hash')
      .populate('employee_id')
      .populate('tenant_id', 'name slug')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

export const getDoctors = async (req, res, next) => {
  try {
    const filter = { role: 'Doctor', status: 'Active' };
    if (!req.isSuperAdmin) {
      filter.tenant_id = req.tenantId;
    }
    const doctors = await User.find(filter)
      .select('-password_hash')
      .populate('employee_id');

    // Auto-sync: If any Employee with doctor position lacks a User account, auto-create one
    const existingEmpIds = doctors.map(d => d.employee_id?._id?.toString()).filter(Boolean);
    const empFilter = {
      position: { $in: ['Dental Surgeon', 'Senior Dental Surgeon', 'Consultant Orthodontist', 'Doctor'] },
      status: 'Active',
      _id: { $nin: existingEmpIds }
    };
    if (!req.isSuperAdmin && req.tenantId) {
      empFilter.tenant_id = req.tenantId;
    }

    const orphanEmployees = await Employee.find(empFilter);
    if (orphanEmployees.length > 0) {
      const salt = await bcrypt.genSalt(10);
      const defaultHash = await bcrypt.hash('doctor123', salt);

      for (const emp of orphanEmployees) {
        let baseU = `dr.${emp.name.toLowerCase().replace(/^(dr\.?\s*)/i, '').replace(/[^a-z0-9]/g, '')}`;
        if (!baseU || baseU === 'dr.') baseU = `dr.surgeon${Math.floor(100 + Math.random() * 900)}`;
        let uName = baseU;
        let c = 1;
        while (await User.findOne({ username: uName })) {
          uName = `${baseU}${c++}`;
        }
        const newUser = await User.create({
          tenant_id: emp.tenant_id,
          username: uName,
          password_hash: defaultHash,
          role: 'Doctor',
          employee_id: emp._id,
          full_name: emp.name,
          email: emp.email || '',
          status: 'Active'
        });
        const populated = await User.findById(newUser._id).select('-password_hash').populate('employee_id');
        doctors.push(populated);
      }
    }

    res.json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    next(error);
  }
};

export const createDoctor = async (req, res, next) => {
  try {
    const {
      name,
      username,
      password,
      email,
      phone,
      specialization,
      department,
      salary,
      status
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Doctor full name is required' });
    }

    let targetTenantId = req.isSuperAdmin && req.body.tenant_id ? req.body.tenant_id : req.tenantId;
    if (!targetTenantId) {
      const activeTenant = await Tenant.findOne({ status: 'Active' }).sort({ createdAt: 1 });
      if (activeTenant) {
        targetTenantId = activeTenant._id;
      }
    }

    // 1. Generate or clean full name
    let cleanName = name.trim();
    if (!cleanName.toLowerCase().startsWith('dr.')) {
      cleanName = `Dr. ${cleanName}`;
    }

    // 2. Generate or validate username
    let finalUsername = username ? username.toLowerCase().trim() : '';
    if (!finalUsername) {
      const baseName = cleanName.toLowerCase().replace(/^(dr\.?\s*)/i, '').replace(/[^a-z0-9]/g, '');
      finalUsername = `dr.${baseName || 'doctor'}`;
      let c = 1;
      while (await User.findOne({ username: finalUsername })) {
        finalUsername = `dr.${baseName || 'doctor'}${c++}`;
      }
    } else {
      const existingUser = await User.findOne({ username: finalUsername });
      if (existingUser) {
        return res.status(400).json({ success: false, message: `Username '${finalUsername}' is already taken.` });
      }
    }

    // 3. Generate employee code and create Employee with collision protection
    let autoCode = await generateEmployeeCode(targetTenantId);
    let employee = null;
    let attempts = 0;
    while (!employee && attempts < 5) {
      try {
        employee = await Employee.create({
          tenant_id: targetTenantId,
          employee_id: autoCode,
          name: cleanName,
          phone: phone || '',
          email: email || '',
          position: 'Dental Surgeon',
          department: department || 'Dental Surgery',
          specialization: specialization || 'General Dental Surgery',
          salary: Number(salary) || 2500,
          status: status || 'Active'
        });
      } catch (err) {
        if (err.code === 11000 && err.message?.includes('employee_id')) {
          attempts++;
          autoCode = `EMP-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
        } else {
          throw err;
        }
      }
    }

    // 4. Create User account with role 'Doctor'
    const finalPassword = password || 'doctor123';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(finalPassword, salt);

    const user = await User.create({
      tenant_id: targetTenantId,
      username: finalUsername,
      password_hash,
      role: 'Doctor',
      employee_id: employee._id,
      full_name: cleanName,
      email: email || '',
      status: status || 'Active'
    });

    await logAudit({
      user: req.user,
      tenant_id: targetTenantId,
      action: 'CREATE_DOCTOR',
      entity: 'User',
      entity_id: user._id,
      details: { doctor_name: employee.name, username: user.username, specialization: employee.specialization }
    });

    const populatedDoctor = await User.findById(user._id)
      .select('-password_hash')
      .populate('employee_id');

    res.status(201).json({
      success: true,
      message: 'Doctor and user account registered successfully',
      data: populatedDoctor,
      credentials: {
        username: finalUsername,
        password: finalPassword
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { username, password, role, employee_id, full_name, email, status, tenant_id } = req.body;

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password || 'password123', salt);

    const targetTenantId = req.isSuperAdmin && tenant_id ? tenant_id : req.tenantId;

    const user = await User.create({
      tenant_id: targetTenantId,
      username: username.toLowerCase().trim(),
      password_hash,
      role: role || 'Receptionist/Cashier',
      employee_id: employee_id || undefined,
      full_name,
      email,
      status: status || 'Active'
    });

    await logAudit({
      user: req.user,
      tenant_id: targetTenantId,
      action: 'CREATE_USER',
      entity: 'User',
      entity_id: user._id,
      details: { username: user.username, role: user.role }
    });

    const userResponse = await User.findById(user._id).select('-password_hash').populate('employee_id');
    res.status(201).json({ success: true, data: userResponse });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { username, role, employee_id, full_name, email, status, password, profile_image } = req.body;
    
    const query = req.isSuperAdmin ? { _id: req.params.id } : { _id: req.params.id, tenant_id: req.tenantId };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (username && username.trim().toLowerCase() !== user.username) {
      const cleanUsername = username.trim().toLowerCase();
      const existing = await User.findOne({ username: cleanUsername });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(400).json({ success: false, message: 'Username is already taken by another account.' });
      }
      user.username = cleanUsername;
    }

    if (role) user.role = role;
    if (employee_id !== undefined) user.employee_id = employee_id || undefined;
    if (full_name !== undefined) user.full_name = full_name;
    if (email !== undefined) user.email = email;
    if (profile_image !== undefined) user.profile_image = profile_image;
    if (status) user.status = status;
    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(password.trim(), salt);
    }

    await user.save();

    await logAudit({
      user: req.user,
      tenant_id: user.tenant_id,
      action: 'UPDATE_USER',
      entity: 'User',
      entity_id: user._id,
      details: { username: user.username, role: user.role, status: user.status }
    });

    const updatedUser = await User.findById(user._id).select('-password_hash').populate('employee_id');
    res.json({ success: true, message: 'User updated successfully', data: updatedUser });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const query = req.isSuperAdmin ? { _id: req.params.id } : { _id: req.params.id, tenant_id: req.tenantId };
    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Safety check: Admin cannot delete their own account
    if (req.user?._id && user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Security protection: You cannot delete your own logged-in admin account.'
      });
    }

    const deletedUsername = user.username;
    const deletedRole = user.role;
    const userTenantId = user.tenant_id;

    await User.findByIdAndDelete(req.params.id);

    await logAudit({
      user: req.user,
      tenant_id: userTenantId,
      action: 'DELETE_USER',
      entity: 'User',
      entity_id: req.params.id,
      details: { username: deletedUsername, role: deletedRole }
    });

    res.json({ success: true, message: `User @${deletedUsername} deleted successfully` });
  } catch (error) {
    next(error);
  }
};
