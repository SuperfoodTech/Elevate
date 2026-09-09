import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  ArrowLeft,
  Pencil,
  MoreHorizontal,
  Store,
  TrendingUp,
  Trophy,
  MapPin,
  Check,
  Minus,
  Hourglass,
  ChevronRight,
  ArrowRight,
  Calendar,
  Layers
} from 'lucide-react';

interface PhysicalOutletItem {
  id: string;
  name: string;
  area: string;
  gofoodCount: number;
  grabfoodCount: number;
  shopeefoodCount: number;
  mappingStatus: 'Complete' | 'Need Review';
  issuesCount: number;
}

interface MonthlyAchievement {
  month: string;
  achieved: boolean;
}

interface OwnerDetailData {
  id: string;
  name: string;
  initials: string;
  businessModel: 'Agency' | 'Hybrid' | 'Virtual Brand';
  status: 'Active' | 'Attention' | 'Inactive';
  isVip?: boolean;
  physicalOutletsCount: number;
  areasCount: number;
  gofoodListings: number;
  grabfoodListings: number;
  shopeefoodListings: number;
  baselineOrdersPerDay: number;
  performanceRatioAchieved: string;
  performanceMonthsCount: number;
  grade: 'A' | 'B' | 'C';
  gradeBasis: string;
  monthlyHistory: MonthlyAchievement[];
  currentSettlement: {
    period: string;
    agencyReceivableGross: number;
    adjustment: number;
    totalPayable: number;
    status: 'Waiting Payment' | 'Paid' | 'Overdue' | 'FoodMaster Pays';
    dueDate: string;
    daysLeft: number;
  };
  outletsList: PhysicalOutletItem[];
  needAttentionItems: Array<{
    id: string;
    title: string;
    subtitle: string;
    type: 'mapping' | 'overdue';
  }>;
}

const defaultOwnerData: OwnerDetailData = {
  id: 'OWN-00124',
  name: 'Salero Minang Raya',
  initials: 'SMR',
  businessModel: 'Agency',
  status: 'Active',
  isVip: true,
  physicalOutletsCount: 8,
  areasCount: 4,
  gofoodListings: 16,
  grabfoodListings: 14,
  shopeefoodListings: 12,
  baselineOrdersPerDay: 54,
  performanceRatioAchieved: '4x',
  performanceMonthsCount: 4,
  grade: 'A',
  gradeBasis: 'Based on 3 full months',
  monthlyHistory: [
    { month: 'Mar', achieved: true },
    { month: 'Apr', achieved: true },
    { month: 'May', achieved: false },
    { month: 'Jun', achieved: true },
    { month: 'Jul', achieved: false },
    { month: 'Aug', achieved: true }
  ],
  currentSettlement: {
    period: '26 Aug – 1 Sep 2026',
    agencyReceivableGross: 4040000,
    adjustment: -200000,
    totalPayable: 3840000,
    status: 'Waiting Payment',
    dueDate: '4 Sep 2026',
    daysLeft: 3
  },
  outletsList: [
    {
      id: 'OUT-00123',
      name: 'Salero Minang Raya – Manyar',
      area: 'Surabaya',
      gofoodCount: 2,
      grabfoodCount: 1,
      shopeefoodCount: 2,
      mappingStatus: 'Complete',
      issuesCount: 0
    },
    {
      id: 'OUT-02',
      name: 'Salero Minang Raya – Gubeng',
      area: 'Surabaya',
      gofoodCount: 3,
      grabfoodCount: 2,
      shopeefoodCount: 1,
      mappingStatus: 'Complete',
      issuesCount: 0
    },
    {
      id: 'OUT-03',
      name: 'Salero Minang Raya – Rungkut',
      area: 'Surabaya',
      gofoodCount: 2,
      grabfoodCount: 3,
      shopeefoodCount: 2,
      mappingStatus: 'Complete',
      issuesCount: 0
    },
    {
      id: 'OUT-04',
      name: 'Salero Minang Raya – Wiyung',
      area: 'Surabaya',
      gofoodCount: 1,
      grabfoodCount: 2,
      shopeefoodCount: 1,
      mappingStatus: 'Need Review',
      issuesCount: 1
    }
  ],
  needAttentionItems: [
    {
      id: 'ATTN-01',
      title: '1 SID needs outlet mapping',
      subtitle: 'GoFood – 1 SID',
      type: 'mapping'
    },
    {
      id: 'ATTN-02',
      title: '1 settlement overdue',
      subtitle: 'Due date passed 2 days ago',
      type: 'overdue'
    }
  ]
};

