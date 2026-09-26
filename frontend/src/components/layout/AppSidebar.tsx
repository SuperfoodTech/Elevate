import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Building2,
  Store,
  Layers,
  SlidersHorizontal,
  CircleDollarSign,
  Receipt,
  ArrowUpRight,
  Scale,
  ArrowDownLeft,
  Calendar,
  CalendarRange,
  Bot,
  LayoutGrid,
  BadgePercent,
  FileCheck,
  PenTool,
  Settings,
  Activity,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { SuperFoodLogo, SuperFoodMark } from '../common/SuperFoodLogo';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface SubNavItemConfig {
  name: string;
  path: string;
  aliases?: string[];
}

interface NavItemConfig {
  name: string;
  path: string;
  aliases?: string[];
  icon: React.ComponentType<{ className?: string }>;
  isExternal?: boolean;
  target?: string;
  hasSubmenu?: boolean;
  subItems?: SubNavItemConfig[];
}

interface NavSectionConfig {
  title: string;
  items: NavItemConfig[];
}

const homeNavItem: NavItemConfig = {
  name: 'Home',
  path: '/dashboard',
  aliases: ['/'],
  icon: Home
};

const navSections: NavSectionConfig[] = [
  {
    title: 'MERCHANT',
    items: [
      { name: 'Owner', path: '/owners', aliases: ['/modules/owner'], icon: Users },
      { name: 'Brand', path: '/brands', aliases: ['/modules/brand'], icon: Building2 },
      { name: 'Outlet', path: '/outlets', aliases: ['/modules/outlet'], icon: Store },
      { name: 'Listing', path: '/listings', aliases: ['/modules/listing'], icon: Layers }
    ]
  },
  {
    title: 'OPERATIONS',
    items: [
      {
        name: 'Transaction',
        path: '/transactions',
        aliases: [
          '/order-sukses-vs-batal',
          '/laporan-jam-ramai',
          '/modules/transaction',
          '/vb/transactions',
          '/vb'
        ],
        icon: SlidersHorizontal,
        hasSubmenu: true,
        subItems: [
          {
            name: 'Agency',
            path: '/transactions?tab=agency',
            aliases: ['/transactions']
          },
          {
            name: 'Virtual Brand',
            path: '/transactions?tab=vb',
            aliases: ['/vb', '/vb/transactions']
          }
        ]
      },
      {
        name: 'Settlement',
        path: '/settlement',
        aliases: ['/performa-comparison', '/modules/settlement', '/vb/settlement'],
        icon: CircleDollarSign
      }
    ]
  },
  {
    title: 'FINANCE',
    items: [
      {
        name: 'Billing',
        path: '/payments',
        aliases: ['/rekap-tagihan-billing', '/finance/billing', '/modules/billing'],
        icon: Receipt
      },
      {
        name: 'Disbursement',
        path: '/finance/disbursement',
        aliases: ['/modules/disbursement'],
        icon: ArrowUpRight
      },
      {
        name: 'Reconciliation',
        path: '/finance/reconciliation',
        aliases: ['/modules/reconciliation'],
        icon: Scale
      },
      {
        name: 'Account Receivable',
        path: '/finance/account-receivable',
        aliases: ['/modules/account-receivable'],
        icon: ArrowDownLeft
      }
    ]
  },
  {
    title: 'REPORT',
    items: [
      {
        name: 'Weekly Report',
        path: '/reports',
        aliases: ['/reports/weekly', '/laporan-performa', '/rangkuman', '/modules/report'],
        icon: Calendar
      },
      {
        name: 'Monthly Report',
        path: '/reports/monthly',
        aliases: ['/modules/monthly-report'],
        icon: CalendarRange
      }
    ]
  },
  {
    title: 'TOOLS',
    items: [
      {
        name: 'Bot',
        path: 'https://bot.byfoodmaster.com',
        aliases: ['/tools/bot', '/operations/bot', '/modules/bot'],
        icon: Bot,
        isExternal: true
      },
      {
        name: 'Menu',
        path: 'https://menu.byfoodmaster.com',
        aliases: ['/tools/menu', '/operations/menu', '/modules/menu'],
        icon: LayoutGrid,
        isExternal: true
      },
      {
        name: 'Promo',
        path: '/operations/promo',
        aliases: ['/tools/promo', '/modules/promo'],
        icon: BadgePercent
      }
    ]
  },
  {
    title: 'DOCUMENTS',
    items: [
      {
        name: 'KKS',
        path: '/operations/kks',
        aliases: ['/documents/kks', '/modules/kks'],
        icon: FileCheck
      },
      {
        name: 'Proposal',
        path: '/operations/esign-proposal',
        aliases: ['/documents/proposal', '/modules/proposal'],
        icon: PenTool
      }
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      {
        name: 'Settings',
        path: '/system/settings',
        aliases: ['/modules/settings'],
        icon: Settings
      },
      {
        name: 'System Health',
        path: '/system/system-health',
        aliases: ['/modules/system-health', '/system/health'],
        icon: Activity
      }
    ]
  }
];

