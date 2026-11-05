import React from 'react';
import { Printer, Calendar, Clock, User, Stethoscope, Phone, MapPin, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const AppointmentSlipModal = ({ isOpen, onClose, appointment }) => {
  const { tenant } = useAuth();
  if (!isOpen || !appointment) return null;

  const clinicName = tenant?.display_name || tenant?.name || 'SODMAS Dental Clinic';
  const clinicAddress = tenant?.address || 'Mogadishu Main Road, Hodan District';
  const clinicPhone = tenant?.phone || '+252 61 5000000';
  const clinicLogo = tenant?.logo || '/logo.png';

  const patient = appointment.patient_id || {};
  const doctor = appointment.doctor_id || {};

  const formattedDate = appointment.appointment_date
    ? new Date(appointment.appointment_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Not Scheduled';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=650,height=900');
    if (!printWindow) {
      alert('Please allow popups to print appointment slips.');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Appointment Slip – ${patient.name || 'Patient'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    @page { size: A5 portrait; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { background: #ffffff; color: #0f172a; font-size: 12px; line-height: 1.5; padding: 24px; max-width: 480px; margin: 0 auto; }
    
    .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 14px; margin-bottom: 16px; }
    .clinic-title { font-size: 18px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.05em; }
    .clinic-sub { font-size: 10px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px; }
    .clinic-contact { font-size: 9.5px; color: #64748b; margin-top: 4px; }
    
    .badge-box { background: linear-gradient(135deg, #0284c7, #1d4ed8); color: white; border-radius: 12px; padding: 14px 16px; text-align: center; margin-bottom: 16px; }
    .badge-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; opacity: 0.9; }
    .badge-datetime { font-size: 18px; font-weight: 900; margin-top: 4px; }
    .badge-time { font-size: 14px; font-weight: 700; opacity: 0.95; margin-top: 2px; }

    .section-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; background: #f8fafc; }
    .section-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    
    .grid-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .grid-label { color: #64748b; font-size: 11px; font-weight: 500; }
    .grid-val { color: #0f172a; font-size: 11.5px; font-weight: 700; text-align: right; }

    .instructions { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 12px; margin-top: 14px; font-size: 10px; color: #92400e; }
    .instructions-title { font-weight: 800; text-transform: uppercase; margin-bottom: 3px; font-size: 9.5px; }

    .footer { text-align: center; margin-top: 20px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 9px; color: #94a3b8; }
    .barcode { font-family: 'Courier New', monospace; font-size: 11px; font-weight: 900; letter-spacing: 0.25em; color: #334155; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="clinic-title">${clinicName}</div>
    <div class="clinic-sub">Patient Appointment Slip</div>
    <div class="clinic-contact">${clinicAddress} • Tel: ${clinicPhone}</div>
  </div>

  <div class="badge-box">
    <div class="badge-title">Scheduled Appointment</div>
    <div class="badge-datetime">${formattedDate}</div>
    <div class="badge-time">Time Slot: ${appointment.appointment_time || 'Morning Slot'}</div>
  </div>

  <div class="section-box">
    <div class="section-title">Patient Identification</div>
    <div class="grid-row">
      <span class="grid-label">Patient Full Name:</span>
      <span class="grid-val">${patient.name || 'N/A'}</span>
    </div>
    <div class="grid-row">
      <span class="grid-label">Patient ID:</span>
      <span class="grid-val">${patient.patient_number || 'N/A'}</span>
    </div>
    <div class="grid-row">
      <span class="grid-label">Phone Number:</span>
      <span class="grid-val">${patient.telephone || 'N/A'}</span>
    </div>
  </div>

  <div class="section-box">
    <div class="section-title">Clinical Appointment Details</div>
    <div class="grid-row">
      <span class="grid-label">Attending Doctor:</span>
      <span class="grid-val">Dr. ${doctor.full_name || doctor.username || 'Attending Specialist'}</span>
    </div>
    <div class="grid-row">
      <span class="grid-label">Specialization:</span>
      <span class="grid-val">${doctor.employee_id?.specialization || 'Dental Surgery'}</span>
    </div>
    <div class="grid-row">
      <span class="grid-label">Reason for Visit:</span>
      <span class="grid-val">${appointment.reason || 'General Dental Consultation'}</span>
    </div>
    ${appointment.notes ? `
    <div class="grid-row">
      <span class="grid-label">Clinical Notes:</span>
      <span class="grid-val">${appointment.notes}</span>
    </div>` : ''}
  </div>

  <div class="instructions">
    <div class="instructions-title">Important Patient Guidelines</div>
    • Please arrive at least 10–15 minutes prior to your allocated time.<br/>
    • Bring this appointment slip along with your previous dental records.<br/>
    • For rescheduling or cancellations, please call the clinic at least 4 hours in advance.
  </div>

  <div class="footer">
    <div>SODMAS Healthcare Systems • Valid Electronic Appointment Slip</div>
    <div class="barcode">*APT-${appointment._id?.toString().slice(-8).toUpperCase()}*</div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Patient Appointment Slip
              </h3>
              <p className="text-[11px] text-slate-400">SODMAS Dental Clinic official scheduling voucher</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slip Preview Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Main Visual Time Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md space-y-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
              Confirmed Slot
            </span>
            <h4 className="text-xl font-black">{formattedDate}</h4>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{appointment.appointment_time || '10:00 AM'}</span>
            </div>
          </div>

          {/* Patient Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/60 dark:border-slate-700 pb-1.5">
              <User className="w-3.5 h-3.5 text-blue-500" />
              <span>Patient Details</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[11px] text-slate-400 block">Name</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{patient.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Patient #</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{patient.patient_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Phone</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{patient.telephone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Status</span>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  {appointment.status || 'Scheduled'}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Doctor Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/60 dark:border-slate-700 pb-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
              <span>Specialist & Clinical Booking</span>
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Attending Doctor:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  Dr. {doctor.full_name || doctor.username || 'Attending Specialist'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Specialization:</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {doctor.employee_id?.specialization || 'General Dental Surgery'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Reason / Procedure:</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {appointment.reason || 'General Dental Consultation'}
                </span>
              </div>
              {appointment.notes && (
                <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">Instructions / Notes:</span>
                  <span className="text-slate-600 dark:text-slate-300 text-[11px]">{appointment.notes}</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Appointment Slip</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default AppointmentSlipModal;
