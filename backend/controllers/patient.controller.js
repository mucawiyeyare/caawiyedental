import Patient from '../models/Patient.js';
import Visit from '../models/Visit.js';
import Consultation from '../models/Consultation.js';
import LabResult from '../models/LabResult.js';
import Treatment from '../models/Treatment.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Followup from '../models/Followup.js';
import Appointment from '../models/Appointment.js';
import LabRequest from '../models/LabRequest.js';
import Prescription from '../models/Prescription.js';
import User from '../models/User.js';
import { generatePatientNumber } from '../utils/generateId.js';
import { logAudit } from '../middleware/audit.js';
import { getDoctorAssignedPatientIds, isPatientAssignedToDoctor } from '../utils/doctorScope.js';

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export const getPatients = async (req, res, next) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    // Always scope by tenant
    let query = { tenant_id: req.tenantId };

    // Strict Doctor Scoping
    if (req.user?.role === 'Doctor') {
      const assignedIds = await getDoctorAssignedPatientIds(req.user._id);
      query._id = { $in: assignedIds };
    }

    if (search && search.trim()) {
      const cleanSearch = escapeRegex(search.trim());
      const searchRegex = { $regex: cleanSearch, $options: 'i' };
      const searchConditions = [
        { name: searchRegex },
        { telephone: searchRegex },
        { patient_number: searchRegex }
      ];

      if (query._id) {
        query = { ...query, $or: searchConditions };
      } else {
        query.$or = searchConditions;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .populate('assigned_doctor_id', 'full_name username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: patients.length,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: patients
    });
  } catch (error) {
    next(error);
  }
};

export const getPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, tenant_id: req.tenantId })
      .populate('assigned_doctor_id', 'full_name username email');

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (req.user?.role === 'Doctor') {
      const isAssigned = await isPatientAssignedToDoctor(req.user._id, patient._id);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view patients assigned to you.'
        });
      }
    }

    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

export const checkTelephoneAvailability = async (req, res, next) => {
  try {
    const { phone } = req.query;
    if (!phone || !phone.trim()) {
      return res.json({ available: true, exists: false });
    }
    const cleanPhone = phone.trim();
    const existing = await Patient.findOne({ telephone: cleanPhone, tenant_id: req.tenantId })
      .populate('assigned_doctor_id', 'full_name username email');
    if (existing) {
      return res.json({
        available: true,
        exists: true,
        message: `Telephone number is already registered to ${existing.name} (${existing.patient_number}).`,
        existingPatient: {
          _id: existing._id,
          name: existing.name,
          patient_number: existing.patient_number,
          telephone: existing.telephone,
          age: existing.age,
          gender: existing.gender,
          address: existing.address,
          assigned_doctor_id: existing.assigned_doctor_id?._id || existing.assigned_doctor_id,
          assigned_doctor_name: existing.assigned_doctor_name || existing.assigned_doctor_id?.full_name || '',
          emergency_contact: existing.emergency_contact,
          medical_info: existing.medical_info
        }
      });
    }
    return res.json({ available: true, exists: false, message: 'Telephone number is available.' });
  } catch (error) {
    next(error);
  }
};

export const createPatient = async (req, res, next) => {
  try {
    const {
      name, telephone, age, gender, address,
      emergency_contact, medical_info, doctor_id, assigned_doctor_id
    } = req.body;

    if (!telephone || !telephone.trim()) {
      return res.status(400).json({ success: false, message: 'Telephone number is required.' });
    }

    const cleanPhone = telephone.trim();
    const patient_number = await generatePatientNumber(req.tenantId);

    let targetDoctorId = assigned_doctor_id || doctor_id || (req.user.role === 'Doctor' ? req.user._id : undefined);
    let targetDoctorName = '';

    if (targetDoctorId) {
      const docUser = await User.findById(targetDoctorId);
      if (docUser) {
        targetDoctorName = docUser.full_name || docUser.username;
      }
    }

    const patient = await Patient.create({
      tenant_id: req.tenantId,
      patient_number,
      name: name?.trim() || '',
      telephone: cleanPhone,
      age: Number(age),
      gender: gender || 'Male',
      address: address ? address.trim() : '',
      emergency_contact: emergency_contact || {},
      medical_info: medical_info || {},
      assigned_doctor_id: targetDoctorId,
      assigned_doctor_name: targetDoctorName,
      primary_doctor_id: targetDoctorId
    });

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'REGISTER_PATIENT',
      entity: 'Patient',
      entity_id: patient._id,
      details: { patient_number: patient.patient_number, name: patient.name, telephone: patient.telephone }
    });

    const populated = await Patient.findById(patient._id).populate('assigned_doctor_id', 'full_name username email');

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

