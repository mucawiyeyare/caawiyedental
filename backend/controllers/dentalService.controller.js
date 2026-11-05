import DentalService from '../models/DentalService.js';
import { generateServiceCode } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';

export const getDentalServices = async (req, res, next) => {
  try {
    const { category, status, search } = req.query;
    let filter = { tenant_id: req.tenantId };

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search && search.trim()) {
      filter.$or = [
        { service_name: { $regex: search.trim(), $options: 'i' } },
        { service_code: { $regex: search.trim(), $options: 'i' } },
        { category: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const services = await DentalService.find(filter).sort({ category: 1, service_name: 1 });
    res.json({ success: true, count: services.length, data: services });
  } catch (error) {
    next(error);
  }
};

export const createDentalService = async (req, res, next) => {
  try {
    const service_code = req.body.service_code || await generateServiceCode(req.tenantId);

    const service = await DentalService.create({
      tenant_id: req.tenantId,
      ...req.body,
      service_code
    });

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'CREATE_DENTAL_SERVICE',
      entity: 'DentalService',
      entity_id: service._id,
      details: { service_name: service.service_name, price: service.price }
    });

    res.status(201).json({ success: true, data: service });
  } catch (error) {
    next(error);
  }
};

export const updateDentalService = async (req, res, next) => {
  try {
    const service = await DentalService.findOneAndUpdate(
      { _id: req.params.id, tenant_id: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({ success: false, message: 'Dental service not found' });
    }

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'UPDATE_DENTAL_SERVICE',
      entity: 'DentalService',
      entity_id: service._id,
      details: { service_name: service.service_name, price: service.price, status: service.status }
    });

    res.json({ success: true, data: service });
  } catch (error) {
    next(error);
  }
};

export const deleteDentalService = async (req, res, next) => {
  try {
    const service = await DentalService.findOneAndDelete({ _id: req.params.id, tenant_id: req.tenantId });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Dental service not found' });
    }

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'DELETE_DENTAL_SERVICE',
      entity: 'DentalService',
      entity_id: req.params.id,
      details: { service_name: service.service_name }
    });

    res.json({ success: true, message: 'Dental service removed successfully' });
  } catch (error) {
    next(error);
  }
};
