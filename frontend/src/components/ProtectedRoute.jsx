import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles, requiredFeature, superAdminOnly }) => {
  const { user, token, loading, isSuperAdmin, isFeatureEnabled } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-300 font-semibold text-sm tracking-wide">Loading Dental Hub Platform...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin Only Guard
  if (superAdminOnly && !isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Role check: Super Admins bypass ordinary role checks
  if (allowedRoles && !isSuperAdmin && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Feature entitlement check: If tenant has this module disabled
  if (requiredFeature && !isFeatureEnabled(requiredFeature)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Module Disabled</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              The <strong>{requiredFeature}</strong> module is currently not enabled for your clinic account ({user?.tenant?.name || 'Clinic'}).
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Please contact your platform administrator to enable this feature for your subscription.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Clinic Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
