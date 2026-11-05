import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import ProfileModal from '../ui/ProfileModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  LayoutDashboard,
  Users,
  Activity,
  CreditCard,
  Calendar,
  Building2,
  FileText,
  ShieldCheck,
  HeartPulse,
  User
} from 'lucide-react';

const Layout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, isSuperAdmin, tenant } = useAuth();

  const clinicTitle = isSuperAdmin
    ? 'SODMAS SaaS Platform'
    : (tenant?.display_name || tenant?.name || 'Snab Dental MS');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Sidebar with mobile drawer & shadow */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          onToggleSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
        
        {/* Main page content area */}
        <main className="flex-1 overflow-y-auto momentum-scroll p-3 sm:p-5 lg:p-6 pb-24 sm:pb-8 flex flex-col justify-between">
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>

          {/* Clinic & Developer Footer */}
          <footer className="mt-8 pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
            <div className="flex items-center gap-1.5 text-center sm:text-left">
              <span>© {new Date().getFullYear()} {clinicTitle}. All rights reserved.</span>
            </div>
            <div className="text-center sm:text-right">
              Powered by{' '}
              <span className="font-bold text-slate-700 dark:text-slate-300">SODMAS Multitenant SaaS</span>
            </div>
          </footer>
        </main>

        {/* Mobile Bottom Quick Navigation Bar (Touch Optimized) */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-1 py-1.5 flex items-center justify-around z-30 shadow-lg safe-bottom">
          {isSuperAdmin ? (
            <>
              <NavLink
                to="/super-admin/tenants"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all active:scale-90 ${
                    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`
                }
              >
                <Building2 className="w-5 h-5 mb-0.5" />
                <span>Clinics</span>
              </NavLink>

              <NavLink
                to="/audit-logs"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all active:scale-90 ${
                    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`
                }
              >
                <FileText className="w-5 h-5 mb-0.5" />
                <span>Audit Logs</span>
              </NavLink>

              <NavLink
                to="/users"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all active:scale-90 ${
                    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`
                }
              >
                <ShieldCheck className="w-5 h-5 mb-0.5" />
                <span>Users</span>
              </NavLink>

              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all active:scale-90 cursor-pointer"
              >
                <User className="w-5 h-5 mb-0.5" />
                <span>Account</span>
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all active:scale-90 ${
                    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`
                }
              >
                <LayoutDashboard className="w-5 h-5 mb-0.5" />
                <span>Home</span>
              </NavLink>

              <NavLink
                to="/patients"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all active:scale-90 ${
                    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`
                }
              >
                <Users className="w-5 h-5 mb-0.5" />
                <span>Patients</span>
              </NavLink>

              <NavLink
                to="/visits"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all active:scale-90 ${
                    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`
                }
              >
                <Activity className="w-5 h-5 mb-0.5" />
                <span>Queue</span>
              </NavLink>

              {(user?.role === 'Admin' || user?.role === 'Receptionist/Cashier') ? (
                <NavLink
                  to="/billing"
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all active:scale-90 ${
                      isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`
                  }
                >
                  <CreditCard className="w-5 h-5 mb-0.5" />
                  <span>Billing</span>
                </NavLink>
              ) : (
                <NavLink
                  to="/treatments"
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all active:scale-90 ${
                      isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`
                  }
                >
                  <HeartPulse className="w-5 h-5 mb-0.5" />
                  <span>Treatments</span>
                </NavLink>
              )}

              <NavLink
                to="/appointments"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all active:scale-90 ${
                    isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`
                }
              >
                <Calendar className="w-5 h-5 mb-0.5" />
                <span>Appts</span>
              </NavLink>
            </>
          )}
        </nav>
      </div>

      {/* Global Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};

export default Layout;
