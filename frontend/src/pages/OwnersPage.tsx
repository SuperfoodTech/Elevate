import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  Users,
  Store,
  Search,
  Download,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  ExternalLink,
  Eye,
  Pencil
} from 'lucide-react';

export type BusinessModel = 'Agency' | 'Hybrid' | 'Virtual Brand';
export type OwnerStatus = 'Active' | 'Attention';
export type OwnerGrade = 'A' | 'B' | 'C' | 'D' | 'E';
export type SettlementStatus = 'Waiting Payment' | 'Overdue' | 'Paid' | 'FoodMaster Pays';

export interface OwnerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessModel: BusinessModel;
  outletsCount: number;
  listings: {
    gofood: number;
    grabfood: number;
    shopeefood: number;
  };
  grade: OwnerGrade;
  baselineDailyOrder: number;
  performanceAchievedMonths: number;
  settlementStatus: SettlementStatus;
  issuesCount: number;
  status: OwnerStatus;
  kksStartDate: string;
  agencyFeePerOrder?: number;
}

const INITIAL_OWNERS: OwnerRecord[] = [
  {
    id: 'OWN-00124',
    name: 'Salero Minang Raya',
    email: 'contact@salero.id',
    phone: '+62 812-3456-7890',
    businessModel: 'Agency',
    outletsCount: 8,
    listings: { gofood: 16, grabfood: 14, shopeefood: 12 },
    grade: 'A',
    baselineDailyOrder: 54,
    performanceAchievedMonths: 4,
    settlementStatus: 'Waiting Payment',
    issuesCount: 0,
    status: 'Active',
    kksStartDate: '2025-11-01',
    agencyFeePerOrder: 1500
  },
  {
    id: 'OWN-002',
    name: 'Budi Santoso',
    email: 'hello@martabakh.nl',
    phone: '+62 813-8899-1122',
    businessModel: 'Hybrid',
    outletsCount: 5,
    listings: { gofood: 11, grabfood: 8, shopeefood: 7 },
    grade: 'B',
    baselineDailyOrder: 43,
    performanceAchievedMonths: 2,
    settlementStatus: 'Overdue',
    issuesCount: 2,
    status: 'Attention',
    kksStartDate: '2026-01-15',
    agencyFeePerOrder: 2000
  },
  {
    id: 'OWN-003',
    name: 'Hendra Gunawan',
    email: 'owner@depot88.co.id',
    phone: '+62 811-9876-5432',
    businessModel: 'Agency',
    outletsCount: 3,
    listings: { gofood: 6, grabfood: 4, shopeefood: 3 },
    grade: 'C',
    baselineDailyOrder: 34,
    performanceAchievedMonths: 1,
    settlementStatus: 'Paid',
    issuesCount: 0,
    status: 'Active',
    kksStartDate: '2026-02-01',
    agencyFeePerOrder: 1500
  },
  {
    id: 'OWN-004',
    name: 'Rina Parahyangan',
    email: 'info@pondokpc.com',
    phone: '+62 818-4455-6677',
    businessModel: 'Hybrid',
    outletsCount: 4,
    listings: { gofood: 7, grabfood: 6, shopeefood: 5 },
    grade: 'B',
    baselineDailyOrder: 47,
    performanceAchievedMonths: 3,
    settlementStatus: 'Waiting Payment',
    issuesCount: 1,
    status: 'Active',
    kksStartDate: '2025-12-10',
    agencyFeePerOrder: 1800
  },
  {
    id: 'OWN-005',
    name: 'H. Amirudin',
    email: 'hello@babaamir.id',
    phone: '+62 812-7788-9900',
    businessModel: 'Virtual Brand',
    outletsCount: 6,
    listings: { gofood: 13, grabfood: 12, shopeefood: 9 },
    grade: 'A',
    baselineDailyOrder: 60,
    performanceAchievedMonths: 5,
    settlementStatus: 'FoodMaster Pays',
    issuesCount: 0,
    status: 'Active',
    kksStartDate: '2025-08-20'
  },
  {
    id: 'OWN-006',
    name: 'Ahmad Syahrul',
    email: 'contact@rotibakar41.id',
    phone: '+62 815-3344-5566',
    businessModel: 'Agency',
    outletsCount: 2,
    listings: { gofood: 3, grabfood: 2, shopeefood: 2 },
    grade: 'C',
    baselineDailyOrder: 25,
    performanceAchievedMonths: 0,
    settlementStatus: 'Waiting Payment',
    issuesCount: 0,
    status: 'Attention',
    kksStartDate: '2026-03-01',
    agencyFeePerOrder: 1500
  },
  {
    id: 'OWN-007',
    name: 'H. Agung Minang',
    email: 'minangagung@gmail.com',
    phone: '+62 819-2233-4455',
    businessModel: 'Hybrid',
    outletsCount: 7,
    listings: { gofood: 12, grabfood: 10, shopeefood: 8 },
    grade: 'A',
    baselineDailyOrder: 58,
    performanceAchievedMonths: 4,
    settlementStatus: 'Paid',
    issuesCount: 0,
    status: 'Active',
    kksStartDate: '2025-10-05',
    agencyFeePerOrder: 1500
  },
  {
    id: 'OWN-008',
    name: 'Udin Sahrul',
    email: 'bangudin.jkt@gmail.com',
    phone: '+62 817-1122-3344',
    businessModel: 'Agency',
    outletsCount: 2,
    listings: { gofood: 3, grabfood: 2, shopeefood: 2 },
    grade: 'B',
    baselineDailyOrder: 41,
    performanceAchievedMonths: 2,
    settlementStatus: 'Overdue',
    issuesCount: 3,
    status: 'Attention',
    kksStartDate: '2026-01-20',
    agencyFeePerOrder: 2000
  },
  {
    id: 'OWN-009',
    name: 'Sriwijaya Kuliner',
    email: 'salesriwijaya@gmail.com',
    phone: '+62 813-5566-7788',
    businessModel: 'Virtual Brand',
    outletsCount: 3,
    listings: { gofood: 5, grabfood: 4, shopeefood: 4 },
    grade: 'A',
    baselineDailyOrder: 55,
    performanceAchievedMonths: 3,
    settlementStatus: 'FoodMaster Pays',
    issuesCount: 0,
    status: 'Active',
    kksStartDate: '2025-09-12'
  },
  {
    id: 'OWN-010',
    name: 'Kulo Group Mitra',
    email: 'support@kopikulo.id',
    phone: '+62 812-9900-1122',
    businessModel: 'Agency',
    outletsCount: 1,
    listings: { gofood: 1, grabfood: 1, shopeefood: 1 },
    grade: 'C',
    baselineDailyOrder: 20,
    performanceAchievedMonths: 0,
    settlementStatus: 'Waiting Payment',
    issuesCount: 0,
    status: 'Attention',
    kksStartDate: '2026-04-01',
    agencyFeePerOrder: 1500
  },
  {
    id: 'OWN-011',
    name: 'Darmawan Jaya',
    email: 'darmawan@ayamgeprek.co.id',
    phone: '+62 811-3344-7788',
    businessModel: 'Agency',
    outletsCount: 4,
    listings: { gofood: 8, grabfood: 7, shopeefood: 6 },
    grade: 'A',
    baselineDailyOrder: 52,
    performanceAchievedMonths: 4,
    settlementStatus: 'Paid',
    issuesCount: 0,
    status: 'Active',
    kksStartDate: '2025-11-15',
    agencyFeePerOrder: 1500
  },
  {
    id: 'OWN-012',
    name: 'Siti Rahmawati',
    email: 'siti@bebekmadura.id',
    phone: '+62 813-7766-5544',
    businessModel: 'Hybrid',
    outletsCount: 3,
    listings: { gofood: 6, grabfood: 5, shopeefood: 4 },
    grade: 'B',
    baselineDailyOrder: 44,
    performanceAchievedMonths: 2,
    settlementStatus: 'Waiting Payment',
    issuesCount: 1,
    status: 'Active',
    kksStartDate: '2026-01-10',
    agencyFeePerOrder: 1800
  },
  {
    id: 'OWN-013',
    name: 'Teguh Prasetyo',
    email: 'teguh@bakmi88.id',
    phone: '+62 812-4455-8899',
    businessModel: 'Agency',
    outletsCount: 2,
    listings: { gofood: 4, grabfood: 3, shopeefood: 3 },
    grade: 'C',
    baselineDailyOrder: 31,
    performanceAchievedMonths: 1,
    settlementStatus: 'Overdue',
    issuesCount: 1,
    status: 'Attention',
    kksStartDate: '2026-02-15',
    agencyFeePerOrder: 2000
  },
  {
    id: 'OWN-014',
    name: 'PT Boga Sejahtera',
    email: 'admin@bogasejahtera.co.id',
    phone: '+62 21-5566-7788',
    businessModel: 'Virtual Brand',
    outletsCount: 5,
    listings: { gofood: 10, grabfood: 9, shopeefood: 8 },
    grade: 'A',
    baselineDailyOrder: 62,
    performanceAchievedMonths: 5,
    settlementStatus: 'FoodMaster Pays',
    issuesCount: 0,
    status: 'Active',
    kksStartDate: '2025-07-01'
  },
  {
    id: 'OWN-015',
    name: 'Eko Wahyudi',
    email: 'eko@nasigorengspesial.id',
    phone: '+62 815-9988-1122',
    businessModel: 'Agency',
    outletsCount: 3,
    listings: { gofood: 6, grabfood: 5, shopeefood: 4 },
    grade: 'B',
    baselineDailyOrder: 40,
    performanceAchievedMonths: 3,
    settlementStatus: 'Paid',
    issuesCount: 0,
    status: 'Active',
    kksStartDate: '2025-12-01',
    agencyFeePerOrder: 1500
  },
  {
    id: 'OWN-016',
    name: 'Dewi Lestari',
    email: 'dewi@pisangkeju.com',
    phone: '+62 818-7766-3322',
    businessModel: 'Agency',
    outletsCount: 2,
    listings: { gofood: 4, grabfood: 3, shopeefood: 3 },
    grade: 'C',
    baselineDailyOrder: 28,
    performanceAchievedMonths: 0,
    settlementStatus: 'Waiting Payment',
    issuesCount: 0,
    status: 'Active',
    kksStartDate: '2026-03-10',
    agencyFeePerOrder: 1500
  },
  {
    id: 'OWN-017',
    name: 'H. Mansyur',
    email: 'mansyur@sotomadura.id',
    phone: '+62 813-1122-9988',
    businessModel: 'Hybrid',
    outletsCount: 4,
    listings: { gofood: 8, grabfood: 8, shopeefood: 6 },
    grade: 'A',
    baselineDailyOrder: 51,
    performanceAchievedMonths: 4,
    settlementStatus: 'Paid',
    issuesCount: 0,
    status: 'Active',
    kksStartDate: '2025-10-20',
    agencyFeePerOrder: 1500
  },
  {
    id: 'OWN-018',
    name: 'Lukman Hakim',
    email: 'lukman@roticanai.id',
    phone: '+62 812-6655-4433',
    businessModel: 'Agency',
    outletsCount: 2,
    listings: { gofood: 3, grabfood: 3, shopeefood: 2 },
    grade: 'C',
    baselineDailyOrder: 22,
    performanceAchievedMonths: 1,
    settlementStatus: 'Overdue',
    issuesCount: 2,
    status: 'Attention',
    kksStartDate: '2026-02-28',
    agencyFeePerOrder: 2000
  },
  {
    id: 'OWN-019',
    name: 'Fitri Handayani',
    email: 'fitri@dimsumbox.co.id',
    phone: '+62 819-8877-6655',
    businessModel: 'Virtual Brand',
    outletsCount: 4,
    listings: { gofood: 8, grabfood: 8, shopeefood: 6 },
    grade: 'A',
    baselineDailyOrder: 57,
    performanceAchievedMonths: 4,
    settlementStatus: 'FoodMaster Pays',
    issuesCount: 0,
    status: 'Active',
    kksStartDate: '2025-09-01'
  },
  {
    id: 'OWN-020',
    name: 'Bambang Irawan',
    email: 'bambang@satekambing.id',
    phone: '+62 811-2233-8899',
    businessModel: 'Agency',
    outletsCount: 3,
    listings: { gofood: 6, grabfood: 5, shopeefood: 5 },
    grade: 'B',
    baselineDailyOrder: 45,
    performanceAchievedMonths: 3,
    settlementStatus: 'Waiting Payment',
    issuesCount: 0,
    status: 'Active',
    kksStartDate: '2025-12-15',
    agencyFeePerOrder: 1500
  },
  {
    id: 'OWN-021',
    name: 'Yusuf Maulana',
    email: 'yusuf@kebabturki.id',
    phone: '+62 817-4433-2211',
    businessModel: 'Hybrid',
    outletsCount: 3,
    listings: { gofood: 6, grabfood: 5, shopeefood: 4 },
    grade: 'B',
    baselineDailyOrder: 42,
    performanceAchievedMonths: 2,
    settlementStatus: 'Waiting Payment',
    issuesCount: 1,
    status: 'Active',
    kksStartDate: '2026-01-05',
    agencyFeePerOrder: 1800
  },
  {
    id: 'OWN-022',
    name: 'PT Selera Rasa Utama',
    email: 'corporate@selerarasa.id',
    phone: '+62 21-7788-9900',
    businessModel: 'Agency',
    outletsCount: 5,
    listings: { gofood: 11, grabfood: 10, shopeefood: 8 },
    grade: 'A',
    baselineDailyOrder: 59,
    performanceAchievedMonths: 4,
    settlementStatus: 'Paid',
    issuesCount: 0,
    status: 'Active',
    kksStartDate: '2025-10-01',
    agencyFeePerOrder: 1500
  },
  {
    id: 'OWN-023',
    name: 'Surya Pratama',
    email: 'surya@toastbar.id',
    phone: '+62 812-1133-5577',
    businessModel: 'Agency',
    outletsCount: 1,
    listings: { gofood: 2, grabfood: 2, shopeefood: 1 },
    grade: 'C',
    baselineDailyOrder: 21,
    performanceAchievedMonths: 0,
    settlementStatus: 'Waiting Payment',
    issuesCount: 0,
    status: 'Attention',
    kksStartDate: '2026-04-10',
    agencyFeePerOrder: 1500
  }
];

