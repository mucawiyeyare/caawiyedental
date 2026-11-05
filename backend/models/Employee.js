import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  employee_id: {
    type: String
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    default: 'Dental Clinic'
  },
  specialization: {
    type: String,
    default: ''
  },
  hire_date: {
    type: Date,
    default: Date.now
  },
  salary: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'On Leave', 'Inactive', 'Terminated'],
    default: 'Active'
  }
}, { timestamps: true });

employeeSchema.index({ tenant_id: 1, employee_id: 1 }, { unique: true });
employeeSchema.index({ tenant_id: 1, status: 1 });

export default mongoose.model('Employee', employeeSchema);
