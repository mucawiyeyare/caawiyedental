import React, { useState, useEffect, useRef } from 'react';
import {
  getTenantsApi,
  createTenantApi,
  updateTenantApi,
  changeTenantStatusApi,
  deleteTenantApi,
  getPlatformStatsApi,
  getTenantFeaturesApi,
  updateTenantFeaturesApi
} from '../../api/endpoints.js';
import {
  Building2,
  Plus,
  Shield,
  CheckCircle2,
  XCircle,
  Trash2,
  Sliders,
  Edit,
  Eye,
  Users,
  Search,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Palette,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Layers,
  Activity
} from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';

const MODULES_LIST = [
  { key: 'patients', label: 'Patients & History', desc: 'Patient records & clinical file' },
  { key: 'appointments', label: 'Appointments', desc: 'Scheduling & calendar booking' },
  { key: 'visits', label: 'Visits & Queue', desc: 'Patient flow & reception queue' },
  { key: 'consultations', label: 'Doctor Consultations', desc: 'Clinical consultation notes' },
  { key: 'treatments', label: 'Dental Treatments', desc: 'Procedures, tooth chart & plans' },
  { key: 'services', label: 'Dental Services', desc: 'Service price catalog' },
  { key: 'billing', label: 'Billing & Invoices', desc: 'Invoice management & items' },
  { key: 'payments', label: 'Cashier & Receipts', desc: 'Payment collection & receipts' },
  { key: 'pharmacy', label: 'Pharmacy & Medicines', desc: 'Prescription dispensing' },
  { key: 'lab', label: 'Laboratory Module', desc: 'Lab orders, test sessions & results' },
  { key: 'inventory', label: 'Dental Inventory', desc: 'Materials, tools & usage track' },
  { key: 'expenses', label: 'Expenses', desc: 'Operational cost tracking' },
  { key: 'employees', label: 'Employees Directory', desc: 'Staff directory & profiles' },
  { key: 'reports', label: 'Reports & Analytics', desc: 'Financial & clinical reporting' },
  { key: 'audit_logs', label: 'Audit Logs', desc: 'Clinic security & event history' },
  { key: 'settings', label: 'Settings', desc: 'Clinic profile & fees customization' }
];

