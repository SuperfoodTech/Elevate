import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, AlertCircle, HelpCircle, X, Check } from 'lucide-react';
import { useAuth } from '../context/useAuth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Jika sudah terotentikasi, langsung arahkan ke tujuan atau /dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Alamat email wajib diisi.');
      return;
    }

    if (!password) {
      setErrorMessage('Kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password, rememberMe);
      if (!result.success) {
        setErrorMessage(result.error || 'Autentikasi gagal.');
        setLoading(false);
      } else {
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    } catch {
      setErrorMessage('Terjadi kendala pada sistem. Silakan coba beberapa saat lagi.');
      setLoading(false);
    }
  };

  const handleSelectDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#E0E7FF] selection:text-[#3730A3]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4F46E5] via-[#6366F1] to-[#38BDF8] flex items-center justify-center text-white shadow-sm shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
              <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v2H4V6zm0 5h16v2H4v-2zm0 5h16a2 2 0 01-2 2H6a2 2 0 01-2-2v-0z" />
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-wider text-[#0F172A] uppercase">
            Elevate
          </span>
        </div>

        <h1 className="mt-4 text-center text-xl font-bold text-[#0F172A] tracking-tight">
          Portal Operasional & Finansial
        </h1>
        <p className="mt-1 text-center text-sm text-[#64748B]">
          Masuk untuk mengelola data outlet, performa, dan rekonsiliasi billing
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-[#E2E8F0] rounded-xl shadow-xs">
          {/* Error Message Box */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] flex items-start gap-3 text-sm text-[#991B1B]"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#DC2626]" />
              <div className="flex-1 font-medium">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-[#991B1B] hover:text-[#7F1D1D] p-0.5 rounded transition-colors"
                aria-label="Tutup pesan peringatan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-[#334155] uppercase tracking-wider mb-1.5"
              >
                Email Perusahaan
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="nama@byfoodmaster.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[#334155] uppercase tracking-wider"
                >
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-xs text-[#4F46E5] hover:text-[#4338CA] font-medium transition-colors focus:outline-none focus:underline"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Masukkan kata sandi akun"
                  className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#475569] transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#CBD5E1] text-[#4F46E5] focus:ring-[#6366F1]"
                />
                <span className="text-xs text-[#475569] font-medium">
                  Ingat sesi di peramban ini
                </span>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4F46E5] disabled:opacity-60 disabled:cursor-not-allowed shadow-xs transition-colors"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Memverifikasi akun...</span>
                  </span>
                ) : (
                  <span>Masuk ke Portal</span>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="mt-8 pt-6 border-t border-[#F1F5F9]">
            <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2.5">
              Pilihan Akun Demo Cepat
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSelectDemoAccount('admin@byfoodmaster.com', 'elevate2026')}
                className="w-full text-left p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                    <span>Super Admin</span>
                    <span className="text-[10px] bg-[#E0E7FF] text-[#3730A3] px-1.5 py-0.5 rounded font-bold">
                      Akses Penuh
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B]">admin@byfoodmaster.com</div>
                </div>
                {email === 'admin@byfoodmaster.com' && (
                  <Check className="w-4 h-4 text-[#4F46E5] shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemoAccount('finance@byfoodmaster.com', 'elevate2026')}
                className="w-full text-left p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                    <span>Tim Finance</span>
                    <span className="text-[10px] bg-[#DCFCE7] text-[#166534] px-1.5 py-0.5 rounded font-bold">
                      Billing & Settlement
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B]">finance@byfoodmaster.com</div>
                </div>
                {email === 'finance@byfoodmaster.com' && (
                  <Check className="w-4 h-4 text-[#4F46E5] shrink-0" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[#94A3B8]">
          Elevate Business Portal v1.3.0 &middot; Hak Cipta SuperfoodTech
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div
          className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-help-title"
        >
          <div className="bg-white w-full max-w-sm rounded-xl border border-[#E2E8F0] shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#0F172A] font-semibold text-sm">
                <HelpCircle className="w-5 h-5 text-[#4F46E5]" />
                <span id="modal-help-title">Bantuan Pemulihan Akun</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded transition-colors"
                aria-label="Tutup dialog bantuan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[#475569] space-y-2 leading-relaxed">
              <p>
                Akses kredensial dikelola secara terpusat oleh Departemen IT & Keamanan Data SuperfoodTech.
              </p>
              <p>
                Jika Anda lupa kata sandi atau membutuhkan penyesuaian hak akses role, silakan hubungi kontak berikut:
              </p>
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1 font-mono text-[11px] text-[#0F172A]">
                <div>Email: it-support@superfoodtech.co.id</div>
                <div>Internal Ext: 104 (Operasional Pusat)</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] rounded-lg text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
