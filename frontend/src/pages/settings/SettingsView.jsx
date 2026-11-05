import React, { useState, useEffect, useRef } from 'react';
import { getSettingsApi, updateSettingsApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Settings,
  Save,
  CheckCircle,
  Building,
  DollarSign,
  Globe,
  Upload,
  Trash2,
  Image as ImageIcon,
  Camera,
  Building2,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';

const SettingsView = () => {
  const { tenant, updateTenantBranding } = useAuth();
  const fileInputRef = useRef(null);

  const [settings, setSettings] = useState({
    logo: null,
    clinic_name: '',
    tagline: 'Specialized Dental Care',
    phone: '',
    email: '',
    address: '',
    website: '',
    consultation_fee: 20,
    currency: 'USD',
    currency_symbol: '$',
    tooth_numbering_system: 'FDI (Two-digit notation)',
    tax_percentage: 0,
    // Preserve internal default color keys silently for backend compatibility
    primary_color: '#0f172a',
    secondary_color: '#0f172a',
    accent_color: '#64748b',
    banner_style: 'solid',
    dashboard_theme: 'monochrome',
    banner_text_color: '#ffffff',
    button_text_color: '#ffffff'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await getSettingsApi();
      if (res.data?.data) {
        const data = res.data.data;
        const tenantInfo = res.data.tenant || tenant || {};
        
        const currentLogo = data.logo !== undefined ? data.logo : (tenantInfo.logo || null);

        setSettings({
          ...data,
          logo: currentLogo,
          clinic_name: data.clinic_name || tenantInfo.name || '',
          tagline: data.tagline || tenantInfo.tagline || 'Specialized Dental Care',
          phone: data.phone || tenantInfo.phone || '',
          email: data.email || tenantInfo.email || '',
          address: data.address || tenantInfo.address || '',
          website: data.website || tenantInfo.website || '',
          consultation_fee: data.consultation_fee ?? 20,
          currency: data.currency || tenantInfo.currency || 'USD',
          currency_symbol: data.currency_symbol || tenantInfo.currency_symbol || '$',
          tooth_numbering_system: data.tooth_numbering_system || 'FDI (Two-digit notation)',
          tax_percentage: data.tax_percentage ?? 0,
          primary_color: data.primary_color || '#0f172a',
          secondary_color: data.secondary_color || '#0f172a',
          accent_color: data.accent_color || '#64748b',
          banner_style: data.banner_style || 'solid',
          dashboard_theme: data.dashboard_theme || 'monochrome',
          banner_text_color: data.banner_text_color || '#ffffff',
          button_text_color: data.button_text_color || '#ffffff'
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Helper to downscale and compress images to a high-quality lightweight PNG Data URL
   */
  const processImageFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
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
          resolve(canvas.toDataURL('image/png', 0.92));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file is too large. Maximum supported size is 5MB.');
      return;
    }

    try {
      const base64 = await processImageFile(file);
      setSettings(prev => ({ ...prev, logo: base64 }));
    } catch (err) {
      console.error('Image processing error:', err);
      alert('Could not process this image. Please try another image file.');
    }
  };

  const handleRemoveLogo = () => {
    setSettings(prev => ({ ...prev, logo: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      const payload = {
        ...settings,
        logo: settings.logo || null,
        consultation_fee: Number(settings.consultation_fee),
        tax_percentage: Number(settings.tax_percentage),
        sidebar_bg: '#0f172a'
      };
      await updateSettingsApi(payload);

      // Sync AuthContext so Sidebar, Topbar, and Dashboard update immediately
      updateTenantBranding({
        logo: settings.logo || null,
        name: settings.clinic_name,
        tagline: settings.tagline,
        primary_color: '#0f172a',
        secondary_color: '#0f172a',
        accent_color: '#64748b',
        banner_style: 'solid',
        dashboard_theme: 'monochrome',
        banner_text_color: '#ffffff',
        button_text_color: '#ffffff',
        sidebar_bg: '#0f172a'
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4500);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const clinicInitial = (settings.clinic_name || tenant?.name || 'C').charAt(0).toUpperCase();

  return (
    <div className="max-w-4xl space-y-6">
      
      {/* Hidden File Input for Logo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Header with Interactive Clinic Logo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Logo / Avatar click-to-change */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative group cursor-pointer shrink-0"
            title="Click to change your clinic logo"
          >
            {settings.logo ? (
              <img
                src={settings.logo}
                alt="Clinic Logo"
                className="w-14 h-14 rounded-2xl object-contain bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 shadow-xs transition group-hover:opacity-75"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xl shadow-xs transition group-hover:opacity-90 relative"
              >
                <span className="group-hover:hidden">{clinicInitial}</span>
                <Camera className="w-5 h-5 hidden group-hover:block" />
                <span className="text-[8px] font-bold tracking-tight opacity-75 group-hover:hidden uppercase">No Logo</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
              <Camera className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Clinic Profile & Settings</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                Clinic Details
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your clinic logo, identity, contact information, consultation fee, and operational configurations
            </p>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in shadow-xs">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>Clinic settings saved successfully! All views updated live.</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* ── 1. CLINIC LOGO CARD ── */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">1. Clinic Logo & Identity</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Your official logo appears across your dashboard, navigation, patient passes, invoices, and receipts.
              </p>
            </div>
            {settings.logo ? (
              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-[11px] font-bold rounded-full border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Custom Logo</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                Default (None)
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/80">
            {/* Visual Logo Preview */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group cursor-pointer"
              title="Click to choose a logo image"
            >
              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt="Clinic Logo Preview"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-center p-2">
                  <ImageIcon className="w-7 h-7 mb-1 stroke-1" />
                  <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400">No Logo</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition">
                Change
              </div>
            </div>

            {/* Actions & Instructions */}
            <div className="flex-1 space-y-2.5 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-white hover:bg-black hover:dark:bg-slate-100 active:scale-95 text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{settings.logo ? 'Change Logo Image' : 'Upload Clinic Logo'}</span>
                </button>

                {settings.logo && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-xs font-bold rounded-xl transition cursor-pointer"
                    title="Remove custom logo and reset to default"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Logo</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Recommended: Square PNG / SVG with transparent background (256x256 or 512x512). Max file size: 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* ── 2. CLINIC CONTACT & PROFILE DETAILS ── */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">2. Clinic Information & Contact</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Clinic Name *</label>
              <input
                type="text"
                required
                value={settings.clinic_name}
                onChange={(e) => setSettings({ ...settings, clinic_name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tagline / Motto</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Contact</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Website URL</label>
              <input
                type="text"
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                placeholder="https://yourclinic.com"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Physical Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              />
            </div>
          </div>
        </div>

        {/* ── 3. CLINICAL & FINANCIAL CONFIGURATIONS ── */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">3. Clinical & Financial Defaults</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Default Consultation Fee ({settings.currency_symbol || '$'}) *</label>
              <input
                type="number"
                required
                min="0"
                value={settings.consultation_fee}
                onChange={(e) => setSettings({ ...settings, consultation_fee: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Currency Code</label>
              <input
                type="text"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={settings.currency_symbol}
                onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-center font-mono text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900"
              />
            </div>
          </div>

          <div className="text-xs pt-2">
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tooth Numbering System Standard *</label>
            <select
              value={settings.tooth_numbering_system}
              onChange={(e) => setSettings({ ...settings, tooth_numbering_system: e.target.value })}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900"
            >
              <option value="FDI (Two-digit notation)">FDI (Two-digit notation: 11-18, 21-28, 31-38, 41-48) - International Standard</option>
              <option value="Universal (1-32)">Universal Numbering System (1 to 32) - USA Standard</option>
              <option value="Palmer Notation">Palmer Notation (Quadrant brackets)</option>
            </select>
          </div>
        </div>

        {/* ── SAVE ACTION ── */}
        <div className="flex items-center justify-between pt-2 pb-6 sm:pb-0">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            Changes apply in real time across all views
          </span>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 px-6 py-3.5 font-bold rounded-2xl shadow-xs transition cursor-pointer disabled:opacity-50 touch-target active:scale-95 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 hover:dark:bg-slate-100 text-xs sm:text-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Clinic Settings...' : 'Save Clinic Settings'}
          </button>
        </div>

      </form>

    </div>
  );
};

export default SettingsView;