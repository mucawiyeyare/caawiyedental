import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import DoctorDashboard from './DoctorDashboard.jsx';
import {
  getDashboardStatsApi,
  getAppointmentsApi,
  getInvoicesApi,
  getPatientsApi,
  getDoctorPerformanceReportApi
} from '../../api/endpoints.js';
import {
  Users,
  CalendarDays,
  DollarSign,
  CreditCard,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar
} from 'lucide-react';

/* ==========================================================================
   SHARED HELPERS
   ========================================================================== */
const CARD_CLASS =
  'bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.06)]';

const formatMoney = (val, decimals = 0) =>
  `$${(Number(val) || 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;

const toLocalDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const toMonthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Normalises "05:00", "17:30" or "10:00 AM" into "05:00 AM" style labels
const formatApptTime = (t) => {
  if (!t) return '--:--';
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(String(t).trim());
  if (!m) return t;
  let h = parseInt(m[1], 10);
  let suffix = m[3]?.toUpperCase();
  if (!suffix) {
    suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
  }
  return `${String(h).padStart(2, '0')}:${m[2]} ${suffix}`;
};

const APPT_STATUS_STYLES = {
  Completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  Confirmed: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  'Checked In': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
  Scheduled: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  Cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  'No Show': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
};

/* ==========================================================================
   KPI STAT CARD (icon bubble + value + coloured footer)
   ========================================================================== */
const STAT_SCHEMES = {
  blue: { bubble: 'bg-blue-600', footer: 'text-blue-600 dark:text-blue-400' },
  emerald: { bubble: 'bg-emerald-500', footer: 'text-emerald-600 dark:text-emerald-400' },
  violet: { bubble: 'bg-violet-500', footer: 'text-violet-600 dark:text-violet-400' },
  amber: { bubble: 'bg-amber-500', footer: 'text-orange-600 dark:text-orange-400' },
  sky: { bubble: 'bg-sky-600', footer: 'text-sky-600 dark:text-sky-400' }
};

const StatCard = ({ icon: Icon, label, value, footer, color = 'blue', onClick }) => {
  const scheme = STAT_SCHEMES[color] || STAT_SCHEMES.blue;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${CARD_CLASS} p-5 text-left flex flex-col justify-between min-h-[128px] transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full ${scheme.bubble} text-white flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-snug">{label}</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">{value}</p>
        </div>
      </div>
      <p className={`text-xs font-semibold mt-5 ${scheme.footer}`}>{footer}</p>
    </button>
  );
};

/* ==========================================================================
   MONTH SELECTOR (prev / dropdown / next)
   ========================================================================== */
const MonthSelector = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const idx = options.findIndex((o) => o.value === value);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // options are ordered newest → oldest
  const canGoOlder = idx < options.length - 1;
  const canGoNewer = idx > 0;

  return (
    <div ref={ref} className="relative flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-1.5 py-1.5 shadow-2xs">
      <button
        type="button"
        disabled={!canGoOlder}
        onClick={() => canGoOlder && onChange(options[idx + 1].value)}
        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
      >
        <Calendar className="w-4 h-4 text-blue-600" />
        <span>{options[idx]?.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <button
        type="button"
        disabled={!canGoNewer}
        onClick={() => canGoNewer && onChange(options[idx - 1].value)}
        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        aria-label="Next month"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 max-h-72 overflow-y-auto z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-sm cursor-pointer ${
                o.value === value
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   REVENUE OVERVIEW (7-day area line chart)
   ========================================================================== */
const RevenueLineChart = ({ data }) => {
  const W = 380;
  const H = 190;
  const padL = 38;
  const padR = 14;
  const padT = 34;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = Math.max(...data.map((d) => d.total), 0);
  const scaleMax = max > 0 ? max : 100;

  const points = data.map((d, i) => ({
    ...d,
    x: padL + (data.length > 1 ? (i * innerW) / (data.length - 1) : innerW / 2),
    y: padT + innerH - (d.total / scaleMax) * innerH
  }));

  const defaultIdx = max > 0 ? data.findIndex((d) => d.total === max) : data.length - 1;
  const [hoverIdx, setHoverIdx] = useState(null);
  const activeIdx = hoverIdx ?? defaultIdx;
  const active = points[activeIdx];

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${padT + innerH} L ${points[0].x} ${padT + innerH} Z`
    : '';

  const yTicks = [1, 2 / 3, 1 / 3, 0];
  const slotW = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const tipW = 54;
  const tipX = active ? Math.min(Math.max(active.x - tipW / 2, padL - 10), W - tipW) : 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible select-none">
      <defs>
        <linearGradient id="revenueAreaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid + Y labels */}
      {yTicks.map((t, i) => {
        const y = padT + innerH - t * innerH;
        return (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
              strokeWidth="1"
              strokeDasharray={t === 0 ? undefined : '3 3'}
            />
            <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="8" className="fill-slate-400 font-medium">
              ${Math.round(scaleMax * t)}
            </text>
          </g>
        );
      })}

      {/* Area + line */}
      <path d={areaPath} fill="url(#revenueAreaFill)" />
      <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* Points, X labels & hover zones */}
      {points.map((p, i) => (
        <g key={p.key}>
          <circle
            cx={p.x}
            cy={p.y}
            r={i === activeIdx ? 4.5 : 3.5}
            fill="#fff"
            stroke="#2563eb"
            strokeWidth="2"
          />
          <text x={p.x} y={H - 8} textAnchor="middle" fontSize="8" className="fill-slate-400 font-medium">
            {p.label}
          </text>
          <rect
            x={p.x - slotW / 2}
            y={0}
            width={slotW}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        </g>
      ))}

      {/* Tooltip */}
      {active && (
        <g pointerEvents="none">
          <rect x={tipX} y={active.y - 34} width={tipW} height={24} rx="4" fill="#0f172a" />
          <text x={tipX + tipW / 2} y={active.y - 24} textAnchor="middle" fontSize="7" fill="#cbd5e1">
            {active.label}
          </text>
          <text x={tipX + tipW / 2} y={active.y - 14} textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff">
            {formatMoney(active.total)}
          </text>
        </g>
      )}
    </svg>
  );
};

