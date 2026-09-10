import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  Download,
  SlidersHorizontal,
  Calendar,
  ChevronDown,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  CircleX,
  Banknote,
  Receipt,
  Eye,
  Info,
} from 'lucide-react';
import {
  MOCK_TRANSACTIONS,
  TOTAL_ORDER_COUNT,
  formatRupiah,
  type Platform,
  type OrderStatus,
} from '../data/transactions';
import {
  MOCK_VB_TRANSACTIONS,
  VB_TOTAL_ORDER_COUNT,
  getPlatformLabel,
  type Platform as VBPlatform,
  type OrderStatus as VBOrderStatus,
} from '../data/vbTransactions';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === 'gofood') {
    return (
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#E53935] text-white text-xs font-bold shrink-0"
        aria-label="GoFood"
      >
        GF
      </span>
    );
  }
  if (platform === 'grabfood') {
    return (
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#00B14F] text-white text-xs font-bold shrink-0"
        aria-label="GrabFood"
      >
        GR
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#EE4D2D] text-white text-xs font-bold shrink-0"
      aria-label="ShopeeFood"
    >
      SF
    </span>
  );
}

function StatusBadge({ status }: { status: OrderStatus | VBOrderStatus }) {
  if (status === 'Sukses') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-[#DCFCE7] text-[#166534]">
        Sukses
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-[#FEE2E2] text-[#991B1B]">
      Batal
    </span>
  );
}

function SelectDropdown({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent cursor-pointer min-w-[140px]"
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}

export const TransactionExplorerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') === 'vb' ? 'vb' : 'agency';

  // Export dropdown state
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Agency tab filters & state
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterOutlet, setFilterOutlet] = useState('all');
  const [filterListing, setFilterListing] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [agencyPage, setAgencyPage] = useState(1);
  const [agencyRowsPerPage, setAgencyRowsPerPage] = useState(10);

  // VB tab filters & state (symmetrical with Agency)
  const [vbFilterPlatform, setVbFilterPlatform] = useState('all');
  const [vbFilterBrand, setVbFilterBrand] = useState('all');
  const [vbFilterOutlet, setVbFilterOutlet] = useState('all');
  const [vbFilterListing, setVbFilterListing] = useState('all');
  const [vbFilterStatus, setVbFilterStatus] = useState('all');
  const [vbSearchQuery, setVbSearchQuery] = useState('');
  const [vbPage, setVbPage] = useState(1);
  const [vbRowsPerPage, setVbRowsPerPage] = useState(25);

  // Shared platforms dropdown options
  const platforms = [
    { value: 'all', label: 'Semua Platform' },
    { value: 'gofood', label: 'GoFood' },
    { value: 'grabfood', label: 'GrabFood' },
    { value: 'shopeefood', label: 'ShopeeFood' },
  ];

  // Agency memoized options
  const owners = useMemo(() => {
    const set = new Set(MOCK_TRANSACTIONS.map((t) => t.owner));
    return [{ value: 'all', label: 'Semua Owner' }, ...Array.from(set).map((o) => ({ value: o, label: o }))];
  }, []);

  const outlets = useMemo(() => {
    const set = new Set(MOCK_TRANSACTIONS.map((t) => t.physicalOutlet));
    return [{ value: 'all', label: 'Semua Outlet' }, ...Array.from(set).map((o) => ({ value: o, label: o }))];
  }, []);

  const listings = useMemo(() => {
    const set = new Set(MOCK_TRANSACTIONS.map((t) => t.platformListing));
    return [{ value: 'all', label: 'Semua Listing' }, ...Array.from(set).map((o) => ({ value: o, label: o }))];
  }, []);

  // VB memoized options (symmetrical with Agency)
  const vbBrands = useMemo(() => {
    const set = new Set(MOCK_VB_TRANSACTIONS.map((t) => t.vb));
    return [{ value: 'all', label: 'Semua VB' }, ...Array.from(set).map((b) => ({ value: b, label: b }))];
  }, []);

  const vbOutlets = useMemo(() => {
    const set = new Set(MOCK_VB_TRANSACTIONS.map((t) => t.physicalOutlet));
    return [{ value: 'all', label: 'Semua Outlet' }, ...Array.from(set).map((o) => ({ value: o, label: o }))];
  }, []);

  const vbListings = useMemo(() => {
    const set = new Set(MOCK_VB_TRANSACTIONS.map((t) => t.platformListing));
    return [{ value: 'all', label: 'Semua Listing' }, ...Array.from(set).map((l) => ({ value: l, label: l }))];
  }, []);

  // Agency filtered & pagination
  const filteredAgency = useMemo(() => {
    return MOCK_TRANSACTIONS.filter((t) => {
      if (filterPlatform !== 'all' && t.platform !== filterPlatform) return false;
      if (filterOwner !== 'all' && t.owner !== filterOwner) return false;
      if (filterOutlet !== 'all' && t.physicalOutlet !== filterOutlet) return false;
      if (filterListing !== 'all' && t.platformListing !== filterListing) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !t.orderId.toLowerCase().includes(q) &&
          !t.sid.toLowerCase().includes(q) &&
          !t.physicalOutlet.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [filterPlatform, filterOwner, filterOutlet, filterListing, filterStatus, searchQuery]);

  const agencyKpi = useMemo(() => {
    const sukses = filteredAgency.filter((t) => t.status === 'Sukses');
    const batal = filteredAgency.filter((t) => t.status === 'Batal');
    const lostRevenue = batal.reduce((sum, t) => sum + t.orderValue, 0);
    const lostAgencyFee = batal.reduce((sum, t) => sum + t.agencyFee, 0);
    return {
      suksesCount: sukses.length,
      batalCount: batal.length,
      total: filteredAgency.length,
      suksesRate: filteredAgency.length > 0 ? ((sukses.length / filteredAgency.length) * 100).toFixed(1) : '0.0',
      batalRate: filteredAgency.length > 0 ? ((batal.length / filteredAgency.length) * 100).toFixed(1) : '0.0',
      lostRevenue,
      lostAgencyFee,
    };
  }, [filteredAgency]);

  const totalAgencyPages = Math.max(1, Math.ceil(filteredAgency.length / agencyRowsPerPage));

  const paginatedAgency = useMemo(() => {
    const start = (agencyPage - 1) * agencyRowsPerPage;
    return filteredAgency.slice(start, start + agencyRowsPerPage);
  }, [filteredAgency, agencyPage, agencyRowsPerPage]);

  const resetAgencyFilters = useCallback(() => {
    setFilterPlatform('all');
    setFilterOwner('all');
    setFilterOutlet('all');
    setFilterListing('all');
    setFilterStatus('all');
    setSearchQuery('');
    setAgencyPage(1);
  }, []);

  const goToAgencyPage = useCallback(
    (p: number) => {
      if (p >= 1 && p <= totalAgencyPages) setAgencyPage(p);
    },
    [totalAgencyPages]
  );

  // VB filtered & pagination (symmetrical with Agency)
  const filteredVB = useMemo(() => {
    return MOCK_VB_TRANSACTIONS.filter((t) => {
      if (vbFilterPlatform !== 'all' && t.platform !== (vbFilterPlatform as VBPlatform)) return false;
      if (vbFilterBrand !== 'all' && t.vb !== vbFilterBrand) return false;
      if (vbFilterOutlet !== 'all' && t.physicalOutlet !== vbFilterOutlet) return false;
      if (vbFilterListing !== 'all' && t.platformListing !== vbFilterListing) return false;
      if (vbFilterStatus !== 'all' && t.status !== (vbFilterStatus as VBOrderStatus)) return false;
      if (vbSearchQuery.trim()) {
        const q = vbSearchQuery.toLowerCase();
        if (
          !t.orderId.toLowerCase().includes(q) &&
          !t.physicalOutlet.toLowerCase().includes(q) &&
          !t.mid.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [vbFilterPlatform, vbFilterBrand, vbFilterOutlet, vbFilterListing, vbFilterStatus, vbSearchQuery]);

  const vbKpi = useMemo(() => {
    const total = filteredVB.length;
    const revenue = filteredVB.reduce((s, t) => s + t.revenue, 0);
    const cogs = filteredVB.reduce((s, t) => s + t.cogs, 0);
    const grossMargin = filteredVB.reduce((s, t) => s + t.grossMargin, 0);
    const gmPercent = revenue > 0 ? ((grossMargin / revenue) * 100).toFixed(1) : '0.0';
    return { total, revenue, cogs, grossMargin, gmPercent };
  }, [filteredVB]);

  const totalVBPages = Math.max(1, Math.ceil(filteredVB.length / vbRowsPerPage));

  const paginatedVB = useMemo(() => {
    const start = (vbPage - 1) * vbRowsPerPage;
    return filteredVB.slice(start, start + vbRowsPerPage);
  }, [filteredVB, vbPage, vbRowsPerPage]);

  const goToVBPage = useCallback(
    (p: number) => {
      if (p >= 1 && p <= totalVBPages) setVbPage(p);
    },
    [totalVBPages]
  );

  // Filter visibility toggle (controlled by Filter button in header)
  const [showFilter, setShowFilter] = useState(true);

  const resetVBFilters = useCallback(() => {
    setVbFilterPlatform('all');
    setVbFilterBrand('all');
    setVbFilterOutlet('all');
    setVbFilterListing('all');
    setVbFilterStatus('all');
    setVbSearchQuery('');
    setVbPage(1);
  }, []);

  const agencyActiveFilterCount = useMemo(() => {
    let count = 0;
    if (filterPlatform !== 'all') count++;
    if (filterOwner !== 'all') count++;
    if (filterOutlet !== 'all') count++;
    if (filterListing !== 'all') count++;
    if (filterStatus !== 'all') count++;
    if (searchQuery.trim() !== '') count++;
    return count;
  }, [filterPlatform, filterOwner, filterOutlet, filterListing, filterStatus, searchQuery]);

  const vbActiveFilterCount = useMemo(() => {
    let count = 0;
    if (vbFilterPlatform !== 'all') count++;
    if (vbFilterBrand !== 'all') count++;
    if (vbFilterOutlet !== 'all') count++;
    if (vbFilterListing !== 'all') count++;
    if (vbFilterStatus !== 'all') count++;
    if (vbSearchQuery.trim() !== '') count++;
    return count;
  }, [vbFilterPlatform, vbFilterBrand, vbFilterOutlet, vbFilterListing, vbFilterStatus, vbSearchQuery]);

  const activeFilterCount = currentTab === 'agency' ? agencyActiveFilterCount : vbActiveFilterCount;


  // Export handlers

  function exportCSV() {
    if (currentTab === 'agency') {
      const headers = ['Date & Time', 'Order ID', 'Platform', 'Owner', 'Physical Outlet', 'Platform Listing / SID', 'Status', 'Order Value', 'Agency Fee'];
      const rows = filteredAgency.map((t) => [
        t.dateTime,
        t.orderId,
        t.platform,
        t.owner,
        t.physicalOutlet,
        `${t.platformListing} / ${t.sid}`,
        t.status,
        t.orderValue,
        t.agencyFee,
      ]);
      const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'agency-transactions.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['Date & Time', 'Order ID', 'Platform', 'VB', 'Physical Outlet', 'Platform Listing / MID', 'Status', 'Order Value', 'Revenue', 'COGS', 'Gross Margin'];
      const rows = filteredVB.map((t) => [
        t.dateTime,
        t.orderId,
        getPlatformLabel(t.platform),
        t.vb,
        t.physicalOutlet,
        `${t.platformListing} / ${t.mid}`,
        t.status,
        t.orderValue,
        t.revenue,
        t.cogs,
        t.grossMargin,
      ]);
      const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vb-transactions.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
    setExportOpen(false);
  }

  // Agency pagination display numbers
  const agencyStart = filteredAgency.length === 0 ? 0 : (agencyPage - 1) * agencyRowsPerPage + 1;
  const agencyEnd = Math.min(agencyPage * agencyRowsPerPage, filteredAgency.length);

  const agencyPageNumbers = useMemo(() => {
    if (totalAgencyPages <= 5) return Array.from({ length: totalAgencyPages }, (_, i) => i + 1);
    if (agencyPage <= 3) return [1, 2, 3, null, totalAgencyPages];
    if (agencyPage >= totalAgencyPages - 2) return [1, null, totalAgencyPages - 2, totalAgencyPages - 1, totalAgencyPages];
    return [1, null, agencyPage - 1, agencyPage, agencyPage + 1, null, totalAgencyPages];
  }, [totalAgencyPages, agencyPage]);

  // VB pagination display numbers
  const vbStart = filteredVB.length === 0 ? 0 : (vbPage - 1) * vbRowsPerPage + 1;
  const vbEnd = Math.min(vbPage * vbRowsPerPage, filteredVB.length);

  const vbPageNumbers = useMemo(() => {
    if (totalVBPages <= 5) return Array.from({ length: totalVBPages }, (_, i) => i + 1);
    if (vbPage <= 3) return [1, 2, 3, null, totalVBPages];
    if (vbPage >= totalVBPages - 2) return [1, null, totalVBPages - 2, totalVBPages - 1, totalVBPages];
    return [1, null, vbPage - 1, vbPage, vbPage + 1, null, totalVBPages];
  }, [totalVBPages, vbPage]);

  return (
    <DashboardLayout title="Transactions">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-full px-6 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
            <Link to="/dashboard" className="hover:text-gray-700 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-gray-400">Transactions</span>
            <span>/</span>
            <span className="text-gray-800 font-medium">
              {currentTab === 'agency' ? 'Agency Transactions' : 'VB Transactions'}
            </span>
          </nav>

          {/* Page header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentTab === 'agency' ? 'Transaction Explorer' : 'VB Transactions'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {currentTab === 'agency'
                  ? 'Telusuri setiap transaksi Agency secara detail berdasarkan Order ID.'
                  : 'Daftar transaksi order dari seluruh platform untuk Virtual Brand (VB).'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Export dropdown */}
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setExportOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  aria-haspopup="true"
                  aria-expanded={exportOpen}
                >
                  <Download className="w-4 h-4" />
                  Export
                  <ChevronDown className="w-4 h-4" />
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                    <button
                      onClick={exportCSV}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Export as CSV
                    </button>
                    <button
                      disabled
                      className="w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                    >
                      Export as Excel (soon)
                    </button>
                  </div>
                )}
              </div>

              {/* Filter button */}
              <button
                type="button"
                onClick={() => setShowFilter((prev) => !prev)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 ${
                  currentTab === 'agency'
                    ? showFilter
                      ? 'text-white bg-[#E53935] hover:bg-[#C62828] focus-visible:ring-[#E53935]'
                      : 'text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 focus-visible:ring-[#2563EB]'
                    : showFilter
                    ? 'text-white bg-[#16A34A] hover:bg-[#15803D] focus-visible:ring-[#16A34A]'
                    : 'text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 focus-visible:ring-[#2563EB]'
                }`}
                aria-expanded={showFilter}
                aria-label={showFilter ? 'Sembunyikan filter' : 'Tampilkan filter'}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span
                    className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                      showFilter ? 'bg-white text-gray-800' : 'bg-[#2563EB] text-white'
                    }`}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>

            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-0 border-b border-gray-200 mb-6">
            <button
              onClick={() => setSearchParams({ tab: 'agency' })}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                currentTab === 'agency'
                  ? 'border-[#E53935] text-[#E53935] font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Agency Transactions
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'vb' })}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                currentTab === 'vb'
                  ? 'border-[#16A34A] text-[#16A34A] font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              VB Transactions
            </button>
          </div>

          {/* TAB 1: AGENCY TRANSACTIONS */}
          {currentTab === 'agency' && (
            <>
              {/* Agency KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5 text-[#16A34A]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Successful Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{agencyKpi.suksesCount.toLocaleString('id-ID')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{agencyKpi.suksesRate}% dari total order</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0">
                    <CircleX className="w-5 h-5 text-[#D97706]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Cancelled Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{agencyKpi.batalCount.toLocaleString('id-ID')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{agencyKpi.batalRate}% dari total order</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                    <Banknote className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Potential Lost Revenue</p>
                    <p className="text-xl font-bold text-[#2563EB]">{formatRupiah(agencyKpi.lostRevenue)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">dari order batal</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#FAF5FF] flex items-center justify-center shrink-0">
                    <Receipt className="w-5 h-5 text-[#7C3AED]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Potential Lost Agency Fee</p>
                    <p className="text-xl font-bold text-[#7C3AED]">{formatRupiah(agencyKpi.lostAgencyFee)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">dari order batal</p>
                  </div>
                </div>
              </div>

              {/* Agency Filter bar */}
              {showFilter && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 transition-all">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white min-w-[200px]">
                      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>17 - 23 Agustus 2026</span>
                    </div>

                    <SelectDropdown
                      value={filterPlatform}
                      onChange={(v) => { setFilterPlatform(v); setAgencyPage(1); }}
                      options={platforms}
                      label="Filter Platform"
                    />

                    <SelectDropdown
                      value={filterOwner}
                      onChange={(v) => { setFilterOwner(v); setAgencyPage(1); }}
                      options={owners}
                      label="Filter Owner"
                    />

                    <SelectDropdown
                      value={filterOutlet}
                      onChange={(v) => { setFilterOutlet(v); setAgencyPage(1); }}
                      options={outlets}
                      label="Filter Physical Outlet"
                    />

                    <SelectDropdown
                      value={filterListing}
                      onChange={(v) => { setFilterListing(v); setAgencyPage(1); }}
                      options={listings}
                      label="Filter Platform Listing"
                    />

                    <SelectDropdown
                      value={filterStatus}
                      onChange={(v) => { setFilterStatus(v); setAgencyPage(1); }}
                      options={[
                        { value: 'all', label: 'Semua Status' },
                        { value: 'Sukses', label: 'Sukses' },
                        { value: 'Batal', label: 'Batal' },
                      ]}
                      label="Filter Status"
                    />

                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari Order ID / SID..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setAgencyPage(1); }}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                      />
                    </div>

                    <button
                      onClick={resetAgencyFilters}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#E53935] hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935]"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset Filter
                    </button>
                  </div>
                </div>
              )}

              {/* Agency Data Table */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Date &amp; Time</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Order ID</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Platform</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Owner</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Physical Outlet</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Platform Listing / SID</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Order Status</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Order Value</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Agency Fee</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAgency.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-16 text-center text-gray-400 text-sm">
                            Tidak ada data transaksi yang cocok dengan filter yang dipilih.
                          </td>
                        </tr>
                      ) : (
                        paginatedAgency.map((t, idx) => (
                          <tr
                            key={t.id}
                            className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                              idx % 2 === 0 ? '' : 'bg-gray-50/30'
                            }`}
                          >
                            <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap text-xs">{t.dateTime}</td>
                            <td className="px-4 py-3.5 font-mono text-xs text-gray-800 whitespace-nowrap font-medium">{t.orderId}</td>
                            <td className="px-4 py-3.5">
                              <PlatformIcon platform={t.platform} />
                            </td>
                            <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{t.owner}</td>
                            <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{t.physicalOutlet}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="text-gray-800 block text-xs">{t.platformListing}</span>
                              <span className="text-xs text-[#2563EB] font-mono">{t.sid}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <StatusBadge status={t.status} />
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-gray-800 whitespace-nowrap">
                              {formatRupiah(t.orderValue)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-gray-800 whitespace-nowrap">
                              {formatRupiah(t.agencyFee)}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <Link
                                to={`/transactions/${t.orderId}`}
                                className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                              >
                                View Detail
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Agency Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Rows per page:</span>
                    <div className="relative">
                      <select
                        value={agencyRowsPerPage}
                        onChange={(e) => { setAgencyRowsPerPage(Number(e.target.value)); setAgencyPage(1); }}
                        className="appearance-none border border-gray-200 rounded-md pl-2.5 pr-6 py-1 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
                        aria-label="Rows per page"
                      >
                        {ROWS_PER_PAGE_OPTIONS.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <p className="text-sm text-gray-500">
                    {filteredAgency.length > 0
                      ? `${agencyStart}-${agencyEnd} of ${TOTAL_ORDER_COUNT.toLocaleString('id-ID')}`
                      : '0 of 0'}
                  </p>

                  <nav className="flex items-center gap-1" aria-label="Pagination">
                    <button
                      onClick={() => goToAgencyPage(agencyPage - 1)}
                      disabled={agencyPage === 1}
                      className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>

                    {agencyPageNumbers.map((num, i) =>
                      num === null ? (
                        <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm text-gray-400">...</span>
                      ) : (
                        <button
                          key={num}
                          onClick={() => goToAgencyPage(num)}
                          className={`w-8 h-8 rounded text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                            num === agencyPage ? 'bg-[#2563EB] text-white' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          aria-label={`Page ${num}`}
                          aria-current={num === agencyPage ? 'page' : undefined}
                        >
                          {num}
                        </button>
                      )
                    )}

                    <button
                      onClick={() => goToAgencyPage(agencyPage + 1)}
                      disabled={agencyPage === totalAgencyPages}
                      className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </nav>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: VB TRANSACTIONS */}
          {currentTab === 'vb' && (
            <>
              {/* VB KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{vbKpi.total.toLocaleString('id-ID')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">orders</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#F0FDF4] flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="10" cy="10" r="9" stroke="#16A34A" strokeWidth="1.5"/>
                      <path d="M6 10l3 3 5-5" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Revenue (Total)</p>
                    <p className="text-lg font-bold text-[#16A34A]">{formatRupiah(vbKpi.revenue)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">total pendapatan</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#FFF7ED] flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M10 3L3 10l7 7 7-7-7-7z" stroke="#EA580C" strokeWidth="1.5" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">COGS (Total)</p>
                    <p className="text-lg font-bold text-[#EA580C]">{formatRupiah(vbKpi.cogs)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">total biaya produk</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#F0FDF4] flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M4 14l4-4 3 3 5-7" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Gross Margin (Total)</p>
                    <p className="text-lg font-bold text-[#16A34A]">{formatRupiah(vbKpi.grossMargin)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">({vbKpi.gmPercent}%) margin</p>
                  </div>
                </div>
              </div>

              {/* VB Filter bar */}
              {showFilter && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 transition-all">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white min-w-[200px]">
                      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>1 - 21 Agustus 2026</span>
                    </div>

                    <SelectDropdown
                      value={vbFilterPlatform}
                      onChange={(v) => { setVbFilterPlatform(v); setVbPage(1); }}
                      options={platforms}
                      label="Filter Platform"
                    />

                    <SelectDropdown
                      value={vbFilterBrand}
                      onChange={(v) => { setVbFilterBrand(v); setVbPage(1); }}
                      options={vbBrands}
                      label="Filter VB Brand"
                    />

                    <SelectDropdown
                      value={vbFilterOutlet}
                      onChange={(v) => { setVbFilterOutlet(v); setVbPage(1); }}
                      options={vbOutlets}
                      label="Filter Physical Outlet"
                    />

                    <SelectDropdown
                      value={vbFilterListing}
                      onChange={(v) => { setVbFilterListing(v); setVbPage(1); }}
                      options={vbListings}
                      label="Filter Platform Listing"
                    />

                    <SelectDropdown
                      value={vbFilterStatus}
                      onChange={(v) => { setVbFilterStatus(v); setVbPage(1); }}
                      options={[
                        { value: 'all', label: 'Semua Status' },
                        { value: 'Sukses', label: 'Sukses' },
                        { value: 'Batal', label: 'Batal' },
                      ]}
                      label="Filter Status"
                    />

                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari Order ID / MID / Outlet..."
                        value={vbSearchQuery}
                        onChange={(e) => { setVbSearchQuery(e.target.value); setVbPage(1); }}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                      />
                    </div>

                    <button
                      onClick={resetVBFilters}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#16A34A] hover:bg-green-50 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset Filter
                    </button>
                  </div>
                </div>
              )}

              {/* VB Order Log Section */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-gray-800">Order Log</h2>
                    <span className="text-gray-400" title="Sumber: 4. Trx - Order Log (tab pertama)">
                      <Info className="w-4 h-4" />
                    </span>
                    <span className="text-xs text-gray-400">Sumber: 4. Trx - Order Log (tab pertama)</span>
                  </div>
                </div>


                {/* VB Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                          <button className="flex items-center gap-1 hover:text-gray-800 transition-colors">
                            Date &amp; Time
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Order ID</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Platform</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">VB</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Physical Outlet</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            Platform Listing / SID
                            <Info className="w-3.5 h-3.5 text-gray-400" />
                          </span>
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Order Status</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Order Value</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Revenue</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">COGS</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Gross Margin</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedVB.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="px-4 py-16 text-center text-gray-400 text-sm">
                            Tidak ada data yang sesuai filter.
                          </td>
                        </tr>
                      ) : (
                        paginatedVB.map((t, idx) => {
                          const gmPercent = t.revenue > 0 ? ((t.grossMargin / t.revenue) * 100).toFixed(1) : '0.0';
                          return (
                            <tr
                              key={t.id}
                              className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                                idx % 2 === 0 ? '' : 'bg-gray-50/30'
                              }`}
                            >
                              <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap text-xs">{t.dateTime}</td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <Link
                                  to={`/transactions/vb/${t.orderId}`}
                                  className="font-mono text-xs text-[#2563EB] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                                >
                                  {t.orderId}
                                </Link>
                              </td>
                              <td className="px-4 py-3.5">
                                <PlatformIcon platform={t.platform} />
                              </td>
                              <td className="px-4 py-3.5 text-sm text-gray-700 whitespace-nowrap">{t.vb}</td>
                              <td className="px-4 py-3.5 text-sm text-gray-700 whitespace-nowrap">{t.physicalOutlet.replace(' - ', ' \u2013 ')}</td>
                              <td className="px-4 py-3.5">
                                <span className="text-sm text-gray-700 block">{t.platformListing}</span>
                                <span className="text-xs font-mono text-gray-400">MID: {t.mid}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <StatusBadge status={t.status} />
                              </td>
                              <td className="px-4 py-3.5 text-right text-sm text-gray-700 whitespace-nowrap">{formatRupiah(t.orderValue)}</td>
                              <td className="px-4 py-3.5 text-right text-sm text-gray-700 whitespace-nowrap">{formatRupiah(t.revenue)}</td>
                              <td className="px-4 py-3.5 text-right text-sm text-gray-700 whitespace-nowrap">{formatRupiah(t.cogs)}</td>
                              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                <span className="text-sm font-semibold text-[#16A34A]">{formatRupiah(t.grossMargin)}</span>
                                <span className="block text-xs text-[#16A34A]">({gmPercent}%)</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <Link
                                  to={`/transactions/vb/${t.orderId}`}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                                  aria-label={`Lihat detail ${t.orderId}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* VB Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    {filteredVB.length > 0
                      ? `Menampilkan ${vbStart}-${vbEnd} dari ${VB_TOTAL_ORDER_COUNT.toLocaleString('id-ID')} transaksi`
                      : 'Tidak ada data'}
                  </p>

                  <div className="flex items-center gap-3">
                    <nav className="flex items-center gap-1" aria-label="Pagination">
                      <button
                        onClick={() => goToVBPage(vbPage - 1)}
                        disabled={vbPage === 1}
                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      {vbPageNumbers.map((num, i) =>
                        num === null ? (
                          <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm text-gray-400">...</span>
                        ) : (
                          <button
                            key={num}
                            onClick={() => goToVBPage(num)}
                            className={`w-8 h-8 rounded text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                              num === vbPage ? 'bg-[#2563EB] text-white' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            aria-label={`Page ${num}`}
                            aria-current={num === vbPage ? 'page' : undefined}
                          >
                            {num}
                          </button>
                        )
                      )}
                      <button
                        onClick={() => goToVBPage(vbPage + 1)}
                        disabled={vbPage === totalVBPages}
                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                    </nav>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="relative">
                        <select
                          value={vbRowsPerPage}
                          onChange={(e) => { setVbRowsPerPage(Number(e.target.value)); setVbPage(1); }}
                          className="appearance-none border border-gray-200 rounded-md pl-3 pr-7 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
                          aria-label="Rows per page"
                        >
                          {ROWS_PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n} / halaman</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TransactionExplorerPage;
