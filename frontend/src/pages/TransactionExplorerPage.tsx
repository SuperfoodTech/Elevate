import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import {
  MOCK_TRANSACTIONS,
  TOTAL_ORDER_COUNT,
  formatRupiah,
  type Platform,
  type OrderStatus,
} from '../data/transactions';

type SubTab = 'agency' | 'vb';

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

function StatusBadge({ status }: { status: OrderStatus }) {
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
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('agency');
  const [filterOwner, setFilterOwner] = useState('all');
  const [filterOutlet, setFilterOutlet] = useState('all');
  const [filterListing, setFilterListing] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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

  const filtered = useMemo(() => {
    return MOCK_TRANSACTIONS.filter((t) => {
      if (filterOwner !== 'all' && t.owner !== filterOwner) return false;
      if (filterOutlet !== 'all' && t.physicalOutlet !== filterOutlet) return false;
      if (filterListing !== 'all' && t.platformListing !== filterListing) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!t.orderId.toLowerCase().includes(q) && !t.sid.toLowerCase().includes(q) && !t.physicalOutlet.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [filterOwner, filterOutlet, filterListing, filterStatus, searchQuery]);

  const kpi = useMemo(() => {
    const sukses = filtered.filter((t) => t.status === 'Sukses');
    const batal = filtered.filter((t) => t.status === 'Batal');
    const lostRevenue = batal.reduce((sum, t) => sum + t.orderValue, 0);
    const lostAgencyFee = batal.reduce((sum, t) => sum + t.agencyFee, 0);
    return {
      suksesCount: sukses.length,
      batalCount: batal.length,
      total: filtered.length,
      suksesRate: filtered.length > 0 ? ((sukses.length / filtered.length) * 100).toFixed(1) : '0.0',
      batalRate: filtered.length > 0 ? ((batal.length / filtered.length) * 100).toFixed(1) : '0.0',
      lostRevenue,
      lostAgencyFee,
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, currentPage, rowsPerPage]);

  const resetFilters = useCallback(() => {
    setFilterOwner('all');
    setFilterOutlet('all');
    setFilterListing('all');
    setFilterStatus('all');
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) setCurrentPage(page);
    },
    [totalPages]
  );

  function handleRowsPerPageChange(val: string) {
    setRowsPerPage(Number(val));
    setCurrentPage(1);
  }

  function handleFilterChange<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setCurrentPage(1);
    };
  }

  function exportCSV() {
    const headers = ['Date & Time', 'Order ID', 'Platform', 'Owner', 'Physical Outlet', 'Platform Listing / SID', 'Status', 'Order Value', 'Agency Fee'];
    const rows = filtered.map((t) => [
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
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  const displayStart = filtered.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const displayEnd = Math.min(currentPage * rowsPerPage, filtered.length);

  // Page numbers to show in pagination
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, null, totalPages];
    if (currentPage >= totalPages - 2) return [1, null, totalPages - 2, totalPages - 1, totalPages];
    return [1, null, currentPage - 1, currentPage, currentPage + 1, null, totalPages];
  }, [totalPages, currentPage]);

  return (
    <DashboardLayout title="Transaction Explorer">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-full px-6 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
            <Link to="/dashboard" className="hover:text-gray-700 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-gray-400">Transactions</span>
            <span>/</span>
            <span className="text-gray-800 font-medium">Transaction Explorer</span>
          </nav>

          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Transaction Explorer</h1>
            <p className="mt-1 text-sm text-gray-500">
              Telusuri setiap transaksi Agency secara detail berdasarkan Order ID.
            </p>
          </div>

          {/* Sub-tabs + actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-0 border-b border-gray-200">
              <button
                onClick={() => setActiveSubTab('agency')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                  activeSubTab === 'agency'
                    ? 'border-[#E53935] text-[#E53935]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Agency Transactions
              </button>
              <button
                onClick={() => setActiveSubTab('vb')}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                  activeSubTab === 'vb'
                    ? 'border-[#E53935] text-[#E53935]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                VB Transactions
              </button>
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
                      onClick={() => setExportOpen(false)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                      disabled
                    >
                      Export as Excel (soon)
                    </button>
                  </div>
                )}
              </div>

              {/* Filter button */}
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#E53935] hover:bg-[#C62828] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] focus-visible:ring-offset-2">
                <SlidersHorizontal className="w-4 h-4" />
                Filter
              </button>
            </div>
          </div>

          {activeSubTab === 'vb' ? (
            <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-24 text-center">
              <p className="text-gray-500 text-sm">Tab VB Transactions sedang dalam pengembangan.</p>
              <p className="text-gray-400 text-xs mt-1">Konten akan tersedia segera.</p>
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Successful Orders */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5 text-[#16A34A]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Successful Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{kpi.suksesCount.toLocaleString('id-ID')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{kpi.suksesRate}% dari total order</p>
                  </div>
                </div>

                {/* Cancelled Orders */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0">
                    <CircleX className="w-5 h-5 text-[#D97706]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Cancelled Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{kpi.batalCount.toLocaleString('id-ID')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{kpi.batalRate}% dari total order</p>
                  </div>
                </div>

                {/* Potential Lost Revenue */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                    <Banknote className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Potential Lost Revenue</p>
                    <p className="text-xl font-bold text-gray-900">{formatRupiah(kpi.lostRevenue)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Dari order yang batal</p>
                  </div>
                </div>

                {/* Potential Lost Agency Fee */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#F5F3FF] flex items-center justify-center shrink-0">
                    <Receipt className="w-5 h-5 text-[#7C3AED]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Potential Lost Agency Fee</p>
                    <p className="text-xl font-bold text-gray-900">{formatRupiah(kpi.lostAgencyFee)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Dari order yang batal</p>
                  </div>
                </div>
              </div>

              {/* Filter bar */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Date range (display-only for now, real picker per mockup) */}
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white cursor-default min-w-[200px]">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>26 Agu 2026 - 1 Sep 2026</span>
                    <ChevronDown className="w-4 h-4 text-gray-400 ml-auto shrink-0" />
                  </div>

                  <SelectDropdown
                    value={filterOwner}
                    onChange={handleFilterChange(setFilterOwner)}
                    options={owners}
                    label="Filter Owner"
                  />

                  <SelectDropdown
                    value={filterOutlet}
                    onChange={handleFilterChange(setFilterOutlet)}
                    options={outlets}
                    label="Filter Physical Outlet"
                  />

                  <SelectDropdown
                    value={filterListing}
                    onChange={handleFilterChange(setFilterListing)}
                    options={listings}
                    label="Filter Platform Listing"
                  />

                  <SelectDropdown
                    value={filterStatus}
                    onChange={handleFilterChange(setFilterStatus)}
                    options={[
                      { value: 'all', label: 'Semua Status' },
                      { value: 'Sukses', label: 'Sukses' },
                      { value: 'Batal', label: 'Batal' },
                    ]}
                    label="Filter Status"
                  />

                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari Order ID atau SID..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                    />
                  </div>

                  {/* Reset */}
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#E53935] hover:text-[#C62828] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] rounded px-1 py-1 shrink-0"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Filter
                  </button>
                </div>
              </div>

              {/* Result count */}
              <p className="text-sm text-gray-500 mb-3 px-0.5">
                {filtered.length > 0
                  ? `Menampilkan ${displayStart} - ${displayEnd} dari ${TOTAL_ORDER_COUNT.toLocaleString('id-ID')} order`
                  : 'Tidak ada data yang sesuai filter'}
              </p>

              {/* Table */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
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
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-16 text-center text-gray-400 text-sm">
                            Tidak ada transaksi yang sesuai filter. Ubah atau reset filter untuk melihat data.
                          </td>
                        </tr>
                      ) : (
                        paginated.map((t, idx) => (
                          <tr
                            key={t.id}
                            className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}
                          >
                            <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{t.dateTime}</td>
                            <td className="px-4 py-3.5 font-mono text-xs text-gray-700 whitespace-nowrap">{t.orderId}</td>
                            <td className="px-4 py-3.5">
                              <PlatformIcon platform={t.platform} />
                            </td>
                            <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{t.owner}</td>
                            <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{t.physicalOutlet}</td>
                            <td className="px-4 py-3.5">
                              <span className="text-gray-700">{t.platformListing}</span>
                              <span className="block text-xs font-mono text-gray-400">{t.sid}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <StatusBadge status={t.status} />
                            </td>
                            <td className="px-4 py-3.5 text-right text-gray-700 whitespace-nowrap">{formatRupiah(t.orderValue)}</td>
                            <td className="px-4 py-3.5 text-right text-gray-700 whitespace-nowrap">{formatRupiah(t.agencyFee)}</td>
                            <td className="px-4 py-3.5">
                              <Link
                                to={`/transactions/${t.orderId}`}
                                className="text-[#2563EB] text-sm font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
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

                {/* Pagination footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Rows per page</span>
                    <div className="relative">
                      <select
                        value={rowsPerPage}
                        onChange={(e) => handleRowsPerPageChange(e.target.value)}
                        className="appearance-none border border-gray-200 rounded-md px-3 py-1.5 pr-7 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent cursor-pointer"
                        aria-label="Rows per page"
                      >
                        {ROWS_PER_PAGE_OPTIONS.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <nav className="flex items-center gap-1" aria-label="Pagination">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>

                    {pageNumbers.map((num, i) =>
                      num === null ? (
                        <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm text-gray-400">...</span>
                      ) : (
                        <button
                          key={num}
                          onClick={() => goToPage(num)}
                          className={`w-8 h-8 rounded text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                            num === currentPage
                              ? 'bg-[#2563EB] text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          aria-label={`Page ${num}`}
                          aria-current={num === currentPage ? 'page' : undefined}
                        >
                          {num}
                        </button>
                      )
                    )}

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TransactionExplorerPage;
