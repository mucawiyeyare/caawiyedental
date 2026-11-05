import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { getClinicTheme } from '../../utils/themeUtils.js';
import { getDashboardStatsApi } from '../../api/endpoints.js';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import {
  Users,
  Calendar,
  DollarSign,
  UserCheck,
  CheckCircle2,
  Clock,
  Activity,
  Search,
  ArrowRight,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  FileText,
  User,
  Sparkles,
  CalendarDays
} from 'lucide-react';

/* ==========================================================================
   STAT CARD COMPONENT (Vibrant Colors, Zero Icon Bloat)
   ========================================================================== */
const DoctorStatCard = ({ label, value, subText, colorScheme = 'blue', className = '' }) => {
  const schemes = {
    blue: 'bg-gradient-to-br from-blue-600 to-blue-700 text-white',
    emerald: 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white',
    amber: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white',
    purple: 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white',
    slate: 'bg-gradient-to-br from-slate-800 to-slate-900 text-white'
  };
  const current = schemes[colorScheme] || schemes.blue;

  return (
    <div className={`${current} rounded-2xl p-4 shadow-sm flex flex-col justify-between transition duration-200 ${className}`}>
      <div>
        <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider block truncate">{label}</span>
        <span className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1 block font-mono truncate">{value}</span>
      </div>
      <div className="mt-3 pt-2 border-t border-white/20 text-[10px] sm:text-[11px] font-medium text-white/80 truncate">
        {subText}
      </div>
    </div>
  );
};

/* ==========================================================================
   DOCTOR MONTHLY REVENUE LINE CHART
   ========================================================================== */
