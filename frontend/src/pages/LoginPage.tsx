import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User as UserIcon, Eye, EyeOff, AlertCircle, HelpCircle, X } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { SuperFoodMark } from '../components/common/SuperFoodLogo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Jika sudah terotentikasi, arahkan langsung ke halaman tujuan atau /dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMessage('Username wajib diisi.');
      return;
    }

    if (!password) {
      setErrorMessage('Kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(cleanUser, password, rememberMe);
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

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#E2E8F0] selection:text-[#0F172A]">
      <div className="sm:mx-auto sm:w-full sm:max-w-[400px]">
        {/* Brand Header with New SuperFood Analytics Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="p-2.5 rounded-xl bg-white border border-[#E4E4E7] shadow-xs flex items-center justify-center mb-3.5">
            <SuperFoodMark className="w-8 h-8" />
          </div>
          <div className="flex items-center gap-1.5 text-2xl font-bold tracking-tight text-[#0F172A]">
            <span>Analytics</span>
            <span className="font-normal text-[#64748B]">Dashboard</span>
          </div>
          <p className="mt-1.5 text-xs text-[#64748B]">
            Portal Operasional dan Rekonsiliasi Finansial
          </p>
        </div>

        {/* Card Form */}
        <div className="mt-7 bg-white border border-[#E4E4E7] rounded-xl p-6 sm:p-7 shadow-xs">
          {/* Error Notice */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] flex items-start gap-2.5 text-xs text-[#991B1B]"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#DC2626]" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-[#991B1B] hover:text-[#7F1D1D] p-0.5 rounded transition-colors"
                aria-label="Tutup pesan error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-medium text-[#334155] mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Masukkan username"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#D4D4D8] rounded-lg text-[#0F172A] placeholder-[#A1A1AA] focus:outline-none focus:ring-1 focus:ring-[#0F172A] focus:border-[#0F172A] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-[#334155]"
                >
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-xs text-[#64748B] hover:text-[#0F172A] transition-colors focus:outline-none focus:underline"
                >
                  Lupa sandi?
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
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-[#D4D4D8] rounded-lg text-[#0F172A] placeholder-[#A1A1AA] focus:outline-none focus:ring-1 focus:ring-[#0F172A] focus:border-[#0F172A] transition-colors"
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

            <div className="pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#D4D4D8] text-[#0F172A] focus:ring-[#0F172A]"
                />
                <span className="text-xs text-[#475569]">
                  Ingat sesi masuk
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 flex justify-center items-center py-2 px-4 rounded-lg text-sm font-medium text-white bg-[#0F172A] hover:bg-[#1E293B] active:bg-[#020617] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F172A] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
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
                    <span>Memverifikasi...</span>
                  </span>
                ) : (
                  <span>Masuk ke Portal</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-[#71717A]">
          SuperFoodTech &middot; Analytics Dashboard v1.3.1
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div
          className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-help-title"
        >
          <div className="bg-white w-full max-w-sm rounded-xl border border-[#E4E4E7] shadow-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#0F172A] font-semibold text-sm">
                <HelpCircle className="w-4 h-4 text-[#0F172A]" />
                <span id="modal-help-title">Bantuan Kredensial Akun</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-[#A1A1AA] hover:text-[#0F172A] p-1 rounded transition-colors"
                aria-label="Tutup dialog bantuan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[#475569] space-y-2 leading-relaxed">
              <p>
                Kredensial akun dikelola oleh tim IT SuperfoodTech.
              </p>
              <p>
                Jika Anda lupa kata sandi atau memerlukan akun baru, hubungi administrator:
              </p>
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1 font-mono text-[11px] text-[#0F172A]">
                <div>Email: it-support@superfoodtech.co.id</div>
                <div>Ext: 104 (Operasional Pusat)</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-3.5 py-1.5 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] rounded-lg text-xs font-medium transition-colors"
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
