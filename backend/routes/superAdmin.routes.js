import express from 'express';
import { protect, superAdminOnly } from '../middleware/auth.js';
import {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  changeTenantStatus,
  deleteTenant,
  getTenantFeatures,
  updateTenantFeatures,
  getPlatformStats,
  getPlatformAuditLogs
} from '../controllers/superAdmin.controller.js';

const router = express.Router();

// All super-admin routes require authentication + super admin privilege
router.use(protect, superAdminOnly);

// Tenant management
router.get('/tenants', getTenants);
router.post('/tenants', createTenant);
router.get('/tenants/:id', getTenantById);
router.put('/tenants/:id', updateTenant);
router.patch('/tenants/:id/status', changeTenantStatus);
router.delete('/tenants/:id', deleteTenant);

// Feature management
router.get('/features/:tenantId', getTenantFeatures);
router.put('/features/:tenantId', updateTenantFeatures);

// Platform stats & audit
router.get('/stats', getPlatformStats);
router.get('/audit-logs', getPlatformAuditLogs);

export default router;

