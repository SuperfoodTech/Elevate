import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  ArrowLeft,
  Pencil,
  MoreHorizontal,
  Share2,
  ShoppingBag,
  AlertCircle,
  Check,
  TrendingUp,
  Cloud,
  Bot,
  Calendar,
  ChevronRight,
  ArrowRight,
  Layers
} from 'lucide-react';

interface PlatformListingItem {
  id: string;
  platform: 'GO' | 'GR' | 'S';
  platformName: string;
  listingName: string;
  sid: string;
  status: 'Live' | 'Need Review';
  managedByFoodMaster: boolean;
  lastSync: string;
}

interface DayOrderStat {
  day: string;
  orders: number;
}

interface OutletDetailData {
  id: string;
  name: string;
  area: string;
  initials: string;
  status: 'Active' | 'Attention' | 'Inactive';
  isVip?: boolean;
  ownerId: string;
  ownerName: string;
  platformsConnectedCount: number;
  platformsList: string;
  listingsSummary: {
    gofood: number;
    grabfood: number;
    shopeefood: number;
    total: number;
  };
  successfulOrdersThisWeek: number;
  avgDailyOrdersThisWeek: number;
  vsPreviousWeekPercentage: number;
  vsPreviousWeekOrders: number;
  needReviewCount: number;
  listings: PlatformListingItem[];
  dailyStats: DayOrderStat[];
  operationalStatuses: Array<{
    id: string;
    type: 'GO' | 'GR' | 'S' | 'sync' | 'bot';
    name: string;
    statusText: string;
    isHealthy: boolean;
    hasWarning?: boolean;
    warningText?: string;
  }>;
  needAttentionIssue?: {
    id: string;
    title: string;
    lastSyncText: string;
  };
}

const defaultOutletData: OutletDetailData = {
  id: 'OUT-00123',
  name: 'Salero Minang Raya — Manyar',
  area: 'Surabaya',
  initials: 'SMR',
  status: 'Active',
  isVip: true,
  ownerId: 'OWN-00124',
  ownerName: 'Salero Minang Raya',
  platformsConnectedCount: 3,
  platformsList: 'GoFood, GrabFood, ShopeeFood',
  listingsSummary: {
    gofood: 2,
    grabfood: 1,
    shopeefood: 2,
    total: 5
  },
  successfulOrdersThisWeek: 1284,
  avgDailyOrdersThisWeek: 183,
  vsPreviousWeekPercentage: 12,
  vsPreviousWeekOrders: 138,
  needReviewCount: 1,
  listings: [
    {
      id: 'LST-01',
      platform: 'GO',
      platformName: 'GoFood',
      listingName: 'Salero Minang Raya Manyar',
      sid: 'GF-0521-ABCD',
      status: 'Live',
      managedByFoodMaster: true,
      lastSync: '10 min ago'
    },
    {
      id: 'LST-02',
      platform: 'GO',
      platformName: 'GoFood',
      listingName: 'Salero Minang Raya Surabaya',
      sid: 'GF-0831-X12YZ',
      status: 'Live',
      managedByFoodMaster: true,
      lastSync: '10 min ago'
    },
    {
      id: 'LST-03',
      platform: 'GR',
      platformName: 'GrabFood',
      listingName: 'Salero Minang Raya - Manyar',
      sid: 'GB-44321-KLMN',
      status: 'Live',
      managedByFoodMaster: true,
      lastSync: '8 min ago'
    },
    {
      id: 'LST-04',
      platform: 'S',
      platformName: 'ShopeeFood',
      listingName: 'Salero Minang Raya Manyar',
      sid: 'SF-91221-QQWE',
      status: 'Live',
      managedByFoodMaster: true,
      lastSync: '12 min ago'
    },
    {
      id: 'LST-05',
      platform: 'S',
      platformName: 'ShopeeFood',
      listingName: 'Salero Minang Raya MNY',
      sid: 'SF-91882-PLMK',
      status: 'Need Review',
      managedByFoodMaster: false,
      lastSync: '-'
    }
  ],
  dailyStats: [
    { day: 'Mon', orders: 210 },
    { day: 'Tue', orders: 198 },
    { day: 'Wed', orders: 205 },
    { day: 'Thu', orders: 214 },
    { day: 'Fri', orders: 236 },
    { day: 'Sat', orders: 115 },
    { day: 'Sun', orders: 106 }
  ],
  operationalStatuses: [
    {
      id: 'OP-GO',
      type: 'GO',
      name: 'GoFood',
      statusText: '2 / 2 Live',
      isHealthy: true
    },
    {
      id: 'OP-GR',
      type: 'GR',
      name: 'GrabFood',
      statusText: '1 / 1 Live',
      isHealthy: true
    },
    {
      id: 'OP-S',
      type: 'S',
      name: 'ShopeeFood',
      statusText: '1 Live • 1 Need Review',
      isHealthy: false,
      hasWarning: true,
      warningText: '1 Need Review'
    },
    {
      id: 'OP-SYNC',
      type: 'sync',
      name: 'Data Sync',
      statusText: 'Healthy',
      isHealthy: true
    },
    {
      id: 'OP-BOT',
      type: 'bot',
      name: 'Bot (ShopeeFood)',
      statusText: 'Active',
      isHealthy: true
    }
  ],
  needAttentionIssue: {
    id: 'ATTN-SF-91882',
    title: 'ShopeeFood listing SF-91882 has not been mapped to this outlet.',
    lastSyncText: 'Last sync: 2 days ago'
  }
};

