import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointment_date: {
    type: Date,
    required: true
  },
  appointment_time: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Confirmed', 'Checked In', 'Completed', 'Cancelled', 'No Show'],
    default: 'Scheduled'
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

appointmentSchema.index({ tenant_id: 1, appointment_date: -1 });

export default mongoose.model('Appointment', appointmentSchema);
