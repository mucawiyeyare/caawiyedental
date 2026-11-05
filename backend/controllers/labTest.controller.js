import LabTest from '../models/LabTest.js';
import { generateLabTestCode } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';

export const getLabTests = async (req, res, next) => {
  try {
    const { category, status, search } = req.query;
    let filter = { tenant_id: req.tenantId };

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search && search.trim()) {
      filter.$or = [
        { test_name: { $regex: search.trim(), $options: 'i' } },
        { test_code: { $regex: search.trim(), $options: 'i' } },
        { category: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const tests = await LabTest.find(filter).sort({ category: 1, test_name: 1 });
    res.json({ success: true, count: tests.length, data: tests });
  } catch (error) {
    next(error);
  }
};

export const createLabTest = async (req, res, next) => {
  try {
    const test_code = req.body.test_code || await generateLabTestCode(req.tenantId);

    const test = await LabTest.create({
      tenant_id: req.tenantId,
      ...req.body,
      test_code
    });

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'CREATE_LAB_TEST',
      entity: 'LabTest',
      entity_id: test._id,
      details: { test_name: test.test_name, price: test.price }
    });

    res.status(201).json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

export const updateLabTest = async (req, res, next) => {
  try {
    const test = await LabTest.findOneAndUpdate(
      { _id: req.params.id, tenant_id: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!test) {
      return res.status(404).json({ success: false, message: 'Lab test not found' });
    }

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'UPDATE_LAB_TEST',
      entity: 'LabTest',
      entity_id: test._id,
      details: { test_name: test.test_name, price: test.price, status: test.status }
    });

    res.json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

export const deleteLabTest = async (req, res, next) => {
  try {
    const test = await LabTest.findOneAndDelete({ _id: req.params.id, tenant_id: req.tenantId });
    if (!test) {
      return res.status(404).json({ success: false, message: 'Lab test not found' });
    }

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'DELETE_LAB_TEST',
      entity: 'LabTest',
      entity_id: req.params.id,
      details: { test_name: test.test_name, price: test.price }
    });

    res.json({ success: true, message: 'Lab test removed successfully' });
  } catch (error) {
    next(error);
  }
};