export const AppSidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const [expandedMenus, setExpandedMenus] = React.useState<Record<string, boolean>>(() => {
    const isTx = location.pathname === '/transactions' || location.pathname.startsWith('/vb');
    return {
      Transaction: isTx
    };
  });

  React.useEffect(() => {
    if (location.pathname === '/transactions' || location.pathname.startsWith('/vb')) {
      setExpandedMenus((prev) => ({ ...prev, Transaction: true }));
    }
  }, [location.pathname]);

  const toggleSubmenu = (name: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const isSubItemActive = (subItem: SubNavItemConfig) => {
    const currentTab = new URLSearchParams(location.search).get('tab');
    if (subItem.path.includes('tab=vb')) {
      return (
        (location.pathname === '/transactions' && currentTab === 'vb') ||
        location.pathname.startsWith('/vb')
      );
    }
    if (subItem.path.includes('tab=agency')) {
      return (
        location.pathname === '/transactions' &&
        (currentTab === 'agency' || !currentTab)
      );
    }
    return false;
  };

  const isItemActive = (item: NavItemConfig) => {
    if (location.pathname === item.path) return true;
    if (item.path !== '/' && item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/')) return true;
    if (item.aliases && item.aliases.some(alias => location.pathname === alias || location.pathname.startsWith(alias + '/'))) return true;
    return false;
  };

  const getItemClassName = (isActive: boolean, isHome: boolean = false) => {
    const base =
      'group flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E56CF]';
    
    let state = '';
    if (isActive) {
      if (isHome) {
        state = 'bg-[#F4EFFE] text-[#6E56CF] font-semibold';
      } else {
        state = 'bg-[#F4EFFE] text-[#6E56CF] font-semibold';
      }
    } else {
      state = 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] font-medium';
    }

    const collapseAlign = collapsed ? 'justify-center px-0' : '';
    return `${base} ${state} ${collapseAlign}`;
  };

  const getIconClassName = (isActive: boolean) => {
    return `w-4 h-4 flex-shrink-0 stroke-[1.8] ${
      isActive ? 'text-[#6E56CF]' : 'text-[#64748B] group-hover:text-[#0F172A]'
    }`;
  };

  return (
    <aside
      className={`bg-white border-r border-[#EBEBEF] h-screen sticky top-0 flex flex-col justify-between transition-all duration-200 ease-in-out select-none z-30 ${
        collapsed ? 'w-[72px]' : 'w-60'
      }`}
      aria-label="Sidebar Navigasi"
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center px-4 border-b border-[#F1F5F9] ${
            collapsed ? 'justify-center px-0' : 'gap-2.5'
          }`}
        >
          {collapsed ? (
            <SuperFoodMark className="w-6 h-6" />
          ) : (
            <SuperFoodLogo size="md" />
          )}
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-3 scrollbar-thin">
          {/* Top Level: Home */}
          <div>
            <NavLink
              to={homeNavItem.path}
              title={collapsed ? homeNavItem.name : undefined}
              className={getItemClassName(isItemActive(homeNavItem), true)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Home className={getIconClassName(isItemActive(homeNavItem))} />
                {!collapsed && <span className="truncate">{homeNavItem.name}</span>}
              </div>
            </NavLink>
          </div>

          {/* Categorized Sections */}
          {navSections.map(section => (
            <div key={section.title} className="pt-1">
              {!collapsed ? (
                <div className="px-3 pb-1 text-[11px] font-bold text-[#94A3B8] tracking-wider uppercase">
                  {section.title}
                </div>
              ) : (
                <div className="w-6 h-[1px] bg-[#E2E8F0] mx-auto my-1.5" />
              )}

              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const active = isItemActive(item);

                  if (item.isExternal) {
                    return (
                      <a
                        key={item.path}
                        href={item.path}
                        target={item.target || '_blank'}
                        rel="noopener noreferrer"
                        title={collapsed ? item.name : undefined}
                        className={getItemClassName(active)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={getIconClassName(active)} />
                          {!collapsed && <span className="truncate">{item.name}</span>}
                        </div>
                      </a>
                    );
                  }

                  if (item.subItems) {
                    const isExpanded = !collapsed && !!expandedMenus[item.name];
                    return (
                      <div key={item.path} className="space-y-0.5">
                        <div className="flex items-center">
                          <NavLink
                            to={item.path}
                            title={collapsed ? item.name : undefined}
                            onClick={() => {
                              if (!isExpanded) {
                                setExpandedMenus((prev) => ({ ...prev, [item.name]: true }));
                              }
                            }}
                            className={`${getItemClassName(active)} flex-1`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon className={getIconClassName(active)} />
                              {!collapsed && <span className="truncate">{item.name}</span>}
                            </div>
                          </NavLink>

                          {!collapsed && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleSubmenu(item.name);
                              }}
                              className="p-1.5 mr-1 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-md transition-colors"
                              title={isExpanded ? `Tutup sub menu ${item.name}` : `Buka sub menu ${item.name}`}
                              aria-label={isExpanded ? `Tutup sub menu ${item.name}` : `Buka sub menu ${item.name}`}
                            >
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                  isExpanded ? 'transform rotate-0' : 'transform -rotate-90'
                                } ${active ? 'text-[#6E56CF]' : 'text-[#94A3B8]'}`}
                              />
                            </button>
                          )}
                        </div>

                        {/* Sub Menu Items */}
                        {!collapsed && isExpanded && (
                          <div className="ml-5 pl-2.5 border-l border-[#E2E8F0] space-y-0.5 my-1">
                            {item.subItems.map((subItem) => {
                              const subActive = isSubItemActive(subItem);
                              return (
                                <NavLink
                                  key={subItem.path}
                                  to={subItem.path}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E56CF] ${
                                    subActive
                                      ? 'bg-[#F4EFFE] text-[#6E56CF] font-semibold'
                                      : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] font-medium'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                                      subActive ? 'bg-[#6E56CF]' : 'bg-[#CBD5E1]'
                                    }`}
                                  />
                                  <span className="truncate">{subItem.name}</span>
                                </NavLink>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={collapsed ? item.name : undefined}
                      className={getItemClassName(active)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={getIconClassName(active)} />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                      </div>

                      {!collapsed && item.hasSubmenu && (
                        <ChevronRight className={`w-3.5 h-3.5 ${active ? 'text-[#6E56CF]' : 'text-[#94A3B8]'}`} />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Profile & Collapse Button */}
      <div className="p-2 border-t border-[#F1F5F9] bg-white space-y-1">
        {user && (
          <div
            className={`flex items-center gap-2 p-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] ${
              collapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#0F172A] truncate">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-[#64748B] capitalize truncate">
                    {user.role}
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                type="button"
                onClick={handleLogout}
                title="Keluar dari Portal"
                aria-label="Keluar dari Portal"
                className="p-1 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors w-full ${
              collapsed ? 'justify-center' : ''
            }`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-[#64748B]" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 text-[#64748B]" />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
};
