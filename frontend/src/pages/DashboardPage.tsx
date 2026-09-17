import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import {
  Calendar,
  ChevronDown,
  RefreshCw,
  Users,
  Store,
  Tag,
  ShoppingBag,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Lock,
  Wallet,
  Building2,
  Database,
  UserX,
  Layers,
  LayoutDashboard,
  BarChart3,
  CircleDollarSign,
  Bell,
  ShieldCheck,
  Award
} from 'lucide-react';

// Data types for dashboard
type DashboardTab = 'overview' | 'performance' | 'finance' | 'all';

interface MerchantDailyPoint {
  date: string;
  gmv: number;
  ofdFees: number;
  revenue: number;
  orderSucceed: number;
  orderCanceled: number;
}

interface VirtualDailyPoint {
  date: string;
  gmv: number;
  ofdFees: number;
  revenue: number;
  cogs: number;
  grossMargin: number;
  orderSucceed: number;
  orderCanceled: number;
}

// Helpers
const formatCurrency = (val: number): string => {
  return `Rp ${val.toLocaleString('en-US')}`;
};

const formatNumber = (val: number): string => {
  return val.toLocaleString('en-US');
};

const formatBillionAxis = (val: number): string => {
  if (val === 0) return '0';
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(0)}B`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
  return `${val}`;
};

const formatOrderAxis = (val: number): string => {
  if (val === 0) return '0';
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return `${val}`;
};

export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('13 - 19 Mei 2024 (Minggu 3)');
  const [selectedOwner, setSelectedOwner] = useState<string>('All Owner');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('All');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  // View modes for Brand Performance cards
  const [merchantViewMode, setMerchantViewMode] = useState<'financial' | 'orders'>('financial');
  const [virtualViewMode, setVirtualViewMode] = useState<'financial' | 'orders'>('financial');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshNotice('Data berhasil diperbarui sesuai sinkronisasi terbaru.');
      setTimeout(() => setRefreshNotice(null), 3000);
    }, 600);
  };

  // Mock series exactly matching Elevate1 Home.png
  const merchantChartData: MerchantDailyPoint[] = useMemo(() => [
    { date: '13 May', gmv: 3400000000, ofdFees: 340000000, revenue: 300000000, orderSucceed: 36000, orderCanceled: 1100 },
    { date: '14 May', gmv: 4100000000, ofdFees: 410000000, revenue: 380000000, orderSucceed: 42000, orderCanceled: 1200 },
    { date: '15 May', gmv: 4120000000, ofdFees: 412000000, revenue: 390000000, orderSucceed: 43000, orderCanceled: 1050 },
    { date: '16 May', gmv: 4100000000, ofdFees: 410000000, revenue: 380000000, orderSucceed: 42500, orderCanceled: 980 },
    { date: '17 May', gmv: 4250000000, ofdFees: 425000000, revenue: 410000000, orderSucceed: 45000, orderCanceled: 1150 },
    { date: '18 May', gmv: 4050000000, ofdFees: 405000000, revenue: 375000000, orderSucceed: 41000, orderCanceled: 900 },
    { date: '19 May', gmv: 3750000000, ofdFees: 375000000, revenue: 350000000, orderSucceed: 37000, orderCanceled: 850 }
  ], []);

  const virtualChartData: VirtualDailyPoint[] = useMemo(() => [
    { date: '13 May', gmv: 3500000000, ofdFees: 350000000, revenue: 650000000, cogs: 2500000000, grossMargin: 1000000000, orderSucceed: 28000, orderCanceled: 800 },
    { date: '14 May', gmv: 3800000000, ofdFees: 380000000, revenue: 720000000, cogs: 2650000000, grossMargin: 1150000000, orderSucceed: 31000, orderCanceled: 750 },
    { date: '15 May', gmv: 3900000000, ofdFees: 390000000, revenue: 700000000, cogs: 2680000000, grossMargin: 1220000000, orderSucceed: 32000, orderCanceled: 820 },
    { date: '16 May', gmv: 3600000000, ofdFees: 360000000, revenue: 680000000, cogs: 2800000000, grossMargin: 800000000, orderSucceed: 29500, orderCanceled: 710 },
    { date: '17 May', gmv: 3950000000, ofdFees: 395000000, revenue: 740000000, cogs: 2700000000, grossMargin: 1250000000, orderSucceed: 33000, orderCanceled: 690 },
    { date: '18 May', gmv: 3900000000, ofdFees: 390000000, revenue: 710000000, cogs: 2750000000, grossMargin: 1150000000, orderSucceed: 32000, orderCanceled: 730 },
    { date: '19 May', gmv: 3650000000, ofdFees: 365000000, revenue: 690000000, cogs: 2780000000, grossMargin: 870000000, orderSucceed: 29000, orderCanceled: 730 }
  ], []);

  // Overview 7-day sparkline trends for KPI Cards
  const sparklineData = useMemo(() => ({
    owners: [
      { val: 140 }, { val: 142 }, { val: 145 }, { val: 147 }, { val: 148 }, { val: 150 }, { val: 152 }
    ],
    outlets: [
      { val: 1220 }, { val: 1235 }, { val: 1250 }, { val: 1262 }, { val: 1270 }, { val: 1278 }, { val: 1285 }
    ],
    listings: [
      { val: 3480 }, { val: 3510 }, { val: 3540 }, { val: 3570 }, { val: 3590 }, { val: 3610 }, { val: 3620 }
    ],
    merchantOrders: [
      { val: 36000 }, { val: 42000 }, { val: 43000 }, { val: 42500 }, { val: 45000 }, { val: 41000 }, { val: 37000 }
    ],
    virtualOrders: [
      { val: 28000 }, { val: 31000 }, { val: 32000 }, { val: 29500 }, { val: 33000 }, { val: 32000 }, { val: 29000 }
    ]
  }), []);

  // Combined Ecosystem Daily Order Velocity for Overview Tab Hero Chart
  const ecosystemVelocityData = useMemo(() => [
    { date: '13 May', merchantOrders: 36000, virtualOrders: 28000, totalOrders: 64000 },
    { date: '14 May', merchantOrders: 42000, virtualOrders: 31000, totalOrders: 73000 },
    { date: '15 May', merchantOrders: 43000, virtualOrders: 32000, totalOrders: 75000 },
    { date: '16 May', merchantOrders: 42500, virtualOrders: 29500, totalOrders: 72000 },
    { date: '17 May', merchantOrders: 45000, virtualOrders: 33000, totalOrders: 78000 },
    { date: '18 May', merchantOrders: 41000, virtualOrders: 32000, totalOrders: 73000 },
    { date: '19 May', merchantOrders: 37000, virtualOrders: 29000, totalOrders: 66000 }
  ], []);

  // Top 5 Virtual Brands Contribution Matrix
  const topVirtualBrands = useMemo(() => [
    { name: 'Ayam Geprek Mantul', gmv: 742500000, share: 35.0, orders: 33800, growth: '+18.4%' },
    { name: 'Kopi Kenangan Senja', gmv: 510200000, share: 24.0, orders: 23150, growth: '+12.1%' },
    { name: 'Burger Nusantara Express', gmv: 382400000, share: 18.0, orders: 17400, growth: '+9.8%' },
    { name: 'Rice Bowl Bento Master', gmv: 276180000, share: 13.0, orders: 12550, growth: '+15.2%' },
    { name: 'Boba Time Artisan', gmv: 213170000, share: 10.0, orders: 9640, growth: '+6.5%' }
  ], []);

  // Daily Settlement Liquidity Flow for Settlement & Finance Tab
  const settlementFlowData = useMemo(() => [
    { date: '13 Mei', receivable: 165000000, payable: 245000000, disbursed: 172000000 },
    { date: '14 Mei', receivable: 182000000, payable: 278000000, disbursed: 195000000 },
    { date: '15 Mei', receivable: 178000000, payable: 265000000, disbursed: 188000000 },
    { date: '16 Mei', receivable: 195000000, payable: 290000000, disbursed: 210000000 },
    { date: '17 Mei', receivable: 210000000, payable: 312000000, disbursed: 228000000 },
    { date: '18 Mei', receivable: 185000000, payable: 280000000, disbursed: 198000000 },
    { date: '19 Mei', receivable: 130600000, payable: 206900000, disbursed: 94400000 }
  ], []);

  // Top bar right actions: Bell + Profile
  const topBarActions = (
    <div className="flex items-center gap-4">
      <button
        type="button"
        title="Notifications"
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          12
        </span>
      </button>

      <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
          OP
        </div>
        <div className="flex items-center gap-1.5 cursor-pointer select-none">
          <span className="text-xs font-semibold text-slate-800">Operation FoodMaster</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Home" actions={topBarActions}>
      <div className="space-y-6">

        {/* Feedback Alert if refreshed */}
        {refreshNotice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between">
            <span>{refreshNotice}</span>
            <button
              type="button"
              onClick={() => setRefreshNotice(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold"
            >
              Tutup
            </button>
          </div>
        )}

        {/* ── Filters Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#EBEBEF]">
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Filter */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">Period</span>
              <div className="relative flex items-center">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="appearance-none border border-slate-200 rounded-lg pl-8 pr-8 py-1.5 bg-white text-xs font-semibold text-slate-800 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="13 - 19 Mei 2024 (Minggu 3)">13 - 19 Mei 2024 (Minggu 3)</option>
                  <option value="06 - 12 Mei 2024 (Minggu 2)">06 - 12 Mei 2024 (Minggu 2)</option>
                  <option value="01 - 05 Mei 2024 (Minggu 1)">01 - 05 Mei 2024 (Minggu 1)</option>
                  <option value="22 - 28 Apr 2024 (Minggu 4)">22 - 28 Apr 2024 (Minggu 4)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Owner Filter */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">Owner</span>
              <div className="relative">
                <select
                  value={selectedOwner}
                  onChange={(e) => setSelectedOwner(e.target.value)}
                  className="appearance-none border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 bg-white text-xs font-semibold text-slate-800 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Owner">All Owner</option>
                  <option value="H. Amirudin">H. Amirudin</option>
                  <option value="Rina Parahyangan">Rina Parahyangan</option>
                  <option value="Ahmad Syahrul">Ahmad Syahrul</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Business Filter */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">Business</span>
              <div className="relative">
                <select
                  value={selectedBusiness}
                  onChange={(e) => setSelectedBusiness(e.target.value)}
                  className="appearance-none border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 bg-white text-xs font-semibold text-slate-800 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All">All</option>
                  <option value="Merchant Brand">Merchant Brand</option>
                  <option value="Virtual Brand">Virtual Brand</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Refresh Data Button */}
          <div className="flex items-end self-end">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 border border-slate-200 rounded-lg px-3.5 py-1.5 bg-white text-xs font-semibold text-blue-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Memuat Data...' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>

        {/* ── Tabs Navigation: Prevents Endless Vertical Scrolling ── */}
        <div className="flex items-center gap-2 border-b border-[#EBEBEF] pb-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'overview'
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview & Tasks</span>
            <span className="ml-1 px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">
              4 Issue
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'performance'
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Brand Performance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'finance'
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CircleDollarSign className="w-4 h-4" />
            <span>Settlement & Finance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'all'
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Sections (Full View)</span>
          </button>
        </div>

        {/* ── Business Snapshot (Rendered on Overview or All) ── */}
        {(activeTab === 'overview' || activeTab === 'all') && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Business Snapshot
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Total Owner */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-slate-300 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-500 font-medium leading-snug">Total Owner</span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums">152</div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
                      <span>&#9650; 8 vs last week</span>
                    </div>
                  </div>
                  <div className="w-20 h-9 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData.owners}>
                        <defs>
                          <linearGradient id="ownerGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#2563EB" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke="#2563EB" strokeWidth={1.75} fill="url(#ownerGrad)" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Card 2: Total Outlet */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-slate-300 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-500 font-medium leading-snug">Total Outlet</span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums">1,285</div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
                      <span>&#9650; 45 vs last week</span>
                    </div>
                  </div>
                  <div className="w-20 h-9 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData.outlets}>
                        <defs>
                          <linearGradient id="outletGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke="#059669" strokeWidth={1.75} fill="url(#outletGrad)" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Card 3: Total Listing */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-slate-300 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-500 font-medium leading-snug">Total Listing</span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums">3,620</div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
                      <span>&#9650; 112 vs last week</span>
                    </div>
                  </div>
                  <div className="w-20 h-9 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData.listings}>
                        <defs>
                          <linearGradient id="listingGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#D97706" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#D97706" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke="#D97706" strokeWidth={1.75} fill="url(#listingGrad)" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Card 4: Merchant Brand Successful Order */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-slate-300 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-500 font-medium leading-tight">
                    Merchant Brand Order
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums">128,230</div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
                      <span>&#9650; 12.5% vs last week</span>
                    </div>
                  </div>
                  <div className="w-20 h-9 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData.merchantOrders}>
                        <defs>
                          <linearGradient id="mOrderGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#2563EB" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke="#2563EB" strokeWidth={1.75} fill="url(#mOrderGrad)" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Card 5: Virtual Brand Successful Order */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-slate-300 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-500 font-medium leading-tight">
                    Virtual Brand Order
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums">96,540</div>
                    <div className="text-[11px] font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
                      <span>&#9650; 15.3% vs last week</span>
                    </div>
                  </div>
                  <div className="w-20 h-9 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData.virtualOrders}>
                        <defs>
                          <linearGradient id="vbOrderGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke="#7C3AED" strokeWidth={1.75} fill="url(#vbOrderGrad)" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Overview Visual Hub: Velocity Stream + Operational Health ── */}
        {(activeTab === 'overview' || activeTab === 'all') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Stream: Tren Order (8 cols) */}
            <div className="lg:col-span-8 bg-white border border-[#EBEBEF] rounded-xl p-5 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Tren Order Harian
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      Minggu Ini
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Perbandingan order Merchant Brand dan Virtual Brand
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                    <span className="font-medium text-slate-600">Merchant (57%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
                    <span className="font-medium text-slate-600">Virtual (43%)</span>
                  </div>
                </div>
              </div>

              {/* Quick Summary Pill Bar */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50/70 rounded-lg border border-slate-100 text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Order Minggu 3</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums">224,770</div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">&#9650; 13.8% vs Minggu 2</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Order Tertinggi</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums">78,000 <span className="text-xs font-normal text-slate-500">/hari</span></div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Jumat (17 Mei)</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Porsi Virtual Brand</div>
                  <div className="text-base font-bold text-purple-700 tabular-nums">42.9%</div>
                  <div className="text-[10px] text-purple-600 font-medium mt-0.5">Naik +2.4%</div>
                </div>
              </div>

              {/* Velocity Area Chart */}
              <div className="relative pt-1">
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={ecosystemVelocityData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="merchantStreamGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="virtualStreamGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatOrderAxis}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const mVal = Number(payload.find(p => p.dataKey === 'merchantOrders')?.value || 0);
                          const vVal = Number(payload.find(p => p.dataKey === 'virtualOrders')?.value || 0);
                          const total = mVal + vVal;
                          return (
                            <div className="bg-white text-slate-900 rounded-xl p-3.5 text-xs shadow-lg border border-slate-200/80 space-y-2 min-w-[185px]">
                              <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex justify-between items-center">
                                <span>{label}</span>
                                <span className="text-[10px] text-slate-500 font-semibold">Total: {formatNumber(total)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                                  Merchant:
                                </span>
                                <span className="font-bold text-slate-900 tabular-nums">{formatNumber(mVal)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                                  Virtual Brand:
                                </span>
                                <span className="font-bold text-slate-900 tabular-nums">{formatNumber(vVal)}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="merchantOrders"
                      name="Merchant Brand"
                      stroke="#2563EB"
                      strokeWidth={2.2}
                      fill="url(#merchantStreamGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="virtualOrders"
                      name="Virtual Brand"
                      stroke="#7C3AED"
                      strokeWidth={2.2}
                      fill="url(#virtualStreamGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Card: Kesehatan Sistem & Alur Operasional (4 cols) */}
            <div className="lg:col-span-4 bg-white border border-[#EBEBEF] rounded-xl p-5 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Kesehatan Operasional
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50">
                    97.8% Lancar
                  </span>
                </div>

                {/* Micro Health Indicator bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Status Transaksi</span>
                    <span className="font-semibold text-slate-700">Normal</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: '97.8%' }} title="Lancar" />
                    <div className="bg-amber-400 h-full" style={{ width: '1.4%' }} title="Perlu Perhatian" />
                    <div className="bg-rose-500 h-full" style={{ width: '0.8%' }} title="Kendala" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 224k Berhasil</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> 9 Perhatian</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> 48 Kendala</span>
                  </div>
                </div>

                {/* Operational Pipeline Flow */}
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <span className="text-[11px] font-semibold text-slate-700 block">
                    Indikator Layanan
                  </span>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-600">Rasio Brand per Outlet</span>
                        <span className="font-bold text-slate-900 tabular-nums">2.82x</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: '88%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-600">Tingkat Order Sukses</span>
                        <span className="font-bold text-emerald-600 tabular-nums">94.7%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: '94.7%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-600">Pencairan Dana Tepat Waktu</span>
                        <span className="font-bold text-indigo-600 tabular-nums">85.4%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: '85.4%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Tugas Belum Selesai</span>
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-full border border-rose-200/60">
                    57 Item
                  </span>
                </div>
            </div>
          </div>
        )}

        {/* ── Attention Needed (Elevated to top priority in Overview tab) ── */}
        {(activeTab === 'overview' || activeTab === 'all') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Attention Needed
              </h2>
              <span className="text-[11px] text-slate-500">Tindakan operasional yang perlu segera diselesaikan</span>
            </div>

            <div className="bg-white border border-[#EBEBEF] rounded-xl divide-y divide-[#EBEBEF] overflow-hidden">
              {/* Item 1: Transaction Need Review */}
              <Link
                to="/transactions?filter=need_review"
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Transaction Need Review
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
                  24
                </span>
              </Link>

              {/* Item 2: Failed Data Ingestion */}
              <Link
                to="/transactions?filter=failed_ingestion"
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Failed Data Ingestion
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
                  6
                </span>
              </Link>

              {/* Item 3: Overdue Owner */}
              <Link
                to="/owners?status=overdue"
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <UserX className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Overdue Owner
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">
                  18
                </span>
              </Link>

              {/* Item 4: Owner Approaching Churn */}
              <Link
                to="/owners?status=churn_risk"
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Owner Approaching Churn (5 Invoice Overdue)
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
                  9
                </span>
              </Link>
            </div>
          </section>
        )}

        {/* ── Weekly Report Status (Rendered on Finance or All) ── */}
        {(activeTab === 'finance' || activeTab === 'all') && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Weekly Report Status
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Ready */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Ready</div>
                  <div className="text-xl font-bold text-slate-900 tabular-nums">28</div>
                </div>
              </div>

              {/* Sent */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Sent</div>
                  <div className="text-xl font-bold text-slate-900 tabular-nums">76</div>
                </div>
              </div>

              {/* Waiting Payment */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Waiting Payment</div>
                  <div className="text-xl font-bold text-slate-900 tabular-nums">42</div>
                </div>
              </div>

              {/* Waiting Disbursement */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Waiting Disbursement</div>
                  <div className="text-xl font-bold text-slate-900 tabular-nums">31</div>
                </div>
              </div>

              {/* Completed */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Completed</div>
                  <div className="text-xl font-bold text-slate-900 tabular-nums">57</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Merchant Brand Performance (Rendered on Performance or All) ── */}
        {(activeTab === 'performance' || activeTab === 'all') && (
          <section className="bg-white border border-[#EBEBEF] rounded-xl p-6 space-y-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Performa Merchant Brand
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                    Toko Utama
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pendapatan dan order dari outlet mitra
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Segmented control for focus mode */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
                  <button
                    type="button"
                    onClick={() => setMerchantViewMode('financial')}
                    className={`px-3 py-1 font-semibold rounded-md transition-all ${
                      merchantViewMode === 'financial'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Keuangan
                  </button>
                  <button
                    type="button"
                    onClick={() => setMerchantViewMode('orders')}
                    className={`px-3 py-1 font-semibold rounded-md transition-all ${
                      merchantViewMode === 'orders'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Order
                  </button>
                </div>

                <Link
                  to="/reports"
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Lihat Detail
                </Link>
              </div>
            </div>

            {/* Metric row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:border-slate-200 transition-colors">
                <span className="text-[11px] font-medium text-slate-500">GMV</span>
                <div className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                  Rp 3,210,560,000
                </div>
                <div className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                  <span>&#9650; 12.6%</span>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:border-slate-200 transition-colors">
                <span className="text-[11px] font-medium text-slate-500">Biaya Platform (OFD)</span>
                <div className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                  Rp 321,056,000
                </div>
                <div className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                  <span>&#9650; 11.8%</span>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:border-slate-200 transition-colors">
                <span className="text-[11px] font-medium text-slate-500">Pendapatan Bersih</span>
                <div className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                  Rp 289,876,000
                </div>
                <div className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                  <span>&#9650; 10.3%</span>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:border-slate-200 transition-colors">
                <span className="text-[11px] font-medium text-slate-500">Order Berhasil</span>
                <div className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                  128,230
                </div>
                <div className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                  <span>&#9650; 12.5%</span>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:border-slate-200 transition-colors">
                <span className="text-[11px] font-medium text-slate-500">Order Batal</span>
                <div className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                  7,230
                </div>
                <div className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-0.5">
                  <span>&#9660; -4.2%</span>
                </div>
              </div>
            </div>

            {/* Modern Composed Chart (Financial View vs Orders View) */}
            <div className="space-y-2 pt-1">
              {merchantViewMode === 'financial' ? (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2 px-1">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                        <span className="font-medium text-slate-600">GMV</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
                        <span className="font-medium text-slate-600">Pendapatan Bersih</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
                        <span className="font-medium text-slate-600">Biaya Platform</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Dalam Rupiah (M = Miliar, Jt = Juta)</span>
                  </div>

                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={merchantChartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="merchantGmvStreamGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="merchantRevStreamGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="merchantOfdStreamGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0D9488" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#0D9488" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                      <YAxis tickFormatter={formatBillionAxis} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const gmvVal = Number(payload.find(p => p.dataKey === 'gmv')?.value || 0);
                          const revVal = Number(payload.find(p => p.dataKey === 'revenue')?.value || 0);
                          const ofdVal = Number(payload.find(p => p.dataKey === 'ofdFees')?.value || 0);
                          const takeRate = gmvVal > 0 ? ((ofdVal / gmvVal) * 100).toFixed(1) : '0';
                          return (
                            <div className="bg-white text-slate-900 rounded-xl p-3.5 text-xs shadow-lg border border-slate-200/80 space-y-2 min-w-[220px]">
                              <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex justify-between items-center">
                                <span>{label}</span>
                                <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-semibold">{takeRate}% Biaya Platform</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                                  GMV:
                                </span>
                                <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(gmvVal)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                                  Pendapatan Bersih:
                                </span>
                                <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(revVal)}</span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
                                  Biaya Platform:
                                </span>
                                <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(ofdVal)}</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="gmv"
                        name="GMV"
                        stroke="#2563EB"
                        strokeWidth={2.2}
                        fill="url(#merchantGmvStreamGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Pendapatan Bersih"
                        stroke="#7C3AED"
                        strokeWidth={2.2}
                        fill="url(#merchantRevStreamGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="ofdFees"
                        name="Biaya Platform"
                        stroke="#0D9488"
                        strokeWidth={2.2}
                        fill="url(#merchantOfdStreamGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2 px-1">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
                        <span className="font-medium text-slate-600">Order Berhasil</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-[#F43F5E]" />
                        <span className="font-medium text-slate-600">Order Batal</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Total Order per Hari (K = Ribu)</span>
                  </div>

                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={merchantChartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                      <YAxis tickFormatter={formatOrderAxis} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const succ = Number(payload.find(p => p.dataKey === 'orderSucceed')?.value || 0);
                          const canc = Number(payload.find(p => p.dataKey === 'orderCanceled')?.value || 0);
                          const total = succ + canc;
                          const rate = total > 0 ? ((succ / total) * 100).toFixed(1) : '0';
                          return (
                            <div className="bg-white text-slate-900 rounded-xl p-3.5 text-xs shadow-lg border border-slate-200/80 space-y-2 min-w-[210px]">
                              <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex justify-between items-center">
                                <span>{label}</span>
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">{rate}% Sukses</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                                  Berhasil:
                                </span>
                                <span className="font-bold text-slate-900 tabular-nums">{formatNumber(succ)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <span className="w-2 h-2 rounded-full bg-[#F43F5E]" />
                                  Batal:
                                </span>
                                <span className="font-bold text-slate-900 tabular-nums">{formatNumber(canc)}</span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                <span className="text-slate-600 font-medium">Total Order:</span>
                                <span className="font-bold tabular-nums text-slate-900">{formatNumber(total)}</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="orderSucceed" name="Order Berhasil" stackId="orderStack" fill="#10B981" radius={[0, 0, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="orderCanceled" name="Order Batal" stackId="orderStack" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Virtual Brand Performance & Top Brands Matrix (Rendered on Performance or All) ── */}
        {(activeTab === 'performance' || activeTab === 'all') && (
          <div className="space-y-6">
            {/* Metric Row for Virtual Brand (7 cards) */}
            <div className="bg-white border border-[#EBEBEF] rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Performa Virtual Brand
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                      Jaringan Brand Virtual
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pendapatan, biaya bahan, dan margin kotor brand kemitraan
                  </p>
                </div>

                <Link
                  to="/transactions?tab=vb"
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors self-start sm:self-auto"
                >
                  Lihat Detail
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:border-slate-200 transition-colors">
                  <span className="text-[11px] font-medium text-slate-500">GMV</span>
                  <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                    Rp 2,124,450,000
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-600 mt-1">
                    &#9650; 14.2%
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:border-slate-200 transition-colors">
                  <span className="text-[11px] font-medium text-slate-500">Biaya Platform (OFD)</span>
                  <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                    Rp 212,445,000
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-600 mt-1">
                    &#9650; 13.1%
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:border-slate-200 transition-colors">
                  <span className="text-[11px] font-medium text-slate-500">Pendapatan Bersih</span>
                  <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                    Rp 403,980,000
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-600 mt-1">
                    &#9650; 16.7%
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:border-slate-200 transition-colors">
                  <span className="text-[11px] font-medium text-slate-500">Biaya Bahan (COGS)</span>
                  <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                    Rp 1,478,430,000
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-600 mt-1">
                    &#9650; 13.9%
                  </div>
                </div>

                <div className="border border-purple-100 rounded-xl p-3 bg-purple-50/40 hover:border-purple-200 transition-colors">
                  <span className="text-[11px] font-medium text-purple-700">Margin Kotor</span>
                  <div className="text-xs font-bold text-purple-900 tabular-nums mt-0.5">
                    Rp 646,020,000 (30.4%)
                  </div>
                  <div className="text-[11px] font-semibold text-purple-700 mt-1">
                    &#9650; 18.6%
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:border-slate-200 transition-colors">
                  <span className="text-[11px] font-medium text-slate-500">Order Berhasil</span>
                  <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                    96,540
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-600 mt-1">
                    &#9650; 15.3%
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:border-slate-200 transition-colors">
                  <span className="text-[11px] font-medium text-slate-500">Order Batal</span>
                  <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                    5,230
                  </div>
                  <div className="text-[11px] font-semibold text-rose-600 mt-1">
                    &#9660; -2.1%
                  </div>
                </div>
              </div>
            </div>

            {/* Split Grid: 8 Cols Visual Unit Economics Flow + 4 Cols Top Brands Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Composed Margin & Cost Flow (8 cols) */}
              <div className="lg:col-span-8 bg-white border border-[#EBEBEF] rounded-xl p-5 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Pendapatan & Margin
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Perbandingan pendapatan bersih, biaya bahan, dan margin kotor
                    </p>
                  </div>

                  {/* Toggle */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
                    <button
                      type="button"
                      onClick={() => setVirtualViewMode('financial')}
                      className={`px-3 py-1 font-semibold rounded-md transition-all ${
                        virtualViewMode === 'financial'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Keuangan
                    </button>
                    <button
                      type="button"
                      onClick={() => setVirtualViewMode('orders')}
                      className={`px-3 py-1 font-semibold rounded-md transition-all ${
                        virtualViewMode === 'orders'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Order
                    </button>
                  </div>
                </div>

                {virtualViewMode === 'financial' ? (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2 px-1">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
                          <span className="font-medium text-slate-600">Pendapatan Bersih</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                          <span className="font-medium text-slate-600">Biaya Bahan (COGS)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                          <span className="font-medium text-slate-600">Margin Kotor</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">Rata-rata Margin: 30.4%</span>
                    </div>

                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={virtualChartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="vbRevenueStreamGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="vbCogsStreamGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="vbMarginStreamGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#D97706" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#D97706" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                        <YAxis tickFormatter={formatBillionAxis} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const rev = Number(payload.find(p => p.dataKey === 'revenue')?.value || 0);
                            const cogs = Number(payload.find(p => p.dataKey === 'cogs')?.value || 0);
                            const margin = Number(payload.find(p => p.dataKey === 'grossMargin')?.value || 0);
                            const marginPct = rev > 0 ? ((margin / (cogs + margin)) * 100).toFixed(1) : '0';
                            return (
                              <div className="bg-white text-slate-900 rounded-xl p-3.5 text-xs shadow-lg border border-slate-200/80 space-y-2 min-w-[220px]">
                                <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex justify-between items-center">
                                  <span>{label}</span>
                                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold">{marginPct}% Margin</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-slate-600">
                                    <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                                    Pendapatan Bersih:
                                  </span>
                                  <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(rev)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-slate-600">
                                    <span className="w-2 h-2 rounded-full bg-[#059669]" />
                                    Biaya Bahan:
                                  </span>
                                  <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(cogs)}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                  <span className="flex items-center gap-1.5 text-slate-600">
                                    <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                                    Margin Kotor:
                                  </span>
                                  <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(margin)}</span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Pendapatan Bersih"
                          stroke="#7C3AED"
                          strokeWidth={2.2}
                          fill="url(#vbRevenueStreamGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="cogs"
                          name="Biaya Bahan"
                          stroke="#059669"
                          strokeWidth={2.2}
                          fill="url(#vbCogsStreamGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="grossMargin"
                          name="Margin Kotor"
                          stroke="#D97706"
                          strokeWidth={2.2}
                          fill="url(#vbMarginStreamGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2 px-1">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-[#7C3AED]" />
                          <span className="font-medium text-slate-600">Order Berhasil</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm bg-[#F43F5E]" />
                          <span className="font-medium text-slate-600">Order Batal</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">Total Order VB per Hari</span>
                    </div>

                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={virtualChartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                        <YAxis tickFormatter={formatOrderAxis} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const succ = Number(payload.find(p => p.dataKey === 'orderSucceed')?.value || 0);
                            const canc = Number(payload.find(p => p.dataKey === 'orderCanceled')?.value || 0);
                            const total = succ + canc;
                            const rate = total > 0 ? ((succ / total) * 100).toFixed(1) : '0';
                            return (
                              <div className="bg-white text-slate-900 rounded-xl p-3.5 text-xs shadow-lg border border-slate-200/80 space-y-2 min-w-[210px]">
                                <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex justify-between items-center">
                                  <span>{label}</span>
                                  <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-semibold">{rate}% Sukses</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-slate-600">
                                    <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                                    Berhasil:
                                  </span>
                                  <span className="font-bold text-slate-900 tabular-nums">{formatNumber(succ)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-slate-600">
                                    <span className="w-2 h-2 rounded-full bg-[#F43F5E]" />
                                    Batal:
                                  </span>
                                  <span className="font-bold text-slate-900 tabular-nums">{formatNumber(canc)}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                  <span className="text-slate-600 font-medium">Total Order:</span>
                                  <span className="font-bold tabular-nums text-slate-900">{formatNumber(total)}</span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="orderSucceed" name="Order Berhasil" stackId="vbOrderStack" fill="#7C3AED" radius={[0, 0, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="orderCanceled" name="Order Batal" stackId="vbOrderStack" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Right Column: Top 5 Virtual Brands Share Matrix (4 cols) */}
              <div className="lg:col-span-4 bg-white border border-[#EBEBEF] rounded-xl p-5 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Brand Terlaris
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">Kontribusi Minggu 3</span>
                  </div>

                  {/* Brand ranking horizontal bars */}
                  <div className="space-y-3.5 pt-1">
                    {topVirtualBrands.map((brand, idx) => (
                      <div key={brand.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-800 truncate" title={brand.name}>
                              {brand.name}
                            </span>
                          </div>
                          <span className="font-bold text-slate-900 shrink-0 tabular-nums">
                            {brand.share}%
                          </span>
                        </div>

                        {/* Progress track */}
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              idx === 0 ? 'bg-purple-600' : idx === 1 ? 'bg-indigo-500' : 'bg-slate-400'
                            }`}
                            style={{ width: `${brand.share * 2.5}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                          <span>{formatCurrency(brand.gmv)}</span>
                          <span className="text-emerald-600 font-semibold">{brand.growth}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Total Brand Virtual</span>
                  <span className="font-semibold text-purple-700">12 Brand Aktif</span>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ── Settlement & Finance Snapshot (Rendered on Finance or All) ── */}
        {(activeTab === 'finance' || activeTab === 'all') && (
          <section className="space-y-5">
            {/* Visual Hub: Multi-Stream Cashflow Wave (8 cols) + Settlement Health Rings (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Multi-Stream Cashflow Wave (8 cols) */}
              <div className="lg:col-span-8 bg-white border border-[#EBEBEF] rounded-xl p-5 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Arus Likuiditas & Settlement
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                        Siklus Mingguan
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Perbandingan hak tagih mitra, kewajiban brand, dan pencairan dana harian
                    </p>
                  </div>

                  {/* Legend Indicator */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                      <span className="font-medium text-slate-600">Hak Tagih (Receivable)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" />
                      <span className="font-medium text-slate-600">Kewajiban (Payable)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                      <span className="font-medium text-slate-600">Dicairkan (Payout)</span>
                    </div>
                  </div>
                </div>

                {/* KPI Pill Summary */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50/70 rounded-lg border border-slate-100 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Perputaran Dana</div>
                    <div className="text-base font-bold text-slate-900 tabular-nums">Rp 3,12 Miliar</div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">&#9650; 8.4% vs Minggu 2</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Pencairan Tertinggi</div>
                    <div className="text-base font-bold text-slate-900 tabular-nums">Rp 228 Juta <span className="text-xs font-normal text-slate-500">/hari</span></div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Jumat (17 Mei)</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Posisi Kas Bersih</div>
                    <div className="text-base font-bold text-rose-600 tabular-nums">-Rp 631 Juta</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">Net Settlement Minggu 3</div>
                  </div>
                </div>

                {/* Multi-Stream Cashflow Wave Area Chart */}
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={settlementFlowData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="receivableStreamGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="payableStreamGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.30} />
                        <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="disbursedStreamGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                    <YAxis tickFormatter={formatBillionAxis} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const rec = Number(payload.find(p => p.dataKey === 'receivable')?.value || 0);
                        const pay = Number(payload.find(p => p.dataKey === 'payable')?.value || 0);
                        const disb = Number(payload.find(p => p.dataKey === 'disbursed')?.value || 0);
                        return (
                          <div className="bg-white text-slate-900 rounded-xl p-3.5 text-xs shadow-lg border border-slate-200/80 space-y-2 min-w-[210px]">
                            <div className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex justify-between items-center">
                              <span>{label}</span>
                              <span className="text-[10px] text-slate-500 font-semibold">Arus Kas Harian</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                                Hak Tagih Merchant:
                              </span>
                              <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(rec)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                                Kewajiban Brand:
                              </span>
                              <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(pay)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                              <span className="flex items-center gap-1.5 text-slate-600">
                                <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                                Dana Dicairkan:
                              </span>
                              <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(disb)}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="receivable"
                      name="Hak Tagih Merchant"
                      stroke="#10B981"
                      strokeWidth={2.2}
                      fill="url(#receivableStreamGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="payable"
                      name="Kewajiban Brand"
                      stroke="#7C3AED"
                      strokeWidth={2.2}
                      fill="url(#payableStreamGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="disbursed"
                      name="Dana Dicairkan"
                      stroke="#2563EB"
                      strokeWidth={2.2}
                      fill="url(#disbursedStreamGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Right Column: Radial Settlement Health & Efficiency Matrix (4 cols) */}
              <div className="lg:col-span-4 bg-white border border-[#EBEBEF] rounded-xl p-5 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Efisiensi Settlement
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      Likuid Sehat
                    </span>
                  </div>

                  {/* Concentric Multi-Ring Radial Progress Chart */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="relative w-52 h-52 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        {/* Ring 1: Pencairan Tepat Waktu (Outer - Radius 50, Circumference 314.16, Stroke 5) */}
                        <circle cx="60" cy="60" r="50" stroke="#F1F5F9" strokeWidth="5.5" fill="transparent" />
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          stroke="#2563EB"
                          strokeWidth="5.5"
                          strokeDasharray="314.16"
                          strokeDashoffset={314.16 * (1 - 0.854)}
                          strokeLinecap="round"
                          fill="transparent"
                        />

                        {/* Ring 2: Invoice Terverifikasi (Middle - Radius 42, Circumference 263.89, Stroke 5) */}
                        <circle cx="60" cy="60" r="42" stroke="#F1F5F9" strokeWidth="5.5" fill="transparent" />
                        <circle
                          cx="60"
                          cy="60"
                          r="42"
                          stroke="#7C3AED"
                          strokeWidth="5.5"
                          strokeDasharray="263.89"
                          strokeDashoffset={263.89 * (1 - 0.920)}
                          strokeLinecap="round"
                          fill="transparent"
                        />

                        {/* Ring 3: Rekonsiliasi Otomatis (Inner - Radius 34, Circumference 213.63, Stroke 5) */}
                        <circle cx="60" cy="60" r="34" stroke="#F1F5F9" strokeWidth="5.5" fill="transparent" />
                        <circle
                          cx="60"
                          cy="60"
                          r="34"
                          stroke="#10B981"
                          strokeWidth="5.5"
                          strokeDasharray="213.63"
                          strokeDashoffset={213.63 * (1 - 0.981)}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>

                      {/* Center Content: Cleanly positioned in inner hole (diameter 60px) without touching any ring */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                        <span className="text-xl font-black text-slate-900 tabular-nums leading-none tracking-tight">
                          91.8%
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          Rata-rata
                        </span>
                      </div>
                    </div>

                    {/* Ring Legend & Indicators */}
                    <div className="w-full space-y-2 pt-4 mt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0" />
                          <span className="text-slate-600">Pencairan Tepat Waktu</span>
                        </div>
                        <span className="font-bold text-slate-900 tabular-nums">85.4%</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] shrink-0" />
                          <span className="text-slate-600">Invoice Terverifikasi</span>
                        </div>
                        <span className="font-bold text-slate-900 tabular-nums">92.0%</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
                          <span className="text-slate-600">Rekonsiliasi Otomatis</span>
                        </div>
                        <span className="font-bold text-slate-900 tabular-nums">98.1%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Tenggat Settlement Berikutnya</span>
                  <span className="font-semibold text-slate-900">Senin, 20 Mei</span>
                </div>
              </div>
            </div>

            {/* Sub-header for snapshot cards */}
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Rincian Tagihan & Pencairan Dana
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Merchant Brand Receivable */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Merchant Brand Receivable</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                    Rp 1,245,600,000
                  </div>
                </div>
              </div>

              {/* Virtual Brand Payable */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Virtual Brand Payable</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                    Rp 1,876,900,000
                  </div>
                </div>
              </div>

              {/* Net Settlement */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Net Settlement (Rp)</div>
                  <div className="text-base font-bold text-rose-600 tabular-nums mt-0.5">
                    -631,300,000
                  </div>
                </div>
              </div>

              {/* Waiting Payment */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Waiting Payment</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                    Rp 542,300,000
                  </div>
                </div>
              </div>

              {/* Waiting Disbursement */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Waiting Disbursement</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                    Rp 742,100,000
                  </div>
                </div>
              </div>

              {/* Paid (This Week) */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Paid (This Week)</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                    Rp 1,285,400,000
                  </div>
                </div>
              </div>

              {/* Overdue */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Overdue</div>
                  <div className="text-base font-bold text-rose-600 tabular-nums mt-0.5">
                    Rp 312,800,000
                  </div>
                </div>
              </div>

              {/* Account Receivable */}
              <div className="bg-white border border-[#EBEBEF] rounded-xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Account Receivable</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                    Rp 855,100,000
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Footer Timestamp & Timezone ── */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-6 border-t border-[#EBEBEF]">
          <span>All data is updated as of 19 May 2024 10:00 WIB</span>
          <span>Timezone: Asia/Jakarta (GMT +7)</span>
        </div>

      </div>
    </DashboardLayout>
  );
};
