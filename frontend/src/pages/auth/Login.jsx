import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePwa } from '../../context/PwaContext.jsx';
import {
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  Calendar,
  X,
  Download
} from 'lucide-react';

/* ==========================================================================
   TOOTH ICON WITH ORBITAL SWOOSH (Matches Reference Logo)
   ========================================================================== */
const SodmasLogo = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Tooth Molar Outline */}
    <path
      d="M32 20C21 20 17 28 17 38C17 53 23 66 27 80C29 86 33 89 37 89C42 89 43 81 45 73C47 65 53 65 55 73C57 81 58 89 63 89C67 89 71 86 73 80C77 66 83 53 83 38C83 28 79 20 68 20C59 20 54 26 50 26C46 26 41 20 32 20Z"
      stroke="#0284c7"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Orbital Swoop Ring around the tooth */}
    <ellipse
      cx="50"
      cy="53"
      rx="44"
      ry="14"
      transform="rotate(-18 50 53)"
      stroke="#0284c7"
      strokeWidth="4.5"
      strokeLinecap="round"
    />
  </svg>
);

/* ==========================================================================
   MINI OUTLINE TOOTH ICON (For Feature & Bottom Banner)
   ========================================================================== */
const ToothIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 3C4.5 3 3.5 5 3.5 7.5C3.5 11 5 14 6 17C6.5 18.5 7.5 19 8.5 19C9.5 19 9.8 17 10.2 15C10.7 13 13.3 13 13.8 15C14.2 17 14.5 19 15.5 19C16.5 19 17.5 18.5 18 17C19 14 20.5 11 20.5 7.5C20.5 5 19.5 3 17 3C15 3 14 4.5 12 4.5C10 4.5 9 3 7 3Z" />
  </svg>
);

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { login } = useAuth();
  const { isInstalled, promptInstall } = usePwa();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(username, password);
    setLoading(false);

    if (res.success) {
      if (res.user?.is_super_admin || res.user?.role === 'Super Admin') {
        navigate('/super-admin/tenants');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white font-sans relative overflow-x-hidden">
      
      {/* ==================================================================
          LEFT COLUMN: BRANDING & CLINICAL HERO (Full Height Full-Page Split)
          ================================================================== */}
      <div
        className="relative hidden md:flex md:w-1/2 lg:w-[52%] xl:w-[50%] min-h-screen flex-col justify-between p-8 sm:p-12 lg:p-16 xl:p-20 overflow-hidden bg-[#edf6fe]"
        style={{
          backgroundImage: "url('/dental-chair-clean.png')",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right bottom',
          backgroundSize: 'contain'
        }}
      >
        {/* Subtle Light Gradient Overlay on left for crisp readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#edf6fe] via-[#edf6fe]/85 to-transparent pointer-events-none" />

        {/* Top Logo & Slogan */}
        <div className="relative z-10 flex items-center gap-3.5">
          <SodmasLogo className="w-12 h-12 shrink-0 drop-shadow-xs" />
          <div>
            <h2 className="text-2xl font-black text-blue-600 tracking-tight leading-none">
              SODMAS
            </h2>
            <p className="text-xs text-slate-500 font-medium tracking-tight mt-1">
              Healthy Smiles, Brighter Tomorrow
            </p>
          </div>
        </div>

        {/* Middle: Headline, Description & 3 Feature Badges */}
        <div className="relative z-10 space-y-6 my-auto max-w-sm lg:max-w-md pt-6 pb-20">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 leading-[1.12] tracking-tight">
              Your Smile<br />
              <span className="text-slate-900">Our Priority</span>
            </h1>
            <p className="text-sm lg:text-base text-slate-600 font-medium mt-3 leading-relaxed">
              We provide modern dental care with compassion, technology and expertise.
            </p>
          </div>

          {/* 3 Feature Bullets */}
          <div className="space-y-3.5 pt-2">
            {/* Feature 1: Quality Care */}
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-blue-100/80 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                <ToothIcon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 leading-tight">Quality Care</p>
                <p className="text-xs text-slate-500 font-medium">For a healthier smile</p>
              </div>
            </div>

            {/* Feature 2: Trusted Professionals */}
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-blue-100/80 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 leading-tight">Trusted Professionals</p>
                <p className="text-xs text-slate-500 font-medium">Experienced & caring team</p>
              </div>
            </div>

            {/* Feature 3: Easy Appointments */}
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-full bg-blue-100/80 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                <Calendar className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 leading-tight">Easy Appointments</p>
                <p className="text-xs text-slate-500 font-medium">Save time, book online</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Wave Graphic with Mottos */}
        <div className="absolute bottom-0 left-0 right-0 w-full pointer-events-none z-10">
          <svg viewBox="0 0 500 140" preserveAspectRatio="none" className="w-full h-24 lg:h-32 block">
            {/* Background translucent lighter wave */}
            <path
              d="M 0,60 C 130,5 260,95 500,30 L 500,140 L 0,140 Z"
              fill="#38bdf8"
              fillOpacity="0.45"
            />
            {/* Foreground solid primary blue wave */}
            <path
              d="M 0,80 C 150,35 280,110 500,65 L 500,140 L 0,140 Z"
              fill="#0284c7"
            />
          </svg>
          {/* Wave Content: Tooth Outline & Text */}
          <div className="absolute bottom-4 left-8 lg:left-12 flex items-center gap-3 text-white">
            <ToothIcon className="w-5 h-5 text-white/95" />
            <div className="text-xs leading-tight font-medium text-white/95">
              <span className="block font-bold">Better Oral Health</span>
              <span className="italic text-[11px] text-white/85">for a Brighter Future</span>
            </div>
          </div>
        </div>

      </div>

      {/* ==================================================================
          RIGHT COLUMN: SIGN IN FORM (Clean, Minimal, Centered Full Height)
          ================================================================== */}
      <div className="w-full md:w-1/2 lg:w-[48%] xl:w-[50%] min-h-screen flex items-center justify-center p-6 sm:p-12 lg:p-16 xl:p-24 bg-white">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          
          {/* Mobile-Only Header Brand */}
          <div className="md:hidden flex items-center gap-3 mb-6">
            <SodmasLogo className="w-9 h-9 shrink-0" />
            <div>
              <span className="text-xl font-black text-blue-600">SODMAS</span>
              <p className="text-xs text-slate-400 font-medium">Healthy Smiles, Brighter Tomorrow</p>
            </div>
          </div>

          {/* Form Header */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-black text-slate-900 tracking-tight leading-tight">
              Welcome Back
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Sign in to your SODMAS account to continue
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            
            {/* Input: Email or Username */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4.5 h-4.5" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Email or Username"
                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium shadow-2xs"
                />
              </div>
            </div>

            {/* Input: Password with Eye Toggle */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-11 pr-11 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition"
              >
                Forgot password?
              </button>
            </div>

            {/* Primary Action Button: Sign In */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 sm:py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/25 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4.5 h-4.5 stroke-[2.5]" />
                </>
              )}
            </button>

            {/* PWA Install Button on Login */}
            {!isInstalled && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={promptInstall}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer border border-blue-200/80"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install SODMAS Application</span>
                </button>
              </div>
            )}

          </form>

        </div>
      </div>

      {/* ==================================================================
          MODAL: FORGOT PASSWORD
          ================================================================== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-sm">Password Recovery</span>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              For security in multi-tenant dental systems, password resets are handled by your <strong>Clinic Administrator</strong> or <strong>SODMAS Platform Super Admin</strong>.
            </p>
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl text-xs space-y-1">
              <p className="font-bold">Contact Support:</p>
              <p className="text-[11px]">Email: support@sodmas.org</p>
              <p className="text-[11px]">Phone: +252 61 2339093</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs cursor-pointer hover:bg-blue-700 transition"
            >
              Understood
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
