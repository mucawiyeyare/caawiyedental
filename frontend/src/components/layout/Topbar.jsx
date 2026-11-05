import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { globalSearchApi, getAppointmentsApi, getVisitsApi, getInvoicesApi } from '../../api/endpoints.js';
import {
  Menu,
  Bell,
  ChevronDown,
  Search,
  Calendar,
  User,
  Settings,
  LogOut,
  Shield,
  X,
  Users,
  FileText,
  Clock,
  Sparkles,
  Stethoscope,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';

// Route → page title map
const PAGE_TITLES = {
  '/dashboard':    'Dashboard',
  '/patients':     'Patients',
  '/doctors':      'Doctors & Specialists',
  '/visits':       'Visits & Patient Flow',
  '/consultations':'Doctor Consultations',
  '/treatments':   'Dental Treatments',
  '/services':     'Dental Services',
  '/inventory':    'Dental Inventory',
  '/lab':          'Laboratory Module',
  '/billing':      'Billing & Invoices',
  '/payments':     'Cashier & Receipts',
  '/appointments': 'Appointments',
  '/reports':      'Reports & Analytics',
  '/settings':     'Settings',
  '/employees':    'Employees',
  '/users':        'Users & Roles',
  '/audit-logs':   'Audit Logs',
  '/followups':    'Follow-ups',
  '/super-admin/tenants': 'SODMAS — Clinics & Tenants',
};

const Topbar = ({ onToggleSidebar, onOpenProfile }) => {
  const { user, logout, isSuperAdmin, tenant } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Search state
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Dropdowns state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const calendarRef = useRef(null);
  const notifRef = useRef(null);

  // Live database alerts (appointments, visits, billing)
  const [alerts, setAlerts] = useState({
    appointments: 0,
    visits: 0,
    invoices: 0
  });

  useEffect(() => {
    let isMounted = true;
    const fetchAlerts = async () => {
      if (isSuperAdmin) return;
      try {
        const [appRes, visRes, invRes] = await Promise.allSettled([
          getAppointmentsApi({ limit: 100 }),
          getVisitsApi({ status: 'Waiting' }),
          getInvoicesApi({ status: 'Pending' })
        ]);
        let aCount = 0;
        if (appRes.status === 'fulfilled') {
          const apps = appRes.value?.data?.data || appRes.value?.data || [];
          if (Array.isArray(apps)) {
            aCount = apps.filter(a => a.status === 'Scheduled' || a.status === 'Confirmed').length;
          }
        }
        let vCount = 0;
        if (visRes.status === 'fulfilled') {
          const vis = visRes.value?.data?.data || visRes.value?.data || [];
          vCount = Array.isArray(vis) ? vis.length : 0;
        }
        let iCount = 0;
        if (invRes.status === 'fulfilled') {
          const invs = invRes.value?.data?.data || invRes.value?.data || [];
          if (Array.isArray(invs)) {
            iCount = invs.filter(i => i.status === 'Pending' || i.payment_status === 'Unpaid').length;
          }
        }
        if (isMounted) {
          setAlerts({ appointments: aCount, visits: vCount, invoices: iCount });
        }
      } catch (err) {
        if (isMounted) setAlerts({ appointments: 0, visits: 0, invoices: 0 });
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isSuperAdmin]);

  const totalAlerts = alerts.appointments + alerts.visits + alerts.invoices;

  // Derive current page title from pathname
  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    PAGE_TITLES[Object.keys(PAGE_TITLES).find(k => k !== '/' && location.pathname.startsWith(k)) || ''] ||
    'Dashboard';

  // Live search debouncing
  useEffect(() => {
    if (!searchVal.trim()) {
      setSearchResults(null);
      setIsSearchOpen(false);
      return;
    }

    setIsSearchOpen(true);
    setSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await globalSearchApi({ q: searchVal.trim() });
        setSearchResults(res.data?.data || null);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchVal]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    const clinicName = user?.tenant?.name || 'SODMAS';
    if (window.confirm(`Are you sure you want to log out from ${clinicName}?`)) {
      logout();
      navigate('/login');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    setIsSearchOpen(false);
    navigate(`/patients?search=${encodeURIComponent(searchVal.trim())}`);
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const totalResultsCount =
    (searchResults?.patients?.length || 0) +
    (searchResults?.invoices?.length || 0) +
    (searchResults?.visits?.length || 0) +
    (searchResults?.services?.length || 0);

  return (
    <header
      className="h-[64px] sm:h-[70px] bg-white dark:bg-slate-900 px-3 sm:px-5 lg:px-7 flex items-center justify-between shrink-0 sticky top-0 z-30 relative border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-200"
    >
      {/* ── Mobile Expanded Full-Width Search Overlay ── */}
      {isMobileSearchOpen ? (
        <div className="absolute inset-0 bg-white dark:bg-slate-900 px-3 flex items-center gap-2 z-50">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Search patient, invoice..."
              className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none font-medium"
            />
            {searchVal && (
              <button
                type="button"
                onClick={() => setSearchVal('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
          <button
            type="button"
            onClick={() => {
              setIsMobileSearchOpen(false);
              setIsSearchOpen(false);
            }}
            className="px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {/* Left: Hamburger (mobile only) + Clean Breadcrumb Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 active:scale-95 rounded-xl transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="hidden sm:inline-block text-xs font-semibold text-slate-400 dark:text-slate-500 truncate max-w-[140px]">
            {isSuperAdmin ? 'SODMAS' : (tenant?.display_name || tenant?.name || 'Snab Dental MS')}
          </span>
          <span className="hidden sm:inline-block text-xs text-slate-300 dark:text-slate-600">/</span>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {pageTitle}
          </h2>
        </div>
      </div>

      {/* Right: Search + Bell + Calendar + Profile */}
      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        {/* Mobile Search Trigger Icon */}
        <button
          type="button"
          onClick={() => setIsMobileSearchOpen(true)}
          className="sm:hidden p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 active:scale-95 rounded-xl transition cursor-pointer"
          aria-label="Search"
        >
          <Search className="w-4.5 h-4.5" />
        </button>

        {/* ── 1. Workable Global Search Box with Live Results Dropdown (Desktop) ── */}
        <div className="relative hidden sm:block" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <div
              className="flex items-center gap-2 rounded-xl px-3.5 py-2 w-56 lg:w-80 transition-all bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-slate-400 dark:focus-within:ring-slate-600"
            >
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <input
                type="text"
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                onFocus={() => {
                  if (searchVal.trim()) setIsSearchOpen(true);
                }}
                placeholder="Search patient, invoice, etc..."
                className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none font-medium"
              />
              {searchVal && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchVal('');
                    setIsSearchOpen(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Live Search Results Popover */}
          {isSearchOpen && (
            <div className="absolute left-0 top-full mt-2 w-80 lg:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[480px] overflow-y-auto">
              {searchLoading ? (
                <div className="flex items-center justify-center py-8 text-xs text-slate-400 gap-2">
                  <div className="w-4 h-4 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching system records...</span>
                </div>
              ) : totalResultsCount === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  <Search className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-600">No results found for "{searchVal}"</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Press Enter to search in Patients register</p>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  {/* Patients Section */}
                  {searchResults?.patients?.length > 0 && (
                    <div className="px-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-blue-600" />
                        <span>Patients ({searchResults.patients.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.patients.map(p => (
                          <div
                            key={p._id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate(`/patients?search=${encodeURIComponent(p.patient_number || p.name)}`);
                            }}
                            className="p-2 rounded-xl hover:bg-blue-50 cursor-pointer flex items-center justify-between transition"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{p.name}</span>
                              <span className="text-[11px] text-slate-400">{p.patient_number} • {p.telephone}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                              {p.gender || 'Patient'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invoices Section */}
                  {searchResults?.invoices?.length > 0 && (
                    <div className="px-3 pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-emerald-600" />
                        <span>Invoices ({searchResults.invoices.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.invoices.map(inv => (
                          <div
                            key={inv._id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate(`/billing?search=${encodeURIComponent(inv.invoice_number)}`);
                            }}
                            className="p-2 rounded-xl hover:bg-emerald-50 cursor-pointer flex items-center justify-between transition"
                          >
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-slate-900 block">{inv.invoice_number}</span>
                              <span className="text-[11px] text-slate-400">{inv.patient_id?.name || 'Patient'}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900 font-mono text-[11px] block">${(inv.balance || inv.total_amount || 0).toFixed(2)}</span>
                              <span className="text-[10px] text-emerald-600 font-semibold">{inv.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visits Section */}
                  {searchResults?.visits?.length > 0 && (
                    <div className="px-3 pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-indigo-600" />
                        <span>Visits ({searchResults.visits.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.visits.map(v => (
                          <div
                            key={v._id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate('/visits');
                            }}
                            className="p-2 rounded-xl hover:bg-indigo-50 cursor-pointer flex items-center justify-between transition"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{v.patient_id?.name || 'Patient'}</span>
                              <span className="text-[11px] text-slate-400">{v.visit_number} • {v.reason}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800">
                              {v.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dental Services Section */}
                  {searchResults?.services?.length > 0 && (
                    <div className="px-3 pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>Dental Procedures ({searchResults.services.length})</span>
                      </div>
                      <div className="space-y-1">
                        {searchResults.services.map(s => (
                          <div
                            key={s._id}
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate('/services');
                            }}
                            className="p-2 rounded-xl hover:bg-purple-50 cursor-pointer flex items-center justify-between transition"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{s.service_name}</span>
                              <span className="text-[11px] text-slate-400">{s.category} ({s.service_code || 'PRC'})</span>
                            </div>
                            <span className="font-bold text-purple-700 font-mono text-xs">
                              ${s.price || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer Action */}
                  <div className="p-2 pt-2 border-t border-slate-100 bg-slate-50/70 text-center rounded-b-xl">
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                    >
                      Press Enter or click here to view all in Patients →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 2. Notification Bell Popover ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(prev => !prev)}
            className={`relative p-2 rounded-xl transition cursor-pointer ${
              isNotifOpen
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-300 dark:ring-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Clinic Notifications"
          >
            <Bell className="w-5 h-5" />
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2.5 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Clinic Alerts & Activity</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  totalAlerts > 0
                    ? 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800'
                    : 'text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}>
                  {totalAlerts > 0 ? `${totalAlerts} Active` : 'All Clear'}
                </span>
              </div>
              <div className="py-2 space-y-2">
                {totalAlerts === 0 ? (
                  <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5 text-emerald-500 opacity-80" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No Pending Alerts</p>
                    <p className="text-[11px]">All appointments and patient queues are up to date.</p>
                  </div>
                ) : (
                  <>
                    {alerts.appointments > 0 && (
                      <div
                        onClick={() => { setIsNotifOpen(false); navigate('/appointments'); }}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <CalendarDays className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">Scheduled Appointments</span>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                              {alerts.appointments}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                            Patient bookings scheduled for clinic attendance.
                          </span>
                        </div>
                      </div>
                    )}

                    {alerts.visits > 0 && (
                      <div
                        onClick={() => { setIsNotifOpen(false); navigate('/visits'); }}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">Active Patient Flow</span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                              {alerts.visits} waiting
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                            Patients waiting in consultation and triage queue.
                          </span>
                        </div>
                      </div>
                    )}

                    {alerts.invoices > 0 && (
                      <div
                        onClick={() => { setIsNotifOpen(false); navigate('/billing'); }}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">Pending Invoices</span>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                              {alerts.invoices} unpaid
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                            Invoices awaiting cashier payment settlement.
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 3. Workable Calendar & Month Selector Popover ── */}
        <div className="relative" ref={calendarRef}>
          <button
            onClick={() => setIsCalendarOpen(prev => !prev)}
            className={`p-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              isCalendarOpen
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-300 dark:ring-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Calendar & Month Selector"
          >
            <Calendar className="w-5 h-5" />
          </button>

          {isCalendarOpen && (
            <div className="absolute right-0 top-full mt-2.5 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
              <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center mx-auto mb-1.5 font-bold border border-slate-200 dark:border-slate-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <h4 className="font-black text-slate-900 dark:text-white text-sm">{todayFormatted}</h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Active Clinic Working Shift</p>
              </div>

              <div className="py-3 space-y-2">
                <button
                  onClick={() => {
                    setIsCalendarOpen(false);
                    navigate('/appointments');
                  }}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>View Appointments Schedule</span>
                </button>

                <button
                  onClick={() => {
                    setIsCalendarOpen(false);
                    navigate('/dashboard');
                  }}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Go to Monthly Dashboard</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Dark Mode Toggle Icon Button ── */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/80 transition cursor-pointer flex items-center justify-center shadow-2xs"
          title={isDark ? 'Switch to White Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle dark mode"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700 hover:-rotate-12 transition-transform" />
          )}
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-7 bg-slate-200/80 dark:bg-slate-800 mx-1" />

        {/* ── 4. Profile Dropdown Container ── */}
        <div className="relative" ref={dropdownRef}>
          {/* Profile Trigger Button */}
          <button
            onClick={() => setIsDropdownOpen(prev => !prev)}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition cursor-pointer ${
              isDropdownOpen ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {/* User Avatar Image Icon */}
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-semibold text-xs shrink-0 overflow-hidden shadow-2xs">
              {user?.profile_image ? (
                <img src={user.profile_image} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4.5 h-4.5 stroke-[2.2]" />
              )}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.full_name || user?.username || 'System Administrator'}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{user?.role || 'Admin'}</p>
            </div>
            <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-slate-900 dark:text-white' : ''}`} />
          </button>

          {/* Popover Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2.5 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white dark:bg-slate-900 border-t border-l border-slate-200 dark:border-slate-800 rotate-45" />

              {/* User Header Info */}
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shrink-0">
                  {user?.profile_image ? (
                    <img src={user.profile_image} alt="avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <User className="w-4 h-4 stroke-[2.2]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    Hi, {user?.full_name?.split(' ')[0] || user?.username || 'Admin'}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                    {user?.email || `${user?.role || 'System'} Account`}
                  </p>
                </div>
              </div>

              {/* Menu Navigation Links */}
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-left cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span>Profile</span>
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-left cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span>Settings</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Topbar;