/* ==========================================================================
   PATIENT OVERVIEW DONUT (new vs returning)
   ========================================================================== */
const PatientOverviewDonut = ({ total, newCount, returningCount }) => {
  const base = newCount + returningCount || 1;
  const newPct = (newCount / base) * 100;
  const retPct = (returningCount / base) * 100;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="13" />
            {returningCount > 0 && (
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="#10b981"
                strokeWidth="13"
                pathLength="100"
                strokeDasharray={`${retPct} 100`}
                strokeDashoffset={-newPct}
              />
            )}
            {newCount > 0 && (
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="#2563eb"
                strokeWidth="13"
                pathLength="100"
                strokeDasharray={`${newPct} 100`}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{total}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Patients</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
            New Patients (Last 30d)
          </span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {newCount} ({Math.round(newPct)}%)
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            Returning Patients
          </span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {returningCount} ({Math.round(retPct)}%)
          </span>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   SECTION CARD HEADER
   ========================================================================== */
const SectionHeader = ({ title, subtitle, actionLabel, onAction, right }) => (
  <div className="flex items-start justify-between gap-3 mb-4">
    <div className="min-w-0">
      <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {right}
    {actionLabel && (
      <button
        type="button"
        onClick={onAction}
        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

/* ==========================================================================
   ADMIN DASHBOARD
   ========================================================================== */
const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const monthOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return { value: toMonthKey(d), label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
    });
  }, []);
  const currentMonthKey = monthOptions[0].value;

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [showingTodayAppts, setShowingTodayAppts] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);

  // Month-dependent KPIs
  useEffect(() => {
    let cancelled = false;
    getDashboardStatsApi({ month: selectedMonth })
      .then((res) => !cancelled && setStats(res.data?.data || null))
      .catch((err) => console.error('Error fetching dashboard stats:', err));
    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

  // Lists (independent of selected month)
  useEffect(() => {
    const loadLists = async () => {
      const todayKey = toLocalDateKey(new Date());
      const [todayRes, invRes, patientsRes, docPerfRes] = await Promise.all([
        getAppointmentsApi({ date: todayKey }).catch(() => ({ data: { data: [] } })),
        getInvoicesApi({ limit: 5 }).catch(() => ({ data: { data: [] } })),
        getPatientsApi({ limit: 5 }).catch(() => ({ data: { data: [] } })),
        getDoctorPerformanceReportApi().catch(() => ({ data: { data: [] } }))
      ]);

      let appts = todayRes.data?.data || [];
      if (appts.length === 0) {
        // Nothing booked today: fall back to the most recent appointments
        const allRes = await getAppointmentsApi().catch(() => ({ data: { data: [] } }));
        appts = [...(allRes.data?.data || [])]
          .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))
          .slice(0, 4);
        setShowingTodayAppts(false);
      } else {
        setShowingTodayAppts(true);
      }

      setAppointments(appts);
      setInvoices(invRes.data?.data || []);
      setPatients(patientsRes.data?.data || []);
      setDoctorsList(docPerfRes.data?.data || []);
    };
    loadLists().catch((err) => console.error('Error fetching dashboard lists:', err));
  }, []);

  // ── Live metrics ──
  const totalPatients = stats?.patients?.total ?? 0;
  const monthPatients = stats?.patients?.month ?? 0;
  const newPatients30d = stats?.patients?.newPatients ?? 0;
  const returningPatients = stats?.patients?.returningPatients ?? Math.max(0, totalPatients - newPatients30d);
  const todayAppts = stats?.appointments?.today ?? 0;
  const totalAppts = stats?.appointments?.total ?? 0;
  const totalRevenue = stats?.financials?.totalRevenue ?? 0;
  const monthRevenue = stats?.financials?.monthRevenue ?? 0;
  const outstanding = stats?.financials?.totalOutstanding ?? 0;
  const unpaidCount = stats?.financials?.unpaidInvoicesCount ?? 0;

  const isCurrentMonth = selectedMonth === currentMonthKey;
  const monthWord = isCurrentMonth
    ? 'this month'
    : `in ${monthOptions.find((o) => o.value === selectedMonth)?.label.split(' ')[0]}`;

  // Last 7 days of collected revenue
  const revenueSeries = useMemo(() => {
    const daily = stats?.dailyRevenue || [];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i));
      const key = toLocalDateKey(d);
      const match = daily.find((item) => item._id === key);
      return {
        key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        total: match?.total || 0
      };
    });
  }, [stats]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Welcome back, {user?.full_name || user?.username || 'Administrator'}
          </p>
        </div>
        <MonthSelector value={selectedMonth} options={monthOptions} onChange={setSelectedMonth} />
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          icon={Users}
          color="blue"
          label="Total Patients"
          value={totalPatients.toLocaleString()}
          footer={`${monthPatients} new ${monthWord}`}
          onClick={() => navigate('/patients')}
        />
        <StatCard
          icon={CalendarDays}
          color="emerald"
          label="Today Appointments"
          value={todayAppts.toLocaleString()}
          footer={`${totalAppts} total booked`}
          onClick={() => navigate('/appointments')}
        />
        <StatCard
          icon={DollarSign}
          color="violet"
          label="Total Revenue"
          value={formatMoney(totalRevenue)}
          footer={`${formatMoney(monthRevenue)} ${monthWord}`}
          onClick={() => navigate('/billing')}
        />
        <StatCard
          icon={CreditCard}
          color="amber"
          label="Pending Payments"
          value={formatMoney(outstanding)}
          footer={`${unpaidCount} unpaid invoice${unpaidCount === 1 ? '' : 's'}`}
          onClick={() => navigate('/billing')}
        />
        <StatCard
          icon={UserPlus}
          color="sky"
          label="New Patients"
          value={monthPatients.toLocaleString()}
          footer={`registered ${monthWord}`}
          onClick={() => navigate('/patients')}
        />
      </div>

      {/* ── Appointments · Revenue · Patient overview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Today's appointments */}
        <div className={`${CARD_CLASS} p-5 lg:col-span-4`}>
          <SectionHeader
            title={showingTodayAppts ? "Today's Appointments" : 'Recent Appointments'}
            actionLabel="View all"
            onAction={() => navigate('/appointments')}
          />

          {appointments.length === 0 ? (
            <p className="text-center py-10 text-sm text-slate-400 dark:text-slate-500">No appointments yet.</p>
          ) : (
            <ul className="space-y-1">
              {appointments.slice(0, 4).map((a, idx) => {
                const name = a.patient_id?.name || 'Patient';
                return (
                  <li
                    key={a._id || idx}
                    className="flex items-center gap-3 py-2.5 px-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <span className="w-[68px] shrink-0 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {formatApptTime(a.appointment_time)}
                    </span>
                    <span className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{a.reason || '—'}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                        APPT_STATUS_STYLES[a.status] || APPT_STATUS_STYLES.Scheduled
                      }`}
                    >
                      {a.status || 'Scheduled'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Revenue overview */}
        <div className={`${CARD_CLASS} p-5 lg:col-span-5`}>
          <SectionHeader
            title="Revenue Overview"
            subtitle="Live 7-day payment collection trajectory"
            right={
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold whitespace-nowrap shrink-0">
                {formatMoney(monthRevenue, 2)} ({isCurrentMonth ? 'This Month' : monthOptions.find((o) => o.value === selectedMonth)?.label})
              </span>
            }
          />
          <RevenueLineChart data={revenueSeries} />
        </div>

        {/* Patient overview */}
        <div className={`${CARD_CLASS} p-5 lg:col-span-3 flex flex-col`}>
          <SectionHeader title="Patient Overview" />
          <PatientOverviewDonut total={totalPatients} newCount={newPatients30d} returningCount={returningPatients} />
        </div>
      </div>

      {/* ── Transactions · Specialists · Recent patients ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent transactions */}
        <div className={`${CARD_CLASS} p-5 lg:col-span-4`}>
          <SectionHeader title="Recent Transactions" actionLabel="View all" onAction={() => navigate('/billing')} />
          {invoices.length === 0 ? (
            <p className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">No invoices recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.slice(0, 5).map((inv, idx) => {
                const paid = inv.status === 'Paid';
                return (
                  <li key={inv._id || idx} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{inv.patient_id?.name || 'Patient'}</p>
                      <p className="text-[11px] font-mono text-slate-400">{inv.invoice_number || `INV-${idx + 1}`}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{formatMoney(inv.total_amount, 2)}</p>
                      <span
                        className={`text-[11px] font-bold ${
                          paid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {inv.status || 'Pending'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Attending specialists */}
        <div className={`${CARD_CLASS} p-5 lg:col-span-4`}>
          <SectionHeader title="Top Specialists" actionLabel="View all" onAction={() => navigate('/doctors')} />
          {doctorsList.length === 0 ? (
            <p className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">No specialist records found.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {doctorsList.slice(0, 5).map((doc, idx) => (
                <li key={doc.doctorId || idx} className="flex items-center gap-3 py-2.5">
                  <span className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-300 text-xs font-bold flex items-center justify-center shrink-0">
                    {(doc.name || 'D').charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{doc.name || 'Specialist'}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {doc.specialization || 'Dentistry'} · {doc.patientsSeen || doc.proceduresCount || 0} patients
                    </p>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white shrink-0">
                    {formatMoney(doc.treatmentRevenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent patients */}
        <div className={`${CARD_CLASS} p-5 lg:col-span-4`}>
          <SectionHeader title="Recent Patients" actionLabel="View all" onAction={() => navigate('/patients')} />
          {patients.length === 0 ? (
            <p className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">No patients recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {patients.slice(0, 5).map((p, idx) => (
                <li key={p._id || idx} className="flex items-center gap-3 py-2.5">
                  <span className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">
                    {(p.name || 'P').charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{p.name || 'Patient'}</p>
                    <p className="text-[11px] font-mono text-slate-400 truncate">
                      {p.patient_number || `P-${idx + 1}`}
                      {p.telephone ? ` · ${p.telephone}` : ''}
                    </p>
                  </div>
                  {p.gender && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      {p.gender}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   ROLE ROUTER — doctors keep their dedicated dashboard
   ========================================================================== */
const Dashboard = () => {
  const { user } = useAuth();
  if (user?.role === 'Doctor') return <DoctorDashboard />;
  return <AdminDashboard />;
};

export default Dashboard;