export const OutletDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'Overview' | 'Listings' | 'Transactions' | 'Settlement' | 'Reports' | 'Activity'>('Overview');
  const [data] = useState<OutletDetailData>(() => {
    return {
      ...defaultOutletData,
      id: id || defaultOutletData.id
    };
  });

  const maxOrders = Math.max(...data.dailyStats.map(d => d.orders));

  return (
    <DashboardLayout title="Outlets" subtitle="Manage and monitor all FoodMaster outlet units.">
      <div className="space-y-6 pb-12">
        {/* Back Link to Owner */}
        <div>
          <button
            type="button"
            onClick={() => navigate(`/owners/${data.ownerId}`)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#4B5565] hover:text-[#0F172A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-md px-1 py-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Owner</span>
          </button>
        </div>

        {/* Identity Header Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Avatar & Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#FEE2E2] text-[#DC2626] font-bold text-xl flex items-center justify-center shrink-0 shadow-inner">
                {data.initials}
              </div>
              <div className="space-y-1">
                <div className="flex items-center flex-wrap gap-2">
                  <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                    {data.name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D]">
                    {data.status}
                  </span>
                  {data.isVip && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF9C3] text-[#A16207]">
                      VIP
                    </span>
                  )}
                </div>
                <div className="text-xs font-medium text-[#64748B] flex items-center flex-wrap gap-2">
                  <span>
                    Internal Outlet ID: <span className="font-mono text-[#334155]">{data.id}</span>
                  </span>
                  <span className="text-[#CBD5E1]">&bull;</span>
                  <span>
                    Owner:{' '}
                    <Link
                      to={`/owners/${data.ownerId}`}
                      className="text-[#2563EB] font-semibold hover:underline inline-flex items-center gap-0.5"
                    >
                      {data.ownerName}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                <Pencil className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Edit Outlet</span>
              </button>
              <button
                type="button"
                className="p-2 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                aria-label="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="mt-8 border-b border-[#E2E8F0] flex gap-8 text-[13px] overflow-x-auto">
            {(['Overview', 'Listings', 'Transactions', 'Settlement', 'Reports', 'Activity'] as const).map(tab => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 font-semibold transition-colors relative whitespace-nowrap focus-visible:outline-none ${
                    isActive
                      ? 'text-[#2563EB]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {tab}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            {/* 4 Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Platform Connected */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                  <Share2 className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#0F172A] leading-tight">
                    {data.platformsConnectedCount}
                  </div>
                  <div className="text-[13px] font-semibold text-[#0F172A]">
                    Platform Connected
                  </div>
                  <div className="text-xs text-[#64748B] truncate max-w-[180px]">
                    {data.platformsList}
                  </div>
                </div>
              </div>

              {/* Card 2: Outlet Listings */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex flex-col justify-center">
                <div className="text-xs font-semibold text-[#64748B] mb-2">
                  Outlet Listings
                </div>
                <div className="grid grid-cols-3 text-center divide-x divide-[#F1F5F9]">
                  <div className="px-1">
                    <div className="text-[11px] font-bold text-[#EF4444] uppercase tracking-wider">
                      GO
                    </div>
                    <div className="text-2xl font-bold text-[#0F172A]">
                      {data.listingsSummary.gofood}
                    </div>
                  </div>
                  <div className="px-1">
                    <div className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider">
                      GR
                    </div>
                    <div className="text-2xl font-bold text-[#0F172A]">
                      {data.listingsSummary.grabfood}
                    </div>
                  </div>
                  <div className="px-1">
                    <div className="text-[11px] font-bold text-[#F97316] uppercase tracking-wider">
                      S
                    </div>
                    <div className="text-2xl font-bold text-[#0F172A]">
                      {data.listingsSummary.shopeefood}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-[#64748B] text-center mt-2 font-medium">
                  Total {data.listingsSummary.total} listings
                </div>
              </div>

              {/* Card 3: Successful Orders */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#0F172A] leading-tight">
                    {data.successfulOrdersThisWeek.toLocaleString('en-US')}
                  </div>
                  <div className="text-[13px] font-semibold text-[#0F172A]">
                    Successful Orders
                  </div>
                  <div className="text-xs text-[#64748B]">
                    This week
                  </div>
                </div>
              </div>

              {/* Card 4: Need Review */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#FFFBEB] text-[#D97706] flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#0F172A] leading-tight">
                    {data.needReviewCount}
                  </div>
                  <div className="text-[13px] font-semibold text-[#0F172A]">
                    Need Review
                  </div>
                  <div className="text-xs text-[#64748B]">
                    Requires attention
                  </div>
                </div>
              </div>
            </div>

            {/* 2 Columns Body Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Platform Listings + Performance Chart */}
              <div className="lg:col-span-7 xl:col-span-7 space-y-6">
                {/* Platform Listings Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-[#0F172A]">
                        Platform Listings
                      </h2>
                      <p className="text-xs text-[#64748B]">
                        All listings/SID connected to this outlet.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('Listings')}
                      className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] transition-colors shadow-sm"
                    >
                      Manage Listings
                    </button>
                  </div>

                  {/* Listings Table */}
                  <div className="overflow-x-auto border border-[#F1F5F9] rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[#64748B] font-semibold">
                          <th className="py-3 px-3 text-center">Platform</th>
                          <th className="py-3 px-4">Listing Name</th>
                          <th className="py-3 px-3">SID</th>
                          <th className="py-3 px-3 text-center">Status</th>
                          <th className="py-3 px-3 text-center">Managed by FoodMaster</th>
                          <th className="py-3 px-3">Last Sync</th>
                          <th className="py-3 px-3 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {data.listings.map(item => (
                          <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                            {/* Platform Pill */}
                            <td className="py-3.5 px-3 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white shadow-xs ${
                                  item.platform === 'GO'
                                    ? 'bg-[#EF4444]'
                                    : item.platform === 'GR'
                                    ? 'bg-[#10B981]'
                                    : 'bg-[#F97316]'
                                }`}
                              >
                                {item.platform}
                              </span>
                            </td>

                            {/* Listing Name */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-[#0F172A]">
                                {item.listingName}
                              </div>
                              <div className="text-[11px] text-[#64748B]">
                                {item.platformName}
                              </div>
                            </td>

                            {/* SID */}
                            <td className="py-3.5 px-3 font-mono text-[#334155] font-medium">
                              {item.sid}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-3 text-center">
                              {item.status === 'Live' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#ECFDF5] text-[#059669]">
                                  Live
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                                  Need Review
                                </span>
                              )}
                            </td>

                            {/* Managed by FoodMaster */}
                            <td className="py-3.5 px-3 text-center">
                              {item.managedByFoodMaster ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#059669]">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Yes</span>
                                </span>
                              ) : (
                                <span className="text-[#94A3B8] font-medium">-</span>
                              )}
                            </td>

                            {/* Last Sync */}
                            <td className="py-3.5 px-3 text-[#64748B] text-[11px]">
                              {item.lastSync}
                            </td>

                            {/* More Actions */}
                            <td className="py-3.5 px-3 text-center">
                              <button
                                type="button"
                                className="p-1 rounded text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footnote */}
                  <div className="text-[11px] text-[#64748B] pt-1">
                    Showing 1 to {data.listings.length} of {data.listings.length} listings
                  </div>
                </div>

                {/* Performance (This Week) Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-[#0F172A]">
                        Performance <span className="font-normal text-[#64748B]">(This Week)</span>
                      </h2>
                      <p className="text-xs text-[#64748B]">
                        Performance is compared to the previous week.
                      </p>
                    </div>
                    <div>
                      <select
                        aria-label="Performance period"
                        className="bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs text-[#334155] font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      >
                        <option>This Week</option>
                        <option>Last Week</option>
                        <option>Last 30 Days</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                    {/* Left: 3 Metrics */}
                    <div className="md:col-span-5 space-y-4 border-b md:border-b-0 md:border-r border-[#E2E8F0] pb-4 md:pb-0 md:pr-6">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-[11px] font-semibold text-[#64748B]">
                            Successful Orders
                          </div>
                          <div className="text-2xl font-bold text-[#0F172A] mt-1">
                            {data.successfulOrdersThisWeek.toLocaleString('en-US')}
                          </div>
                          <div className="text-[10px] text-[#94A3B8] mt-0.5">
                            This week
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold text-[#64748B]">
                            Avg. Daily Orders
                          </div>
                          <div className="text-2xl font-bold text-[#0F172A] mt-1">
                            {data.avgDailyOrdersThisWeek}{' '}
                            <span className="text-xs font-normal text-[#64748B]">/ day</span>
                          </div>
                          <div className="text-[10px] text-[#94A3B8] mt-0.5">
                            This week
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold text-[#64748B]">
                            vs Previous Week
                          </div>
                          <div className="text-2xl font-bold text-[#16A34A] mt-1">
                            +{data.vsPreviousWeekPercentage}%
                          </div>
                          <div className="text-[10px] text-[#16A34A] mt-0.5 font-medium">
                            +{data.vsPreviousWeekOrders} orders
                          </div>
                        </div>
                      </div>

                      {/* Performance Trend Indicator */}
                      <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-[#16A34A]">
                        <div className="w-4 h-4 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                          <TrendingUp className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Better than previous week</span>
                      </div>
                    </div>

                    {/* Right: Daily Orders Bar Chart */}
                    <div className="md:col-span-7 space-y-2">
                      <div className="text-xs font-semibold text-[#0F172A]">
                        Successful Orders per Day
                      </div>

                      {/* Crisp SVG / CSS Bars */}
                      <div className="pt-4 pb-1">
                        <div className="grid grid-cols-7 gap-3 items-end h-32 px-1">
                          {data.dailyStats.map(stat => {
                            const barHeightPercent = Math.round((stat.orders / maxOrders) * 100);
                            return (
                              <div key={stat.day} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                                <span className="text-[11px] font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                                  {stat.orders}
                                </span>
                                <div className="w-full max-w-[28px] bg-[#E2E8F0] rounded-t-sm overflow-hidden flex items-end h-24">
                                  <div
                                    style={{ height: `${barHeightPercent}%` }}
                                    className="w-full bg-[#60A5FA] group-hover:bg-[#2563EB] transition-all rounded-t-sm"
                                    title={`${stat.day}: ${stat.orders} orders`}
                                  />
                                </div>
                                <span className="text-xs font-medium text-[#64748B]">
                                  {stat.day}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (5 cols): Operational Status + Need Attention */}
              <div className="lg:col-span-5 xl:col-span-5 space-y-6">
                {/* Operational Status Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-[#0F172A]">
                      Operational Status
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {data.operationalStatuses.map(item => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-[#F1F5F9] hover:border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.type === 'GO' && (
                            <span className="w-7 h-7 rounded-full bg-[#EF4444] text-white font-bold text-xs flex items-center justify-center shrink-0">
                              GO
                            </span>
                          )}
                          {item.type === 'GR' && (
                            <span className="w-7 h-7 rounded-full bg-[#10B981] text-white font-bold text-xs flex items-center justify-center shrink-0">
                              GR
                            </span>
                          )}
                          {item.type === 'S' && (
                            <span className="w-7 h-7 rounded-full bg-[#F97316] text-white font-bold text-xs flex items-center justify-center shrink-0">
                              S
                            </span>
                          )}
                          {item.type === 'sync' && (
                            <div className="w-7 h-7 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                              <Cloud className="w-4 h-4" />
                            </div>
                          )}
                          {item.type === 'bot' && (
                            <div className="w-7 h-7 rounded-full bg-[#FAF5FF] text-[#7C3AED] flex items-center justify-center shrink-0">
                              <Bot className="w-4 h-4" />
                            </div>
                          )}
                          <span className="text-xs font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors whitespace-nowrap">
                            {item.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap pl-2">
                          {item.hasWarning ? (
                            <div className="text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap">
                              <span className="text-[#10B981] whitespace-nowrap">1 Live</span>
                              <span className="text-[#94A3B8]">&bull;</span>
                              <span className="text-[#D97706] whitespace-nowrap">{item.warningText}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-[#10B981] whitespace-nowrap">
                              {item.statusText}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#2563EB] transition-colors shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] inline-flex items-center gap-1 focus-visible:outline-none focus-visible:underline"
                    >
                      <span>View All Status</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Need Attention Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#0F172A]">
                      Need Attention
                    </h2>
                    {data.needAttentionIssue && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]">
                        1
                      </span>
                    )}
                  </div>

                  {data.needAttentionIssue && (
                    <div className="p-3 rounded-xl border border-[#F1F5F9] hover:border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors leading-snug">
                            {data.needAttentionIssue.title}
                          </div>
                          <div className="text-[11px] text-[#64748B] mt-0.5">
                            {data.needAttentionIssue.lastSyncText}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#2563EB] transition-colors shrink-0 ml-2" />
                    </div>
                  )}

                  <div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] inline-flex items-center gap-1 focus-visible:outline-none focus-visible:underline"
                    >
                      <span>Review Mapping</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Tabs Placeholder */}
        {activeTab !== 'Overview' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center max-w-xl mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Tab {activeTab}
            </h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto">
              Rincian data {activeTab.toLowerCase()} untuk {data.name} ({data.id}) disaring secara otomatis berdasarkan konteks outlet ini.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('Overview')}
                className="px-4 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-lg hover:bg-[#1E293B] transition-colors"
              >
                Kembali ke Overview
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OutletDetailPage;

