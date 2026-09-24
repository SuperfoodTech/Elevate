import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, Shield } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

interface HeaderTopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const HeaderTopbar: React.FC<HeaderTopbarProps> = ({ title, actions }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  // Inisial nama pengguna untuk avatar
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header className="h-16 bg-white border-b border-[#EBEBEF] px-8 flex items-center justify-between sticky top-0 z-20">
      <h1 className="text-sm font-semibold text-[#1A1A1F]">{title}</h1>

      <div className="flex items-center gap-4">
        {actions && <div className="flex items-center gap-3">{actions}</div>}

        {/* User Account Menu */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              className="flex items-center gap-2.5 pl-2 pr-1.5 py-1 rounded-lg border border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            >
              <div className="w-7 h-7 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-[#0F172A] leading-tight">
                  {user.name}
                </div>
                <div className="text-[10px] text-[#64748B] capitalize">{user.role}</div>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform duration-150 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 bg-white border border-[#E2E8F0] rounded-xl shadow-md py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-4 py-2.5 border-b border-[#F1F5F9]">
                  <div className="text-xs font-bold text-[#0F172A]">{user.name}</div>
                  <div className="text-[11px] text-[#64748B] truncate">{user.email}</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-[#4F46E5]" />
                    <span className="text-[10px] font-semibold text-[#4F46E5] bg-[#EEF2FF] px-1.5 py-0.5 rounded">
                      {user.title}
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar dari Portal</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
