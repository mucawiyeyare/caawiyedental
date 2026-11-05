import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/layout/Layout.jsx';
import { useAuth } from './context/AuthContext.jsx';

// Pages
import Login from './pages/auth/Login.jsx';
import Unauthorized from './pages/unauthorized/Unauthorized.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import PatientList from './pages/patients/PatientList.jsx';
import PatientProfile from './pages/patients/PatientProfile.jsx';
import DoctorList from './pages/doctors/DoctorList.jsx';
import VisitList from './pages/visits/VisitList.jsx';
import ConsultationList from './pages/consultation/ConsultationList.jsx';
import TreatmentList from './pages/treatment/TreatmentList.jsx';
import ServiceList from './pages/services/ServiceList.jsx';
import DentalInventory from './pages/inventory/DentalInventory.jsx';
import LabManager from './pages/lab/LabManager.jsx';
import PharmacyManager from './pages/pharmacy/PharmacyManager.jsx';
import BillingManager from './pages/billing/BillingManager.jsx';
import DailyIncome from './pages/billing/DailyIncome.jsx';
import ExpenseManager from './pages/expenses/ExpenseManager.jsx';
import PaymentList from './pages/payments/PaymentList.jsx';
import AppointmentList from './pages/appointments/AppointmentList.jsx';
import FollowupList from './pages/followups/FollowupList.jsx';
import EmployeeList from './pages/employees/EmployeeList.jsx';
import UserList from './pages/users/UserList.jsx';
import ReportsManager from './pages/reports/ReportsManager.jsx';
import AuditLogList from './pages/auditlog/AuditLogList.jsx';
import SettingsView from './pages/settings/SettingsView.jsx';

// Super Admin Pages
import TenantsList from './pages/superadmin/TenantsList.jsx';

const DashboardRedirect = () => {
  const { isSuperAdmin } = useAuth();
  if (isSuperAdmin) {
    return <Navigate to="/super-admin/tenants" replace />;
  }
  return <Dashboard />;
};

function App() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Main Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          
          {/* Dashboard Route (Redirects Super Admin to Tenants list, Clinic users to Dashboard) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* Super Admin: Clinics & Tenant Management */}
          <Route element={<ProtectedRoute superAdminOnly={true} />}>
            <Route path="/super-admin/tenants" element={<TenantsList />} />
          </Route>

          {/* Patients & Doctors (Feature Guard: patients) */}
          <Route element={<ProtectedRoute requiredFeature="patients" />}>
            <Route path="/patients" element={<PatientList />} />
            <Route path="/patients/:id" element={<PatientProfile />} />
          </Route>
          <Route path="/doctors" element={<DoctorList />} />

          {/* Visits & Live Queue (Feature Guard: visits) */}
          <Route element={<ProtectedRoute requiredFeature="visits" />}>
            <Route path="/visits" element={<VisitList />} />
          </Route>

          {/* Doctor Consultations & Treatments (Feature Guard: consultations / treatments) */}
          <Route element={<ProtectedRoute requiredFeature="consultations" />}>
            <Route path="/consultations" element={<ConsultationList />} />
          </Route>
          <Route element={<ProtectedRoute requiredFeature="treatments" />}>
            <Route path="/treatments" element={<TreatmentList />} />
          </Route>
          <Route element={<ProtectedRoute requiredFeature="services" />}>
            <Route path="/services" element={<ServiceList />} />
          </Route>

          {/* Dental Materials & Equipment Inventory (Feature Guard: inventory) */}
          <Route element={<ProtectedRoute allowedRoles={['Admin', 'Doctor']} requiredFeature="inventory" />}>
            <Route path="/inventory" element={<DentalInventory />} />
          </Route>

          {/* Laboratory (Feature Guard: lab) */}
          <Route element={<ProtectedRoute requiredFeature="lab" />}>
            <Route path="/lab" element={<LabManager />} />
            <Route path="/lab/requests" element={<LabManager />} />
            <Route path="/lab/results" element={<LabManager />} />
          </Route>

          {/* Pharmacy & Prescriptions (Feature Guard: pharmacy) */}
          <Route element={<ProtectedRoute requiredFeature="pharmacy" />}>
            <Route path="/pharmacy" element={<PharmacyManager />} />
          </Route>

          {/* Billing, Daily Income & Payments (Feature Guard: billing / payments) */}
          <Route element={<ProtectedRoute requiredFeature="billing" />}>
            <Route path="/billing" element={<BillingManager />} />
            <Route path="/daily-income" element={<DailyIncome />} />
          </Route>
          <Route element={<ProtectedRoute requiredFeature="expenses" />}>
            <Route path="/expenses" element={<ExpenseManager />} />
          </Route>
          <Route element={<ProtectedRoute requiredFeature="payments" />}>
            <Route path="/payments" element={<PaymentList />} />
          </Route>

          {/* Appointments & Follow-ups (Feature Guard: appointments) */}
          <Route element={<ProtectedRoute requiredFeature="appointments" />}>
            <Route path="/appointments" element={<AppointmentList />} />
            <Route path="/followups" element={<FollowupList />} />
          </Route>

          {/* Staff Directory & Users */}
          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="/employees" element={<EmployeeList />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/audit-logs" element={<AuditLogList />} />
            <Route path="/settings" element={<SettingsView />} />
          </Route>

          {/* Reports & Analytics (Feature Guard: reports) */}
          <Route element={<ProtectedRoute requiredFeature="reports" />}>
            <Route path="/reports" element={<ReportsManager />} />
            <Route path="/reports/cashier" element={<PaymentList />} />
          </Route>

        </Route>
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