const DoctorRevenueChart = ({ dailyData = [], monthRevenue = 0 }) => {
  const pointsData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) {
      return [
        { label: 'Wk 1', amount: monthRevenue * 0.2 },
        { label: 'Wk 2', amount: monthRevenue * 0.3 },
        { label: 'Wk 3', amount: monthRevenue * 0.25 },
        { label: 'Wk 4', amount: monthRevenue * 0.25 }
      ];
    }
    return dailyData.map(d => ({
      label: d._id ? d._id.substring(8, 10) : 'Day',
      amount: d.total || 0
    }));
  }, [dailyData, monthRevenue]);

  const maxAmount = Math.max(...pointsData.map(p => p.amount), 50);
  const chartHeight = 110;
  const chartWidth = 420;
  const paddingLeft = 45;
  const paddingBottom = 120;
  const stepX = pointsData.length > 1 ? (chartWidth - 20) / (pointsData.length - 1) : 0;

  const coords = pointsData.map((pt, i) => {
    const x = paddingLeft + i * stepX;
    const y = paddingBottom - (pt.amount / maxAmount) * (chartHeight - 30);
    return { ...pt, x, y };
  });

  const pathD = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  const areaD = `${pathD} L ${coords[coords.length - 1]?.x || paddingLeft} ${paddingBottom} L ${coords[0]?.x || paddingLeft} ${paddingBottom} Z`;

  return (
    <div className="w-full h-44 relative mt-2">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 460 140">
        <defs>
          <linearGradient id="doctorRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        <line x1="40" y1="20" x2="445" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
        <line x1="40" y1="50" x2="445" y2="50" stroke="#e2e8f0" strokeDasharray="3 3" />
        <line x1="40" y1="80" x2="445" y2="80" stroke="#e2e8f0" strokeDasharray="3 3" />
        <line x1="40" y1="120" x2="445" y2="120" stroke="#cbd5e1" strokeWidth="1" />

        {/* Y-axis labels */}
        <text x="35" y="23" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold font-mono">{`$${Math.round(maxAmount)}`}</text>
        <text x="35" y="53" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold font-mono">{`$${Math.round(maxAmount * 0.66)}`}</text>
        <text x="35" y="83" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold font-mono">{`$${Math.round(maxAmount * 0.33)}`}</text>
        <text x="35" y="123" textAnchor="end" className="text-[9px] fill-slate-400 font-semibold font-mono">$0</text>

        {/* Area Gradient */}
        <path d={areaD} fill="url(#doctorRevGrad)" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {coords.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r="3.5"
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth="2"
          />
        ))}

        {/* X-axis labels */}
        {coords.map((pt, i) => (
          <text key={i} x={pt.x} y="134" textAnchor="middle" className="text-[8px] fill-slate-400 font-medium">
            {pt.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

/* ==========================================================================
   DOCTOR DASHBOARD COMPONENT
   ========================================================================== */
const DoctorDashboard = () => {
  const { user, tenant } = useAuth();
  const theme = getClinicTheme(tenant);
  const navigate = useNavigate();

  // Generate last 12 months for selector
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value: val, label });
    }
    return options;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');
  const [isHeaderMonthOpen, setIsHeaderMonthOpen] = useState(false);

  useEffect(() => {
    fetchDoctorStats(selectedMonth);
  }, [selectedMonth]);

  const fetchDoctorStats = async (month) => {
    setLoading(true);
    try {
      const res = await getDashboardStatsApi({ month });
      setData(res.data?.data || null);
    } catch (err) {
      console.error('Error loading doctor dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const doctor = data?.doctor || {};
  const stats = data?.statistics || {};
  const recentPatients = data?.recentPatients || [];
  const upcomingAppointments = data?.upcomingAppointments || [];
  const pendingFollowups = data?.pendingFollowups || [];
  const recentTreatments = data?.recentTreatments || [];
  const topServices = data?.topServices || [];
  const dailyRevenue = data?.dailyRevenue || [];

  const [scheduleTab, setScheduleTab] = useState('all'); // 'all' | 'appointments' | 'followups'

  // Filter recent patients locally for real-time quick search
  const filteredRecentPatients = recentPatients.filter(v => {
    const q = patientSearch.toLowerCase();
    const p = v.patient_id;
    return (
      !q ||
      p?.name?.toLowerCase().includes(q) ||
      p?.patient_number?.toLowerCase().includes(q) ||
      p?.telephone?.toLowerCase().includes(q) ||
      v.reason?.toLowerCase().includes(q) ||
      v.status?.toLowerCase().includes(q)
    );
  });

  const handlePrevMonth = (e) => {
    e?.stopPropagation();
    const [y, m] = (selectedMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`).split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = (e) => {
    e?.stopPropagation();
    const [y, m] = (selectedMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`).split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth || 'Current Month';

  return (
    <div className="space-y-6">

      {/* ── 1. Welcome / Doctor Profile Header (Monochrome White & Black) ── */}
      <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/90 dark:border-slate-800 relative overflow-hidden transition-all duration-200">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xl font-black shrink-0 shadow-2xs text-slate-900 dark:text-white">
              <Stethoscope className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                  Doctor Portal
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {doctor.department || 'Department of Dentistry'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 text-slate-900 dark:text-white">
                {(() => {
                  const n = doctor.name || user?.full_name || user?.username || 'Doctor';
                  return n.startsWith('Dr.') ? n : `Dr. ${n}`;
                })()}
              </h1>
              <p className="text-xs mt-0.5 font-medium text-slate-500 dark:text-slate-400">
                {doctor.specialization || 'Dental Surgeon'} • Active Clinical Shift
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Clickable Interactive Month & Date Navigator */}
            <div className="relative">
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-0.5 shadow-2xs">
                {/* Previous Month 1-Click Button */}
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Center Month / Calendar Button */}
                <button
                  type="button"
                  onClick={() => setIsHeaderMonthOpen(prev => !prev)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                  title="Click to choose a month or view calendar"
                >
                  <CalendarDays className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <span>{selectedMonthLabel}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isHeaderMonthOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Next Month 1-Click Button */}
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Full Interactive Month Grid & Date Picker Popover */}
              {isHeaderMonthOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="font-black text-slate-900 dark:text-white text-sm block">Select Performance Month</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Switch dashboard period & statistics</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                      {selectedMonth}
                    </span>
                  </div>

                  {/* 12-Month Quick Buttons Grid */}
                  <div className="py-3">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">Available Months:</div>
                    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {monthOptions.map(opt => {
                        const isSelected = opt.value === selectedMonth;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setSelectedMonth(opt.value);
                              setIsHeaderMonthOpen(false);
                            }}
                            className={`py-2 px-2 rounded-xl font-bold text-[11px] text-center transition cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {opt.label.split(' ')[0]} {opt.label.split(' ')[1]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Direct Native Month Picker */}
                  <div className="py-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Pick Any Month:</span>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedMonth(e.target.value);
                          setIsHeaderMonthOpen(false);
                        }
                      }}
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none"
                    />
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMonth(monthOptions[0]?.value || '');
                        setIsHeaderMonthOpen(false);
                      }}
                      className="font-bold text-slate-900 dark:text-white hover:underline cursor-pointer"
                    >
                      Reset to Current Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsHeaderMonthOpen(false)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/visits')}
              className="px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition active:scale-[0.98] cursor-pointer flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 hover:dark:bg-slate-100"
            >
              <span>Consultations & Flow</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Key Statistics (Doctor-Specific Metrics) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <DoctorStatCard
          label="Patients Served"
          value={stats.patientsServed ?? 0}
          subText="Total assigned"
          colorScheme="blue"
        />
        <DoctorStatCard
          label="Today's Patients"
          value={stats.todayPatients ?? 0}
          subText="Seen / queued"
          colorScheme="emerald"
        />
        <DoctorStatCard
          label="Upcoming Appts"
          value={stats.pendingAppointments ?? 0}
          subText={`${stats.todayAppointments ?? 0} scheduled today`}
          colorScheme="amber"
        />
        <DoctorStatCard
          label="Daily Income Today"
          value={`$${(stats.todayRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
          subText="Today's collections"
          colorScheme="purple"
        />
        <DoctorStatCard
          label="Total Revenue"
          value={`$${(stats.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
          subText={`$${(stats.monthlyRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} this month`}
          colorScheme="slate"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* ── 3. Middle Section: Today's Appointments & Monthly Revenue Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Today's / Upcoming Appointments & Pending Follow-ups (5 cols) ── */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <span>Appointments & Follow-ups</span>
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Upcoming bookings & pending recalls for {(() => {
                    const n = doctor.name || user?.full_name || user?.username || 'Doctor';
                    return n.startsWith('Dr.') ? n : `Dr. ${n}`;
                  })()}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => navigate('/appointments')}
                  className="font-bold text-slate-900 dark:text-white hover:underline transition cursor-pointer"
                >
                  View all
                </button>
              </div>
            </div>

            {/* Quick Segment Filter */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => setScheduleTab('all')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer text-center ${
                  scheduleTab === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All ({upcomingAppointments.length + pendingFollowups.length})
              </button>
              <button
                type="button"
                onClick={() => setScheduleTab('appointments')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer text-center ${
                  scheduleTab === 'appointments'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Appts ({upcomingAppointments.length})
              </button>
              <button
                type="button"
                onClick={() => setScheduleTab('followups')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer text-center ${
                  scheduleTab === 'followups'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Follow-ups ({pendingFollowups.length})
              </button>
            </div>

            {/* List */}
            {(() => {
              const showAppts = scheduleTab === 'all' || scheduleTab === 'appointments';
              const showFollowups = scheduleTab === 'all' || scheduleTab === 'followups';

              const apptsList = showAppts ? upcomingAppointments : [];
              const followupsList = showFollowups ? pendingFollowups : [];

              const totalItems = apptsList.length + followupsList.length;

              if (totalItems === 0) {
                return (
                  <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs">
                    <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      {scheduleTab === 'followups'
                        ? 'No pending follow-ups'
                        : scheduleTab === 'appointments'
                        ? 'No upcoming appointments'
                        : 'No upcoming appointments or follow-ups'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Your schedule is currently clear.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-0.5">
                  {/* Appointments */}
                  {apptsList.map((item, idx) => (
                    <div
                      key={`appt-${item._id || idx}`}
                      onClick={() => item.patient_id?._id && navigate(`/patients/${item.patient_id._id}`)}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex flex-col items-center justify-center font-bold text-[10px] shrink-0 font-mono shadow-xs">
                          <span>{item.appointment_time ? item.appointment_time.split(' ')[0] : '09:00'}</span>
                          <span className="text-[8px] opacity-80 uppercase">{item.appointment_time?.includes('PM') ? 'PM' : 'AM'}</span>
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 uppercase">
                              Appt
                            </span>
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {item.patient_id?.name || 'Patient'}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {item.patient_id?.patient_number || ''} • {item.reason || 'Dental Consultation'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <StatusBadge status={item.status} />
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 font-mono">
                          {new Date(item.appointment_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Pending Follow-ups */}
                  {followupsList.map((item, idx) => (
                    <div
                      key={`fup-${item._id || idx}`}
                      onClick={() => item.patient_id?._id && navigate(`/patients/${item.patient_id._id}`)}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 uppercase">
                              Follow-up
                            </span>
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {item.patient_id?.name || 'Patient'}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {item.patient_id?.patient_number || ''} • {item.reason || 'Recall / Check-up'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <StatusBadge status={item.status || 'Pending'} />
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block mt-0.5 font-mono">
                          Due: {new Date(item.followup_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              onClick={() => navigate('/visits')}
              className="font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Patient Queue</span>
            </button>
            <button
              onClick={() => navigate('/appointments')}
              className="font-bold text-slate-900 dark:text-white hover:underline transition inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Appointments</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Monthly Revenue & Performance Overview (7 cols) ── */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <span>Monthly Performance & Revenue</span>
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Revenue generated strictly from your consultations and treatments</p>
              </div>

              {/* Month Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none cursor-pointer"
                >
                  {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Highlight Banner */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  {selectedMonthLabel} Total Earned
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {`$${(stats.monthlyRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-900 dark:text-white font-bold block">{topServices.reduce((sum, s) => sum + (s.count || 0), 0)} Procedures</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Conducted this month</span>
              </div>
            </div>

            {/* Trajectory Chart */}
            <DoctorRevenueChart dailyData={dailyRevenue} monthRevenue={stats.monthlyRevenue || 0} />
          </div>

          {/* Top Services Breakdown */}
          {topServices.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {topServices.slice(0, 3).map((s, idx) => (
                <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 rounded-xl">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate font-medium">{s._id || 'Service'}</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">{s.count} done ({`$${(s.totalRevenue || 0).toFixed(0)}`})</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── 4. Recent Served Patients Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Recent Served Patients</span>
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Patients attended by Dr. {doctor.name || user?.username}</p>
          </div>

          {/* Live Table Search */}
          <div className="w-full sm:w-72 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search by patient name, phone, or ID..."
              className="w-full text-xs bg-transparent text-slate-900 dark:text-white focus:outline-none font-medium placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
        </div>

        {filteredRecentPatients.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No served patients found</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Patients you attend will appear in this list.</p>
          </div>
        ) : (
          <div className="dental-table-container">
            <table className="dental-table">
              <thead>
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Visit Date & Time</th>
                  <th className="py-3 px-4">Service / Consultation</th>
                  <th className="py-3 px-4">Visit Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecentPatients.map((visit) => {
                  const patient = visit.patient_id;
                  return (
                    <tr key={visit._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {(patient?.name || 'P').charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{patient?.name || 'Patient'}</span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">{patient?.telephone || 'No phone'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {patient?.patient_number || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {new Date(visit.visit_date || visit.createdAt).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })} • {new Date(visit.visit_date || visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {visit.reason || 'General Dental Consultation'}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={visit.status} />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => navigate('/visits')}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-lg transition text-[11px] cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 5. Recent Activity / Clinical Notes Log ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Recent Clinical Activity Log</span>
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Recent dental procedures and treatments performed by you</p>
          </div>
          <button
            onClick={() => navigate('/treatments')}
            className="text-xs font-bold text-slate-900 dark:text-white hover:underline transition cursor-pointer"
          >
            View all treatments
          </button>
        </div>

        {recentTreatments.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
            <Clock className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
            <p>No recent dental procedures recorded.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentTreatments.map((t, idx) => (
              <div key={t._id || idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white truncate">{t.patient_id?.name || 'Patient'}</span>
                  <span className="text-[10px] font-mono font-bold text-slate-900 dark:text-white">${t.price || 0}</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                  {t.service_name || 'Dental Treatment'}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span>Tooth: {t.tooth_number || 'General'}</span>
                  <span className="font-mono">{new Date(t.treatment_date || t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default DoctorDashboard;
