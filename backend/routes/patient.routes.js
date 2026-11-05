import express from 'express';
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientHistory,
  checkTelephoneAvailability
} from '../controllers/patient.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { featureGuard } from '../middleware/featureGuard.js';

const router = express.Router();

router.use(protect, featureGuard('patients'));

router.get('/check-phone', checkTelephoneAvailability);

router.route('/')
  .get(getPatients)
  .post(createPatient);

router.get('/:id/history', getPatientHistory);

router.route('/:id')
  .get(getPatientById)
  .put(updatePatient)
  .delete(authorize('Admin'), deletePatient);

export default router;