export const OwnersPage: React.FC = () => {
  const [owners] = useState<OwnerRecord[]>(INITIAL_OWNERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedOwnerForDetail, setSelectedOwnerForDetail] = useState<OwnerRecord | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenuId(null);
    if (openActionMenuId) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [openActionMenuId]);

  // Filtered dataset
  const filteredOwners = useMemo(() => {
    return owners.filter(owner => {
      const matchSearch =
        owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchModel = selectedModel === 'All' || owner.businessModel === selectedModel;
      const matchStatus = selectedStatus === 'All' || owner.status === selectedStatus;
      const matchGrade = selectedGrade === 'All' || owner.grade === selectedGrade;

      return matchSearch && matchModel && matchStatus && matchGrade;
    });
  }, [owners, searchTerm, selectedModel, selectedStatus, selectedGrade]);

  // Aggregate KPI Calculations
  const totalOwnersCount = owners.length;
  const totalLiveOutlets = useMemo(() => {
    return owners.reduce((acc, curr) => acc + curr.outletsCount, 0);
  }, [owners]);

  const totalListings = useMemo(() => {
    return owners.reduce(
      (acc, curr) => {
        acc.gofood += curr.listings.gofood;
        acc.grabfood += curr.listings.grabfood;
        acc.shopeefood += curr.listings.shopeefood;
        return acc;
      },
      { gofood: 0, grabfood: 0, shopeefood: 0 }
    );
  }, [owners]);

  // Pagination logic
  const totalPages = Math.ceil(filteredOwners.length / rowsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredOwners.slice(start, start + rowsPerPage);
  }, [filteredOwners, currentPage, rowsPerPage]);

  const handleExportCSV = () => {
    const headers = [
      'Owner ID',
      'Owner Name',
      'Email',
      'Business Model',
      'Outlets Count',
      'GoFood Listings',
      'GrabFood Listings',
      'ShopeeFood Listings',
      'Grade',
      'Baseline Daily Order',
      'Performance Achieved',
      'Settlement Status',
      'Issues Count',
      'Status'
    ];

    const rows = filteredOwners.map(o => [
      o.id,
      `"${o.name}"`,
      o.email,
      o.businessModel,
      o.outletsCount,
      o.listings.gofood,
      o.listings.grabfood,
      o.listings.shopeefood,
      o.grade,
      o.baselineDailyOrder,
      `${o.performanceAchievedMonths}x achieved`,
      o.settlementStatus,
      o.issuesCount,
      o.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `elevate_owners_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout
      title="Owners"
      subtitle="Manage and monitor all FoodMaster commercial entities, models, and baseline performance."
    >
      <div className="space-y-6">
        {/* Top KPI Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Container: Total Owners & Live Outlets */}
          <div className="md:col-span-5 bg-white border border-[#E3E3E8] rounded-xl p-5 flex items-center justify-around shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] flex-shrink-0">
                <Users className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#111827] tracking-tight tabular-nums">{totalOwnersCount}</p>
                <p className="text-xs font-medium text-[#6B7280]">Owners</p>
              </div>
            </div>

            <div className="w-[1px] h-10 bg-[#E5E7EB]" />

            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#ECFDF5] flex items-center justify-center text-[#059669] flex-shrink-0">
                <Store className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#111827] tracking-tight tabular-nums">{totalLiveOutlets}</p>
                <p className="text-xs font-medium text-[#6B7280]">Live Outlets</p>
              </div>
            </div>
          </div>

          {/* Right Container: Outlet Listing (Total) Breakdown */}
          <div className="md:col-span-7 bg-white border border-[#E3E3E8] rounded-xl p-5 flex flex-col justify-between shadow-sm">
            <p className="text-xs font-semibold text-[#4B4B55] mb-2">Outlet Listing (Total)</p>
            <div className="grid grid-cols-3 divide-x divide-[#E5E7EB] text-center">
              <div className="px-2">
                <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider block mb-1">
                  GO (GoFood)
                </span>
                <span className="text-2xl font-bold text-[#111827] tabular-nums">
                  {totalListings.gofood}
                </span>
              </div>
              <div className="px-2">
                <span className="text-[11px] font-bold text-[#16A34A] uppercase tracking-wider block mb-1">
                  GR (GrabFood)
                </span>
                <span className="text-2xl font-bold text-[#111827] tabular-nums">
                  {totalListings.grabfood}
                </span>
              </div>
              <div className="px-2">
                <span className="text-[11px] font-bold text-[#EA580C] uppercase tracking-wider block mb-1">
                  S (ShopeeFood)
                </span>
                <span className="text-2xl font-bold text-[#111827] tabular-nums">
                  {totalListings.shopeefood}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Action Bar */}
        <div className="bg-white border border-[#E3E3E8] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Box */}
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Search className="w-4 h-4 text-[#9C9CA6] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search owner name or email..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#111827] placeholder-[#9C9CA6] focus:outline-none focus:ring-2 focus:ring-[#6E56CF] focus:border-transparent transition-all"
              />
            </div>

            {/* Business Model Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <span className="font-medium text-[#4B4B55] hidden sm:inline">Model:</span>
              <select
                value={selectedModel}
                onChange={e => {
                  setSelectedModel(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:ring-2 focus:ring-[#6E56CF]"
              >
                <option value="All">All Business</option>
                <option value="Agency">Agency</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Virtual Brand">Virtual Brand</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <span className="font-medium text-[#4B4B55] hidden sm:inline">Status:</span>
              <select
                value={selectedStatus}
                onChange={e => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:ring-2 focus:ring-[#6E56CF]"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Attention">Attention</option>
              </select>
            </div>

            {/* Grade Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <span className="font-medium text-[#4B4B55] hidden sm:inline">Grade:</span>
              <select
                value={selectedGrade}
                onChange={e => {
                  setSelectedGrade(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:ring-2 focus:ring-[#6E56CF]"
              >
                <option value="All">All Grade</option>
                <option value="A">Grade A (50+ /day)</option>
                <option value="B">Grade B (40-49 /day)</option>
                <option value="C">Grade C (30-39 /day)</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-xs font-semibold text-[#374151] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6E56CF]"
            >
              <Download className="w-3.5 h-3.5 text-[#6B7280]" />
              Export
            </button>
          </div>
        </div>

        {/* Master Owners Table Container */}
        <div className="bg-white border border-[#E3E3E8] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#EBEBEF] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-3">Business Model</th>
                  <th className="py-3 px-2 text-center">Outlets</th>
                  <th className="py-2 px-3 text-center border-x border-[#EBEBEF]" colSpan={3}>
                    <div className="text-[10px] text-[#9C9CA6] font-semibold mb-1">Outlet Listing (by Platform)</div>
                    <div className="grid grid-cols-3 gap-2 font-bold text-[11px]">
                      <span className="text-[#DC2626]">GO</span>
                      <span className="text-[#16A34A]">GR</span>
                      <span className="text-[#EA580C]">S</span>
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      Grade
                      <Info className="w-3 h-3 text-[#9C9CA6]" />
                    </span>
                  </th>
                  <th className="py-3 px-3">
                    <span className="inline-flex items-center gap-1">
                      Baseline
                      <Info className="w-3 h-3 text-[#9C9CA6]" />
                    </span>
                  </th>
                  <th className="py-3 px-3">
                    <span className="inline-flex items-center gap-1">
                      Performance
                      <Info className="w-3 h-3 text-[#9C9CA6]" />
                    </span>
                  </th>
                  <th className="py-3 px-3">
                    <span className="inline-flex items-center gap-1">
                      Settlement
                      <Info className="w-3 h-3 text-[#9C9CA6]" />
                    </span>
                  </th>
                  <th className="py-3 px-2 text-center">Issues</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F4] text-xs">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-[#6B7280]">
                      <Users className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
                      <p className="font-semibold text-[#111827]">Tidak ada data Owner yang cocok</p>
                      <p className="text-xs text-[#9CA3AF] mt-1">
                        Coba sesuaikan kata kunci pencarian atau reset filter di atas.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map(owner => {
                    const gradeStyles =
                      owner.grade === 'A'
                        ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                        : owner.grade === 'B'
                        ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                        : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]';

                    const modelStyles =
                      owner.businessModel === 'Agency'
                        ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                        : owner.businessModel === 'Hybrid'
                        ? 'bg-[#FAF5FF] text-[#7C3AED] border-[#E9D5FF]'
                        : 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]';

                    const settlementStyles =
                      owner.settlementStatus === 'Paid'
                        ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                        : owner.settlementStatus === 'Overdue'
                        ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] font-bold'
                        : owner.settlementStatus === 'FoodMaster Pays'
                        ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE] font-bold'
                        : 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]';

                    const performanceColor =
                      owner.performanceAchievedMonths >= 3
                        ? 'text-[#059669]'
                        : owner.performanceAchievedMonths >= 1
                        ? 'text-[#D97706]'
                        : 'text-[#DC2626]';

                    return (
                      <tr key={owner.id} className="hover:bg-[#FBFBFC] transition-colors">
                        {/* Owner Column: Real Owner Name + Email */}
                        <td className="py-3 px-4">
                          <Link
                            to={`/owners/${owner.id}`}
                            className="font-semibold text-[#111827] hover:text-[#2563EB] hover:underline transition-colors block"
                          >
                            {owner.name}
                          </Link>
                          <div className="text-[11px] text-[#6B7280] font-normal">{owner.email}</div>
                        </td>

                        {/* Business Model */}
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold border ${modelStyles}`}>
                            {owner.businessModel}
                          </span>
                        </td>

                        {/* Outlets Count */}
                        <td className="py-3 px-2 text-center font-semibold text-[#111827] tabular-nums">
                          {owner.outletsCount}
                        </td>

                        {/* Listings by Platform: GO / GR / S */}
                        <td className="py-3 px-2 text-center font-semibold text-[#111827] border-l border-[#F0F0F4] tabular-nums">
                          {owner.listings.gofood}
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-[#111827] tabular-nums">
                          {owner.listings.grabfood}
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-[#111827] border-r border-[#F0F0F4] tabular-nums">
                          {owner.listings.shopeefood}
                        </td>

                        {/* Grade Badge */}
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold border ${gradeStyles}`}>
                            {owner.grade}
                          </span>
                        </td>

                        {/* Baseline */}
                        <td className="py-3 px-3 text-[#4B4B55] tabular-nums font-medium">
                          {owner.baselineDailyOrder} / day
                        </td>

                        {/* Performance */}
                        <td className="py-3 px-3 font-semibold tabular-nums">
                          <span className={performanceColor}>
                            {owner.performanceAchievedMonths}x achieved
                          </span>
                        </td>

                        {/* Settlement */}
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-medium border ${settlementStyles}`}>
                            {owner.settlementStatus}
                          </span>
                        </td>

                        {/* Issues */}
                        <td className="py-3 px-2 text-center">
                          {owner.issuesCount > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                              {owner.issuesCount}
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF] font-bold">-</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <span
                            className={`font-semibold text-[11px] ${
                              owner.status === 'Active' ? 'text-[#16A34A]' : 'text-[#D97706]'
                            }`}
                          >
                            {owner.status}
                          </span>
                        </td>

                        {/* Action ... Button with Dropdown Menu */}
                        <td className="py-3 px-3 text-center relative">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setOpenActionMenuId(openActionMenuId === owner.id ? null : owner.id);
                            }}
                            title={`Menu aksi ${owner.name}`}
                            className="p-1.5 rounded-md hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827] transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openActionMenuId === owner.id && (
                            <div
                              onClick={e => e.stopPropagation()}
                              className="absolute right-3 top-10 w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-30 py-1.5 text-left text-xs"
                            >
                              <Link
                                to={`/owners/${owner.id}`}
                                className="flex items-center gap-2.5 px-3.5 py-2 text-[#0F172A] hover:bg-[#EFF6FF] hover:text-[#2563EB] font-semibold transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-[#2563EB]" />
                                <span>View Detail Page</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOwnerForDetail(owner);
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#64748B]" />
                                <span>Quick Preview</span>
                              </button>
                              <div className="border-t border-[#F1F5F9] my-1" />
                              <button
                                type="button"
                                onClick={() => setOpenActionMenuId(null)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5 text-[#64748B]" />
                                <span>Edit Owner</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <div className="px-4 py-3.5 border-t border-[#EBEBEF] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B7280]">
            <div>
              Showing <span className="font-semibold text-[#111827]">{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
              <span className="font-semibold text-[#111827]">
                {Math.min(currentPage * rowsPerPage, filteredOwners.length)}
              </span>{' '}
              of <span className="font-semibold text-[#111827]">{filteredOwners.length}</span> owners
            </div>

            <div className="flex items-center gap-2">
              {/* Rows Per Page Dropdown */}
              <div className="flex items-center gap-1.5 mr-2">
                <select
                  value={rowsPerPage}
                  onChange={e => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-[#E5E7EB] rounded-md px-2 py-1 text-xs text-[#111827] font-medium"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>

              {/* Prev Button */}
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                className="p-1.5 border border-[#E5E7EB] bg-white rounded-md hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page Number Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-[#111827] text-white font-bold'
                      : 'border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F3F4F6]'
                  }`}
                >
                  {page}
                </button>
              ))}

              {/* Next Button */}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                className="p-1.5 border border-[#E5E7EB] bg-white rounded-md hover:bg-[#F3F4F6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Owner Detail Drawer / Modal on Action Button Click */}
      {selectedOwnerForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#E3E3E8] rounded-xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-[#F0F0F4] pb-4">
              <div>
                <span className="text-[11px] font-bold text-[#6E56CF] uppercase tracking-wider block">
                  {selectedOwnerForDetail.id}
                </span>
                <h3 className="text-base font-bold text-[#111827] mt-0.5">{selectedOwnerForDetail.name}</h3>
                <p className="text-xs text-[#6B7280]">{selectedOwnerForDetail.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOwnerForDetail(null)}
                className="text-[#9CA3AF] hover:text-[#111827] p-1 rounded-md"
                aria-label="Tutup detail modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-[#FBFBFC] p-3 rounded-lg border border-[#EBEBEF]">
                <span className="text-[#6B7280] block mb-1">Model Bisnis</span>
                <span className="font-bold text-[#111827]">{selectedOwnerForDetail.businessModel}</span>
              </div>
              <div className="bg-[#FBFBFC] p-3 rounded-lg border border-[#EBEBEF]">
                <span className="text-[#6B7280] block mb-1">Status Kemitraan</span>
                <span className="font-bold text-[#111827]">{selectedOwnerForDetail.status}</span>
              </div>
              <div className="bg-[#FBFBFC] p-3 rounded-lg border border-[#EBEBEF]">
                <span className="text-[#6B7280] block mb-1">Outlet Fisik Terdaftar</span>
                <span className="font-bold text-[#111827]">{selectedOwnerForDetail.outletsCount} Lokasi</span>
              </div>
              <div className="bg-[#FBFBFC] p-3 rounded-lg border border-[#EBEBEF]">
                <span className="text-[#6B7280] block mb-1">Tanggal Mulai KKS</span>
                <span className="font-bold text-[#111827]">{selectedOwnerForDetail.kksStartDate}</span>
              </div>
            </div>

            <div className="bg-[#F9FAFB] p-3.5 rounded-lg border border-[#E5E7EB] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#4B4B55] font-medium">Grade Baseline:</span>
                <span className="font-bold text-[#111827]">
                  Grade {selectedOwnerForDetail.grade} ({selectedOwnerForDetail.baselineDailyOrder} order/hari)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#4B4B55] font-medium">Performance Uji Coba:</span>
                <span className="font-bold text-[#059669]">
                  {selectedOwnerForDetail.performanceAchievedMonths}x bulan tercapai (+20% baseline)
                </span>
              </div>
              {selectedOwnerForDetail.agencyFeePerOrder && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#4B4B55] font-medium">Agency Fee Owner:</span>
                  <span className="font-bold text-[#111827]">
                    Rp {selectedOwnerForDetail.agencyFeePerOrder.toLocaleString('id-ID')} / successful order
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#4B4B55] font-medium">Status Settlement:</span>
                <span className="font-bold text-[#111827]">{selectedOwnerForDetail.settlementStatus}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedOwnerForDetail(null)}
                className="px-4 py-2 bg-[#111827] text-white text-xs font-semibold rounded-lg hover:bg-[#2D2D35] transition-colors"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
