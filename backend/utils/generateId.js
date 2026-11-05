import Patient from '../models/Patient.js';
import Visit from '../models/Visit.js';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import LabRequest from '../models/LabRequest.js';
import Prescription from '../models/Prescription.js';
import Medicine from '../models/Medicine.js';
import Expense from '../models/Expense.js';
import Employee from '../models/Employee.js';
import DentalService from '../models/DentalService.js';
import DentalInventory from '../models/DentalInventory.js';
import LabTest from '../models/LabTest.js';

/**
 * Tenant-aware unique code generator.
 * Numbers are sequential WITHIN a tenant.
 */
async function generateUniqueCode(model, field, prefix, padLength = 4, yearPrefix = false, tenantId = null) {
  const year = new Date().getFullYear();
  const basePrefix = yearPrefix ? `${prefix}-${year}-` : `${prefix}-`;
  const escapedBase = basePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escapedBase}(\\d+)`);

  // Scope to tenant if provided
  const queryFilter = { [field]: regex };
  if (tenantId) queryFilter.tenant_id = tenantId;

  const existingDocs = await model.find(queryFilter).select(field).lean();
  let maxNum = 0;
  for (const doc of existingDocs) {
    const val = doc[field];
    if (typeof val === 'string') {
      const match = val.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `${basePrefix}${nextNum.toString().padStart(padLength, '0')}`;

  const existsQuery = { [field]: candidate };
  if (tenantId) existsQuery.tenant_id = tenantId;

  while (await model.exists(existsQuery)) {
    nextNum++;
    candidate = `${basePrefix}${nextNum.toString().padStart(padLength, '0')}`;
  }

  return candidate;
}

export const generatePatientNumber = (tenantId) => generateUniqueCode(Patient, 'patient_number', 'PAT', 4, false, tenantId);
export const generateVisitNumber = (tenantId) => generateUniqueCode(Visit, 'visit_number', 'VIS', 4, true, tenantId);
export const generateReceiptNumber = (tenantId) => generateUniqueCode(Payment, 'receipt_number', 'REC', 5, true, tenantId);
export const generateInvoiceNumber = (tenantId) => generateUniqueCode(Invoice, 'invoice_number', 'INV', 5, true, tenantId);
export const generateLabRequestNumber = (tenantId) => generateUniqueCode(LabRequest, 'request_number', 'LAB', 4, true, tenantId);
export const generatePrescriptionNumber = (tenantId) => generateUniqueCode(Prescription, 'prescription_number', 'RX', 4, true, tenantId);
export const generateMedicineCode = (tenantId) => generateUniqueCode(Medicine, 'medicine_code', 'MED', 3, false, tenantId);
export const generateExpenseCode = (tenantId) => generateUniqueCode(Expense, 'expense_code', 'EXP', 5, true, tenantId);
export const generateEmployeeCode = (tenantId) => generateUniqueCode(Employee, 'employee_id', 'EMP', 3, false, tenantId);
export const generateServiceCode = (tenantId) => generateUniqueCode(DentalService, 'service_code', 'SRV', 3, false, tenantId);
export const generateInventoryCode = (tenantId) => generateUniqueCode(DentalInventory, 'item_code', 'INV-MAT', 3, false, tenantId);
export const generateLabTestCode = (tenantId) => generateUniqueCode(LabTest, 'test_code', 'LAB', 3, false, tenantId);