export const updatePatient = async (req, res, next) => {
  try {
    if (req.user?.role === 'Doctor') {
      const isAssigned = await isPatientAssignedToDoctor(req.user._id, req.params.id);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update patients assigned to you.'
        });
      }
    }

    if (req.body.assigned_doctor_id) {
      const docUser = await User.findById(req.body.assigned_doctor_id);
      if (docUser) {
        req.body.assigned_doctor_name = docUser.full_name || docUser.username;
      }
    }

    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, tenant_id: req.tenantId },
      req.body,
      { new: true, runValidators: true }
    ).populate('assigned_doctor_id', 'full_name username email');

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'UPDATE_PATIENT',
      entity: 'Patient',
      entity_id: patient._id,
      details: { patient_number: patient.patient_number, name: patient.name }
    });

    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

export const getPatientHistory = async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const patient = await Patient.findOne({ _id: patientId, tenant_id: req.tenantId })
      .populate('assigned_doctor_id', 'full_name username email');

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (req.user?.role === 'Doctor') {
      const isAssigned = await isPatientAssignedToDoctor(req.user._id, patientId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view records of patients assigned to you.'
        });
      }
    }

    const [visits, consultations, treatments, labResults, invoices, payments, followups, prescriptions] = await Promise.all([
      Visit.find({ patient_id: patientId, tenant_id: req.tenantId }).populate('doctor_id', 'full_name username').sort({ visit_date: -1 }),
      Consultation.find({ patient_id: patientId, tenant_id: req.tenantId }).populate('doctor_id', 'full_name').sort({ consultation_date: -1 }),
      Treatment.find({ patient_id: patientId, tenant_id: req.tenantId }).populate('doctor_id', 'full_name').populate('service_id').sort({ treatment_date: -1 }),
      LabResult.find({ patient_id: patientId, tenant_id: req.tenantId }).populate('doctor_id', 'full_name').sort({ result_date: -1 }),
      Invoice.find({ patient_id: patientId, tenant_id: req.tenantId })
        .populate('doctor_id', 'full_name username specialization')
        .populate({ path: 'visit_id', select: 'visit_number doctor_id' })
        .sort({ invoice_date: -1 }),
      Payment.find({ patient_id: patientId, tenant_id: req.tenantId })
        .populate('received_by', 'full_name username')
        .populate('invoice_id', 'invoice_number items')
        .sort({ payment_date: -1 }),
      Followup.find({ patient_id: patientId, tenant_id: req.tenantId }).populate('doctor_id', 'full_name').sort({ followup_date: -1 }),
      Prescription.find({ patient_id: patientId, tenant_id: req.tenantId })
        .populate('doctor_id', 'full_name username')
        .populate('visit_id', 'visit_number')
        .sort({ createdAt: -1 })
    ]);

    res.json({
      success: true,
      data: { patient, visits, consultations, treatments, labResults, invoices, payments, followups, prescriptions }
    });
  } catch (error) {
    next(error);
  }
};

export const deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, tenant_id: req.tenantId });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const patientId = patient._id;
    const patientDetails = {
      patient_number: patient.patient_number,
      name: patient.name,
      telephone: patient.telephone
    };

    await Promise.all([
      Patient.findByIdAndDelete(patientId),
      Visit.deleteMany({ patient_id: patientId, tenant_id: req.tenantId }),
      Consultation.deleteMany({ patient_id: patientId, tenant_id: req.tenantId }),
      Treatment.deleteMany({ patient_id: patientId, tenant_id: req.tenantId }),
      LabRequest.deleteMany({ patient_id: patientId, tenant_id: req.tenantId }),
      LabResult.deleteMany({ patient_id: patientId, tenant_id: req.tenantId }),
      Invoice.deleteMany({ patient_id: patientId, tenant_id: req.tenantId }),
      Payment.deleteMany({ patient_id: patientId, tenant_id: req.tenantId }),
      Appointment.deleteMany({ patient_id: patientId, tenant_id: req.tenantId }),
      Followup.deleteMany({ patient_id: patientId, tenant_id: req.tenantId })
    ]);

    await logAudit({
      user: req.user,
      tenant_id: req.tenantId,
      action: 'DELETE_PATIENT',
      entity: 'Patient',
      entity_id: patientId,
      details: patientDetails
    });

    res.json({
      success: true,
      message: `Patient ${patient.name} (${patient.patient_number}) and all associated records deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};