const formatRupiah = (val: number): string => {
  const isNegative = val < 0;
  const abs = Math.abs(val);
  const formatted = new Intl.NumberFormat('id-ID').format(abs);
  return `${isNegative ? '- Rp ' : 'Rp '}${formatted}`;
};

export const OwnerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'Overview' | 'Outlets' | 'Transactions' | 'Settlement' | 'Reports' | 'Activity'>('Overview');
  const [data] = useState<OwnerDetailData>(() => {
    return {
      ...defaultOwnerData,
      id: id || defaultOwnerData.id
    };
  });

  return (
    <DashboardLayout title="Owners" subtitle="Manage and monitor all FoodMaster owners.">
      <div className="space-y-6 pb-12">
        {/* Back Link */}
        <div>
          <button
            type="button"
            onClick={() => navigate('/owners')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#4B5565] hover:text-[#0F172A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-md px-1 py-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Owners</span>
          </button>
        </div>

        {/* Identity Header Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Avatar & Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#ECFDF5] text-[#059669] font-bold text-xl flex items-center justify-center shrink-0 shadow-inner">
                {data.initials}
              </div>
              <div className="space-y-1">
                <div className="flex items-center flex-wrap gap-2">
                  <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                    {data.name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F3E8FF] text-[#7E22CE]">
                    {data.businessModel}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D]">
                    {data.status}
                  </span>
                  {data.isVip && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF9C3] text-[#A16207]">
                      VIP
                    </span>
                  )}
                </div>
                <div className="text-xs font-medium text-[#64748B]">
                  Owner ID: <span className="font-mono text-[#334155]">{data.id}</span>
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
                <span>Edit Owner</span>
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
            {(['Overview', 'Outlets', 'Transactions', 'Settlement', 'Reports', 'Activity'] as const).map(tab => {
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
              {/* Card 1: Physical Outlets */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
                  <Store className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#0F172A] leading-tight">
                    {data.physicalOutletsCount}
                  </div>
                  <div className="text-[13px] font-semibold text-[#0F172A]">
                    Physical Outlets
                  </div>
                  <div className="text-xs text-[#64748B]">
                    Across {data.areasCount} areas
                  </div>
                </div>
              </div>

              {/* Card 2: Outlet Listings by Platform */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex flex-col justify-center">
                <div className="text-xs font-semibold text-[#64748B] mb-2">
                  Outlet Listings (by Platform)
                </div>
                <div className="grid grid-cols-3 text-center divide-x divide-[#F1F5F9]">
                  <div className="px-2">
                    <div className="text-[11px] font-bold text-[#EF4444] uppercase tracking-wider">
                      GO
                    </div>
                    <div className="text-2xl font-bold text-[#0F172A]">
                      {data.gofoodListings}
                    </div>
                    <div className="text-[10px] text-[#64748B]">GoFood</div>
                  </div>
                  <div className="px-2">
                    <div className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider">
                      GR
                    </div>
                    <div className="text-2xl font-bold text-[#0F172A]">
                      {data.grabfoodListings}
                    </div>
                    <div className="text-[10px] text-[#64748B]">GrabFood</div>
                  </div>
                  <div className="px-2">
                    <div className="text-[11px] font-bold text-[#F97316] uppercase tracking-wider">
                      S
                    </div>
                    <div className="text-2xl font-bold text-[#0F172A]">
                      {data.shopeefoodListings}
                    </div>
                    <div className="text-[10px] text-[#64748B]">ShopeeFood</div>
                  </div>
                </div>
              </div>

              {/* Card 3: Baseline */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#0F172A] leading-tight">
                    {data.baselineOrdersPerDay}{' '}
                    <span className="text-sm font-normal text-[#64748B]">/ day</span>
                  </div>
                  <div className="text-[13px] font-semibold text-[#0F172A]">
                    Baseline
                  </div>
                  <div className="text-xs text-[#64748B]">
                    Avg. successful orders
                  </div>
                </div>
              </div>

              {/* Card 4: Performance */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                  <Trophy className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#0F172A] leading-tight">
                    {data.performanceRatioAchieved}
                  </div>
                  <div className="text-[13px] font-semibold text-[#0F172A]">
                    Performance &ge;20%
                  </div>
                  <div className="text-xs text-[#64748B]">
                    Achieved in {data.performanceMonthsCount} months
                  </div>
                </div>
              </div>
            </div>

            {/* 2 Columns Body Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Outlets & Listings + Performance Overview */}
              <div className="lg:col-span-7 xl:col-span-7 space-y-6">
                {/* Outlets & Listings Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-[#0F172A]">
                        Outlets & Listings
                      </h2>
                      <p className="text-xs text-[#64748B]">
                        Physical outlets and their listings on each platform.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('Outlets')}
                      className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] transition-colors shadow-sm"
                    >
                      View All Outlets
                    </button>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto border border-[#F1F5F9] rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[#64748B] font-semibold">
                          <th className="py-3 px-4">Physical Outlet</th>
                          <th className="py-3 px-3 text-center">GO (GoFood)</th>
                          <th className="py-3 px-3 text-center">GR (GrabFood)</th>
                          <th className="py-3 px-3 text-center">S (ShopeeFood)</th>
                          <th className="py-3 px-3 text-center">Mapping Status</th>
                          <th className="py-3 px-4 text-center">Issues</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {data.outletsList.map(outlet => (
                          <tr key={outlet.id} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-start gap-2.5">
                                <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mt-0.5" />
                                <div>
                                  <Link
                                    to={`/outlets/${outlet.id}`}
                                    className="font-semibold text-[#0F172A] hover:text-[#2563EB] hover:underline transition-colors block"
                                  >
                                    {outlet.name}
                                  </Link>
                                  <div className="text-[11px] text-[#64748B]">
                                    {outlet.area}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-[#EF4444]">
                              {outlet.gofoodCount}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-[#10B981]">
                              {outlet.grabfoodCount}
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-[#F97316]">
                              {outlet.shopeefoodCount}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              {outlet.mappingStatus === 'Complete' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#ECFDF5] text-[#059669]">
                                  Complete
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                                  Need Review
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {outlet.issuesCount > 0 ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#FEF2F2] text-[#DC2626] font-bold text-[11px]">
                                  {outlet.issuesCount}
                                </span>
                              ) : (
                                <span className="text-[#94A3B8] font-medium">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footnote */}
                  <div className="text-[11px] text-[#64748B] pt-1">
                    <span className="font-semibold text-[#0F172A]">Legend:</span> GO = GoFood (red)&nbsp;&bull;&nbsp;GR = GrabFood (green)&nbsp;&bull;&nbsp;S = ShopeeFood (orange)
                  </div>
                </div>

                {/* Performance Overview Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-[#0F172A]">
                      Performance Overview
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Performance is counted when average daily successful orders &ge; +20% vs baseline.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                    {/* Left: 3 metrics */}
                    <div className="md:col-span-5 grid grid-cols-3 md:grid-cols-3 gap-3 border-b md:border-b-0 md:border-r border-[#E2E8F0] pb-4 md:pb-0 md:pr-4">
                      <div>
                        <div className="text-[11px] font-semibold text-[#64748B]">
                          Baseline
                        </div>
                        <div className="text-xl font-bold text-[#0F172A] mt-1">
                          {data.baselineOrdersPerDay}{' '}
                          <span className="text-xs font-normal text-[#64748B]">/ day</span>
                        </div>
                        <div className="text-[10px] text-[#94A3B8] mt-0.5">
                          Avg. successful orders
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-[#64748B]">
                          Grade
                        </div>
                        <div className="text-2xl font-black text-[#16A34A] mt-1">
                          {data.grade}
                        </div>
                        <div className="text-[10px] text-[#94A3B8] mt-0.5 leading-tight">
                          {data.gradeBasis}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-[#64748B]">
                          Performance
                        </div>
                        <div className="text-2xl font-bold text-[#16A34A] mt-1">
                          {data.performanceRatioAchieved}
                        </div>
                        <div className="text-[10px] text-[#94A3B8] mt-0.5 leading-tight">
                          months achieved
                        </div>
                      </div>
                    </div>

                    {/* Right: 6-Month Timeline */}
                    <div className="md:col-span-7 space-y-3">
                      <div className="text-xs font-semibold text-[#0F172A]">
                        6-Month Performance
                      </div>
                      <div className="grid grid-cols-6 gap-2 text-center">
                        {data.monthlyHistory.map(item => (
                          <div key={item.month} className="flex flex-col items-center gap-2">
                            <span className="text-xs font-semibold text-[#475569]">
                              {item.month}
                            </span>
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                item.achieved
                                  ? 'bg-[#16A34A] text-white shadow-sm'
                                  : 'bg-[#94A3B8] text-white'
                              }`}
                            >
                              {item.achieved ? (
                                <Check className="w-4 h-4 stroke-[2.5]" />
                              ) : (
                                <Minus className="w-4 h-4 stroke-[2.5]" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Timeline Legend */}
                      <div className="flex items-center gap-4 text-[11px] text-[#64748B] pt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-full bg-[#16A34A] flex items-center justify-center text-white">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>Achieved &ge; +20% vs baseline</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-full bg-[#94A3B8] flex items-center justify-center text-white">
                            <Minus className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>Not achieved</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (5 cols): Current Settlement + Need Attention */}
              <div className="lg:col-span-5 xl:col-span-5 space-y-6">
                {/* Current Settlement Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-[#0F172A]">
                        Current Settlement
                      </h2>
                      <p className="text-xs text-[#64748B]">
                        {data.currentSettlement.period}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('Settlement')}
                      className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] transition-colors shadow-sm"
                    >
                      View Settlement
                    </button>
                  </div>

                  {/* Financial Calculation Box */}
                  <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl p-4 space-y-2.5">
                    <div className="text-xs font-bold text-[#0F172A]">
                      Agency Receivable
                    </div>
                    <div className="flex justify-between items-center text-xs text-[#475569]">
                      <span>Merchant pays FoodMaster</span>
                      <span className="font-semibold text-[#0F172A]">
                        {formatRupiah(data.currentSettlement.agencyReceivableGross)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-[#475569]">
                      <span>Adjustment</span>
                      <span className="font-semibold text-[#DC2626]">
                        {formatRupiah(data.currentSettlement.adjustment)}
                      </span>
                    </div>
                    <div className="border-t border-[#E2E8F0] pt-2 flex justify-between items-center">
                      <span className="text-xs font-bold text-[#0F172A]">
                        Total (Merchant pays FoodMaster)
                      </span>
                      <span className="text-sm font-extrabold text-[#16A34A]">
                        {formatRupiah(data.currentSettlement.totalPayable)}
                      </span>
                    </div>
                  </div>

                  {/* Settlement Status Banner */}
                  <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                      <Hourglass className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#D97706]">
                        {data.currentSettlement.status}
                      </div>
                      <div className="text-[11px] text-[#92400E]">
                        Due date: {data.currentSettlement.dueDate} ({data.currentSettlement.daysLeft} days left)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Need Attention Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#0F172A]">
                      Need Attention
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]">
                      {data.needAttentionItems.length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {data.needAttentionItems.map(item => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-[#F1F5F9] hover:border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              item.type === 'mapping'
                                ? 'bg-[#FEF2F2] text-[#DC2626]'
                                : 'bg-[#FFF7ED] text-[#EA580C]'
                            }`}
                          >
                            {item.type === 'mapping' ? (
                              <Store className="w-4 h-4" />
                            ) : (
                              <Calendar className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {item.subtitle}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#2563EB] transition-colors" />
                      </div>
                    ))}
                  </div>

                  <div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] inline-flex items-center gap-1 focus-visible:outline-none focus-visible:underline"
                    >
                      <span>View All Issues</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for other sub-tabs */}
        {activeTab !== 'Overview' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center max-w-xl mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Tab {activeTab}
            </h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto">
              Rincian data {activeTab.toLowerCase()} untuk {data.name} ({data.id}) disaring secara otomatis berdasarkan konteks owner ini.
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

export default OwnerDetailPage;