const TenantsList = () => {
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const logoInputRef = useRef(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    slug: '',
    logo: null,
    status: 'Active',
    phone: '',
    email: '',
    address: '',
    website: '',
    primary_color: '#1a56db',
    secondary_color: '#0d1f4c',
    tagline: 'Professional Dental Care',
    currency: 'USD',
    currency_symbol: '$',
    subscription_plan: 'Professional',
    admin_username: '',
    admin_password: '',
    admin_full_name: '',
    admin_email: ''
  });

  const [featureMap, setFeatureMap] = useState({});
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, statsRes] = await Promise.all([
        getTenantsApi(),
        getPlatformStatsApi()
      ]);
      if (tenantsRes.data.success) {
        setTenants(tenantsRes.data.data);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error('Error loading tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      display_name: '',
      slug: '',
      logo: null,
      phone: '',
      email: '',
      address: '',
      website: '',
      primary_color: '#1a56db',
      secondary_color: '#0d1f4c',
      tagline: 'Professional Dental Care',
      currency: 'USD',
      currency_symbol: '$',
      subscription_plan: 'Professional',
      admin_username: '',
      admin_password: '',
      admin_full_name: '',
      admin_email: ''
    });
    setErrorMsg('');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name || '',
      display_name: tenant.display_name || '',
      slug: tenant.slug || '',
      logo: tenant.logo || null,
      status: tenant.status || 'Active',
      phone: tenant.phone || '',
      email: tenant.email || '',
      address: tenant.address || '',
      website: tenant.website || '',
      primary_color: tenant.primary_color || '#1a56db',
      secondary_color: tenant.secondary_color || '#0d1f4c',
      tagline: tenant.tagline || 'Professional Dental Care',
      currency: tenant.currency || 'USD',
      currency_symbol: tenant.currency_symbol || '$',
      subscription_plan: tenant.subscription_plan || 'Professional'
    });
    setErrorMsg('');
    setIsEditOpen(true);
  };

  const handleLogoUploadForAdmin = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const maxDim = 512;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        setFormData(prev => ({ ...prev, logo: canvas.toDataURL('image/png', 0.92) }));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleOpenFeatures = async (tenant) => {
    setSelectedTenant(tenant);
    setIsFeaturesOpen(true);
    try {
      const res = await getTenantFeaturesApi(tenant._id);
      if (res.data.success) {
        const map = {};
        MODULES_LIST.forEach(m => {
          map[m.key] = true; // default
        });
        res.data.data.forEach(item => {
          map[item.module_key] = item.enabled;
        });
        setFeatureMap(map);
      }
    } catch (err) {
      console.error('Error fetching features:', err);
    }
  };

  const handleToggleStatus = async (tenant) => {
    const isCurrentlyActive = tenant.status === 'Active';
    const nextStatus = isCurrentlyActive ? 'Suspended' : 'Active';
    const confirmMessage = isCurrentlyActive
      ? `Are you sure you want to SUSPEND "${tenant.name}"?\n\nWarning: All staff members from "${tenant.name}" will be blocked from logging in until reactivated.`
      : `Are you sure you want to ACTIVATE "${tenant.name}"?\n\nClinic staff members will be able to log in immediately.`;

    if (!window.confirm(confirmMessage)) return;
    try {
      const res = await changeTenantStatusApi(tenant._id, nextStatus);
      if (res.data.success) {
        setSuccessMsg(`"${tenant.name}" is now ${nextStatus}`);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteTenant = async (tenant) => {
    if (tenant.slug === 'snab-dental') {
      alert('Snab Dental MS is the primary system clinic with original migrated data and cannot be deleted.');
      return;
    }
    const confirmed = window.confirm(
      `⚠️ PERMANENT CLINIC DELETION\n\nAre you sure you want to permanently delete "${tenant.name}"?\n\nThis will completely remove:\n• Clinic profile and configuration\n• All staff user accounts associated with this clinic\n• All patients, appointments, visits, and clinical records\n• All billing, invoices, and payments\n\nThis action CANNOT be undone. Click OK to confirm deletion.`
    );
    if (!confirmed) return;

    try {
      const res = await deleteTenantApi(tenant._id);
      if (res.data.success) {
        setSuccessMsg(`Clinic "${tenant.name}" and all associated data deleted successfully.`);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete clinic');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await createTenantApi(formData);
      if (res.data.success) {
        setIsCreateOpen(false);
        setSuccessMsg(`Clinic "${formData.name}" registered successfully!`);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create clinic');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await updateTenantApi(selectedTenant._id, formData);
      if (res.data.success) {
        setIsEditOpen(false);
        setSuccessMsg(`Clinic "${formData.name}" updated successfully!`);
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update clinic');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveFeatures = async () => {
    setSavingFeatures(true);
    try {
      const res = await updateTenantFeaturesApi(selectedTenant._id, featureMap);
      if (res.data.success) {
        setIsFeaturesOpen(false);
        setSuccessMsg(`Features updated for "${selectedTenant.name}"`);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save features');
    } finally {
      setSavingFeatures(false);
    }
  };

  const filteredTenants = tenants.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.slug?.toLowerCase().includes(search.toLowerCase()) ||
    t.owner_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-white shadow-xl border border-slate-800">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-white shrink-0 shadow-inner">
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight">Dental Hub Platform Admin</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30 uppercase tracking-wider">
                Multitenant Core
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
              Centralized platform administration: manage all dental clinics, independent branding & feature entitlements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
          <button
            onClick={loadData}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition border border-slate-700 active:scale-95"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Clinic</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {successMsg && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800 text-xs">✕</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Clinics</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats?.totalTenants ?? tenants.length}</p>
          <span className="text-[10px] font-semibold text-blue-600 mt-0.5 block">Isolated Tenants</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Clinics</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {stats?.activeTenants ?? tenants.filter(t => t.status === 'Active').length}
          </p>
          <span className="text-[10px] font-semibold text-emerald-600 mt-0.5 block">Online & Operational</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Platform Users</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{stats?.totalUsers ?? '—'}</p>
          <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">Staff & Doctors across tenants</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Patient Records</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats?.totalPatients ?? '—'}</p>
          <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">Safely tenant-isolated</span>
        </div>
      </div>

      {/* Tenants Table Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Tenant Clinics Directory</h3>
            <p className="text-xs text-slate-400 mt-0.5">All registered clinics running on this Dental Hub deployment</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clinic name or slug..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase sm:hidden shrink-0 bg-slate-100 px-2 py-1 rounded-lg">
              Swipe →
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto momentum-scroll">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">Clinic Name & Slug</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Brand Colors</th>
                <th className="py-3 px-4">Stats</th>
                <th className="py-3 px-4">Enabled Modules</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 text-xs">
                    {loading ? 'Loading clinics...' : 'No clinics found.'}
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0 shadow-sm overflow-hidden"
                          style={{ backgroundColor: t.primary_color || '#1a56db' }}
                        >
                          {t.logo ? (
                            <img src={t.logo} alt={t.name} className="w-full h-full object-contain p-0.5 bg-white" />
                          ) : (
                            t.name ? t.name.charAt(0).toUpperCase() : 'C'
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                              /{t.slug}
                            </span>
                            {t.phone && (
                              <span className="text-[10px] text-slate-400">• {t.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          t.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.status === 'Suspended'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        {t.status}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-100">
                        {t.subscription_plan || 'Professional'}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-md border border-slate-200 shadow-2xs"
                          style={{ backgroundColor: t.primary_color || '#1a56db' }}
                          title={`Primary: ${t.primary_color}`}
                        />
                        <div
                          className="w-5 h-5 rounded-md border border-slate-200 shadow-2xs"
                          style={{ backgroundColor: t.secondary_color || '#0d1f4c' }}
                          title={`Secondary: ${t.secondary_color}`}
                        />
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-[11px] space-y-0.5 text-slate-600">
                        <p><strong className="text-slate-900">{t.stats?.patientCount ?? 0}</strong> Patients</p>
                        <p><strong className="text-slate-900">{t.stats?.userCount ?? 0}</strong> Users</p>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-xs">
                          {t.enabledModules?.length ?? 16}
                        </span>
                        <span className="text-[10px] text-slate-400">/ {MODULES_LIST.length} modules</span>
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Feature Switches Button */}
                        <button
                          onClick={() => handleOpenFeatures(t)}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition border border-purple-200 flex items-center gap-1 cursor-pointer"
                          title="Configure Module Features"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Features</span>
                        </button>

                        {/* Edit Branding */}
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                          title="Edit Clinic & Branding"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {/* Suspend / Activate */}
                        <button
                          onClick={() => handleToggleStatus(t)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            t.status === 'Active'
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                          title={t.status === 'Active' ? 'Click to Suspend this clinic' : 'Click to Activate this clinic'}
                        >
                          {t.status === 'Active' ? (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Suspend</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>

                        {/* Delete Clinic */}
                        {t.slug !== 'snab-dental' && (
                          <button
                            onClick={() => handleDeleteTenant(t)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition border border-rose-200 flex items-center gap-1 cursor-pointer"
                            title={`Permanently delete ${t.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE CLINIC MODAL ── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Clinic on Dental Hub"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="block font-bold text-blue-950">Immediate Activation:</strong>
              Newly registered clinics are set to <strong className="text-emerald-700">Active</strong> automatically upon creation. The clinic administrator account will be able to log in right away without requiring manual activation.
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Clinic Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  setFormData(prev => ({ ...prev, name, slug: prev.slug ? prev.slug : slug }));
                }}
                placeholder="e.g. Al Furat Dental Clinic"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Clinic Slug (URL Identifier) *</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().trim() })}
                placeholder="e.g. alfurat-dental"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Display Title / Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="e.g. Specialized Dental Care"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Subscription Plan</label>
              <select
                value={formData.subscription_plan}
                onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              >
                <option value="Free">Free Tier</option>
                <option value="Basic">Basic Plan</option>
                <option value="Professional">Professional Plan</option>
                <option value="Enterprise">Enterprise Plan</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Telephone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+252 61 ..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="info@clinic.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Physical Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Mogadishu Main Road, Somalia"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Brand Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Secondary Brand Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>

          {/* Initial Admin User */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Initial Clinic Administrator Account</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Admin Username *</label>
                <input
                  type="text"
                  required
                  value={formData.admin_username}
                  onChange={(e) => setFormData({ ...formData, admin_username: e.target.value })}
                  placeholder="e.g. alfurat_admin"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Admin Password *</label>
                <input
                  type="password"
                  required
                  value={formData.admin_password}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Admin Full Name</label>
                <input
                  type="text"
                  value={formData.admin_full_name}
                  onChange={(e) => setFormData({ ...formData, admin_full_name: e.target.value })}
                  placeholder="Dr. Ahmed Ali"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Admin Email</label>
                <input
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  placeholder="admin@clinic.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Creating Clinic...' : 'Register Clinic'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT CLINIC & BRANDING MODAL ── */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Clinic: ${selectedTenant?.name}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Clinic Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Slug</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().trim() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Telephone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            {/* Logo Customizer */}
            <div className="md:col-span-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="block font-bold text-slate-700">Clinic Logo (Optional)</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {formData.logo ? (
                    <img src={formData.logo} alt="Clinic Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold uppercase">No Logo</span>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/*"
                    onChange={handleLogoUploadForAdmin}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                    >
                      {formData.logo ? 'Change Logo' : 'Upload Logo'}
                    </button>
                    {formData.logo && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logo: null })}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs cursor-pointer"
                      >
                        Reset to Default (Null)
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">Leave null to use clinic initials in navigation.</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Clinic Account Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={`w-full px-3 py-2 border rounded-xl font-bold cursor-pointer ${
                  formData.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : formData.status === 'Suspended'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                <option value="Active">🟢 Active — Clinic is operational & staff can log in</option>
                <option value="Suspended">🟡 Suspended — Clinic access paused & staff logins blocked</option>
                <option value="Inactive">🔴 Inactive — Decommissioned</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODULE FEATURE MANAGEMENT MODAL ── */}
      <Modal
        isOpen={isFeaturesOpen}
        onClose={() => setIsFeaturesOpen(false)}
        title={`Feature Management: ${selectedTenant?.name}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-2xl">
            <p className="font-bold">Independent Module Entitlements</p>
            <p className="text-[11px] text-purple-700 mt-0.5">
              Enabling or disabling modules here takes effect immediately for <strong>{selectedTenant?.name}</strong>.
              It will never affect other clinics (e.g. Al Furat vs Snab).
              The backend rejects requests to disabled modules automatically, while preserving existing data.
            </p>
          </div>

          {/* Quick presets */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-700">All Modules ({MODULES_LIST.length})</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const allOn = {};
                  MODULES_LIST.forEach(m => { allOn[m.key] = true; });
                  setFeatureMap(allOn);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] transition"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={() => {
                  const coreOnly = {};
                  MODULES_LIST.forEach(m => {
                    coreOnly[m.key] = ['patients', 'appointments', 'visits'].includes(m.key);
                  });
                  setFeatureMap(coreOnly);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-[11px] transition"
              >
                Core Only
              </button>
            </div>
          </div>

          {/* Switches Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
            {MODULES_LIST.map((mod) => {
              const isEnabled = featureMap[mod.key] ?? true;
              return (
                <div
                  key={mod.key}
                  onClick={() => setFeatureMap(prev => ({ ...prev, [mod.key]: !isEnabled }))}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isEnabled
                      ? 'bg-blue-50/50 border-blue-200 hover:bg-blue-50'
                      : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 opacity-60'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className={`font-bold text-xs ${isEnabled ? 'text-blue-950' : 'text-slate-600'}`}>
                      {mod.label}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{mod.desc}</p>
                  </div>

                  <div className="shrink-0">
                    {isEnabled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 text-white font-bold text-[10px]">
                        <span>ON</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px]">
                        <span>OFF</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFeaturesOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveFeatures}
              disabled={savingFeatures}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm disabled:opacity-50"
            >
              {savingFeatures ? 'Saving Entitlements...' : 'Save Module Features'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TenantsList;

