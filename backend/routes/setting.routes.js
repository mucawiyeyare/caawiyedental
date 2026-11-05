import { featureGuard } from '../middleware/featureGuard.js';
import express from 'express';
import { getSettings, updateSettings } from '../controllers/setting.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, featureGuard('settings'));

router.get('/', getSettings);
router.put('/', authorize('Admin'), updateSettings);

export default router;
