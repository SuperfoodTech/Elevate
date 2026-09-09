import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Store,
  SlidersHorizontal,
  CircleDollarSign,
  FileBarChart,
  CreditCard,
  Bot,
  LayoutGrid,
  BadgePercent,
  FileCheck,
  PenTool,
  CloudUpload,
  KeyRound,
  UserCheck,
  FileText,
  History,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItemConfig {
  name: string;
  path: string;
  aliases?: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const coreNavItems: NavItemConfig[] = [
  { name: 'Home', path: '/dashboard', aliases: ['/'], icon: Home },
  { name: 'Owners', path: '/owners', aliases: ['/modules/owner'], icon: Users },
  { name: 'Outlets', path: '/outlets', aliases: ['/modules/outlet'], icon: Store },
  {
    name: 'Transactions',
    path: '/transactions',
    aliases: ['/order-sukses-vs-batal', '/laporan-jam-ramai', '/modules/transaction'],
    icon: SlidersHorizontal
  },
  {
    name: 'Settlement',
    path: '/settlement',
    aliases: ['/performa-comparison', '/modules/settlement'],
    icon: CircleDollarSign
  },
  {
    name: 'Reports',
    path: '/reports',
    aliases: ['/rangkuman', '/laporan-performa', '/modules/report'],
    icon: FileBarChart
  },
  {
    name: 'Payments',
    path: '/payments',
    aliases: ['/rekap-tagihan-billing', '/modules/billing', '/modules/disbursement', '/modules/reconciliation', '/modules/account-receivable'],
    icon: CreditCard
  }
];

const operationsNavItems: NavItemConfig[] = [
  { name: 'Bot Operations', path: '/operations/bot', aliases: ['/modules/bot'], icon: Bot },
  { name: 'Menu', path: '/operations/menu', aliases: ['/modules/menu'], icon: LayoutGrid },
  { name: 'Promo', path: '/operations/promo', aliases: ['/modules/promo'], icon: BadgePercent },
  { name: 'KKS', path: '/operations/kks', aliases: ['/modules/kks'], icon: FileCheck },
  { name: 'E-Sign & Proposal', path: '/operations/esign-proposal', aliases: ['/modules/proposal'], icon: PenTool }
];

const systemNavItems: NavItemConfig[] = [
  { name: 'Data Ingestion', path: '/system/data-ingestion', aliases: ['/modules/data-ingestion'], icon: CloudUpload },
  { name: 'Credentials', path: '/system/credentials', aliases: ['/modules/credentials'], icon: KeyRound },
  { name: 'Users & Roles', path: '/system/users-roles', aliases: ['/modules/users-roles'], icon: UserCheck },
  { name: 'Documents', path: '/system/documents', aliases: ['/modules/documents'], icon: FileText },
  { name: 'Activity Log', path: '/system/activity-log', aliases: ['/modules/activity-log'], icon: History },
  { name: 'System Settings', path: '/system/settings', aliases: ['/modules/settings', '/modules/system-health'], icon: Settings }
];

export const AppSidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse
}) => {
  const location = useLocation();

  const isItemActive = (item: NavItemConfig) => {
    if (location.pathname === item.path) return true;
    if (item.aliases && item.aliases.includes(location.pathname)) return true;
    return false;
  };

  const getItemClassName = (isActive: boolean) => {
    const base =
      'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]';
    const state = isActive
      ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
      : 'text-[#4B5565] hover:bg-[#F8FAFC] hover:text-[#0F172A] font-medium';
    const collapseAlign = collapsed ? 'justify-center px-0' : '';
    return `${base} ${state} ${collapseAlign}`;
  };

  const getIconClassName = (isActive: boolean) => {
    return `w-4 h-4 flex-shrink-0 stroke-[1.8] ${
      isActive ? 'text-[#2563EB]' : 'text-[#64748B]'
    }`;
  };

  return (
    <aside
      className={`bg-white border-r border-[#EBEBEF] h-screen sticky top-0 flex flex-col justify-between transition-all duration-200 ease-in-out select-none z-30 ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
      aria-label="Sidebar Navigasi"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center px-5 border-b border-[#F1F5F9] ${
            collapsed ? 'justify-center px-0' : 'gap-3'
          }`}
        >
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M6 10C6 7.79086 7.79086 6 10 6H17C21.4183 6 25 9.58172 25 14C25 18.4183 21.4183 22 17 22H12V26H6V10Z"
                fill="#2563EB"
              />
              <path
                d="M12 11H16.5C18.433 11 20 12.567 20 14.5C20 16.433 18.433 18 16.5 18H12V11Z"
                fill="white"
              />
              <circle cx="23" cy="23" r="3.5" fill="#60A5FA" />
            </svg>
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[17px] font-bold text-[#0F172A] tracking-tight leading-tight">
                Elevate
              </span>
              <span className="text-[11px] text-[#64748B] font-normal leading-tight">
                by FoodMaster
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-4">
          {/* Core Navigation Items (Flat list) */}
          <div className="space-y-0.5">
            {coreNavItems.map(item => {
              const Icon = item.icon;
              const active = isItemActive(item);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.name : undefined}
                  className={getItemClassName(active)}
                >
                  <Icon className={getIconClassName(active)} />
                  {!collapsed && <span>{item.name}</span>}
                </NavLink>
              );
            })}
          </div>

          {/* OPERATIONS Section */}
          <div className="pt-2">
            {!collapsed ? (
              <div className="px-3.5 pb-1.5 text-[11px] font-semibold text-[#94A3B8] tracking-wider uppercase">
                OPERATIONS
              </div>
            ) : (
              <div className="w-8 h-[1px] bg-[#E2E8F0] mx-auto my-2" />
            )}
            <div className="space-y-0.5">
              {operationsNavItems.map(item => {
                const Icon = item.icon;
                const active = isItemActive(item);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.name : undefined}
                    className={getItemClassName(active)}
                  >
                    <Icon className={getIconClassName(active)} />
                    {!collapsed && <span>{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* SYSTEM Section */}
          <div className="pt-2">
            {!collapsed ? (
              <div className="px-3.5 pb-1.5 text-[11px] font-semibold text-[#94A3B8] tracking-wider uppercase">
                SYSTEM
              </div>
            ) : (
              <div className="w-8 h-[1px] bg-[#E2E8F0] mx-auto my-2" />
            )}
            <div className="space-y-0.5">
              {systemNavItems.map(item => {
                const Icon = item.icon;
                const active = isItemActive(item);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.name : undefined}
                    className={getItemClassName(active)}
                  >
                    <Icon className={getIconClassName(active)} />
                    {!collapsed && <span>{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Operator Profile Card Footer */}
      <div className="p-3 border-t border-[#F1F5F9] bg-white sticky bottom-0">
        <div
          className={`flex items-center justify-between p-2 rounded-xl hover:bg-[#F8FAFC] transition-colors group ${
            collapsed ? 'justify-center p-1' : ''
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shrink-0 tracking-wider shadow-sm"
              title={collapsed ? 'Operations PIC (PIC)' : undefined}
            >
              OP
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold text-[#0F172A] leading-tight truncate">
                  Operations PIC
                </span>
                <span className="text-[11px] text-[#64748B] font-medium leading-tight">
                  PIC
                </span>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="flex items-center gap-1">
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Collapse sidebar"
                  className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded transition-colors"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
            </div>
          )}

          {collapsed && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              className="hidden group-hover:flex absolute right-1 p-1 bg-white border border-gray-200 rounded shadow-sm"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
