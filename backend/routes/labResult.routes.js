import { featureGuard } from '../middleware/featureGuard.js';
import express from 'express';
import {
  getLabResults,
  createLabResult,
  reviewLabResult
} from '../controllers/labResult.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, featureGuard('lab'));

router.route('/')
  .get(getLabResults)
  .post(createLabResult);

router.patch('/:id/review', reviewLabResult);

export default router;
