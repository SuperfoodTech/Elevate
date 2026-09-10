import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  Download,
  SlidersHorizontal,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Eye,
  Info,
} from 'lucide-react';
import {
  MOCK_VB_TRANSACTIONS,
  VB_TOTAL_ORDER_COUNT,
  formatRupiah,
  getPlatformLabel,
  type Platform,
  type OrderStatus,
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
      <div
        className="w-8 h-8 rounded-lg bg-[#00B14F] flex items-center justify-center shrink-0"
        aria-label="GrabFood"
      >
        <span className="text-white text-[8px] font-black leading-none text-center">
          Grab<br />Food
        </span>
      </div>
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

export const VBTransactionExplorerPage: React.FC = () => {
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
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

  const filtered = useMemo(() => {
    return MOCK_VB_TRANSACTIONS.filter((t) => {
      if (filterPlatform !== 'all' && t.platform !== filterPlatform) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
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
  }, [filterPlatform, filterStatus, searchQuery]);

  const kpi = useMemo(() => {
    const total = filtered.length;
    const revenue = filtered.reduce((s, t) => s + t.revenue, 0);
    const cogs = filtered.reduce((s, t) => s + t.cogs, 0);
    const grossMargin = filtered.reduce((s, t) => s + t.grossMargin, 0);
    const gmPercent = revenue > 0 ? ((grossMargin / revenue) * 100).toFixed(1) : '0.0';
    return { total, revenue, cogs, grossMargin, gmPercent };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, currentPage, rowsPerPage]);

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) setCurrentPage(page);
    },
    [totalPages]
  );

  const handleFilterChange = <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setCurrentPage(1);
    };

  function exportCSV() {
    const headers = ['Date & Time', 'Order ID', 'Platform', 'VB', 'Physical Outlet', 'Platform Listing / MID', 'Status', 'Order Value', 'Revenue', 'COGS', 'Gross Margin'];
    const rows = filtered.map((t) => [
      t.dateTime, t.orderId, getPlatformLabel(t.platform), t.vb, t.physicalOutlet,
      `${t.platformListing} / ${t.mid}`, t.status, t.orderValue, t.revenue, t.cogs, t.grossMargin,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vb-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  const displayStart = filtered.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const displayEnd = Math.min(currentPage * rowsPerPage, filtered.length);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, null, totalPages];
    if (currentPage >= totalPages - 2) return [1, null, totalPages - 2, totalPages - 1, totalPages];
    return [1, null, currentPage - 1, currentPage, currentPage + 1, null, totalPages];
  }, [totalPages, currentPage]);

  return (
    <DashboardLayout title="VB Transactions">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-full px-6 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
            <Link to="/dashboard" className="hover:text-gray-700 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-gray-400">VB</span>
            <span>/</span>
            <span className="text-gray-400">Transactions</span>
            <span>/</span>
            <span className="text-gray-800 font-medium">VB Transactions</span>
          </nav>

          {/* Page header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">VB Transactions</h1>
              <p className="mt-1 text-sm text-gray-500">
                Daftar transaksi order dari seluruh platform untuk Virtual Brand (VB).
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Export */}
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setExportOpen((p) => !p)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  aria-haspopup="true"
                  aria-expanded={exportOpen}
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                    <button onClick={exportCSV} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Export as CSV
                    </button>
                    <button disabled className="w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed">
                      Export as Excel (soon)
                    </button>
                  </div>
                )}
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]">
                <SlidersHorizontal className="w-4 h-4" />
                Filter
              </button>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-[#2563EB]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{kpi.total.toLocaleString('id-ID')}</p>
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
                <p className="text-lg font-bold text-[#16A34A]">{formatRupiah(kpi.revenue)}</p>
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
                <p className="text-lg font-bold text-[#EA580C]">{formatRupiah(kpi.cogs)}</p>
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
                <p className="text-lg font-bold text-[#16A34A]">{formatRupiah(kpi.grossMargin)}</p>
                <p className="text-xs text-gray-400 mt-0.5">({kpi.gmPercent}%) margin</p>
              </div>
            </div>
          </div>

          {/* Order Log section */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-800">Order Log</h2>
                <button className="text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded" title="Sumber: 4. Trx - Order Log (tab pertama)">
                  <Info className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-400">Sumber: 4. Trx - Order Log (tab pertama)</span>
              </div>
              <div className="flex items-center gap-2">
                <SelectDropdown
                  value={filterPlatform}
                  onChange={handleFilterChange(setFilterPlatform)}
                  options={[
                    { value: 'all', label: 'All Platform' },
                    { value: 'gofood', label: 'GoFood' },
                    { value: 'grabfood', label: 'GrabFood' },
                    { value: 'shopeefood', label: 'ShopeeFood' },
                  ]}
                  label="Filter Platform"
                />
                <SelectDropdown
                  value={filterStatus}
                  onChange={handleFilterChange(setFilterStatus)}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'Sukses', label: 'Sukses' },
                    { value: 'Batal', label: 'Batal' },
                  ]}
                  label="Filter Status"
                />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari Order ID / Outlet / SID..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 w-64 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
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
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-16 text-center text-gray-400 text-sm">
                        Tidak ada data yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((t, idx) => {
                      const gmPercent = t.revenue > 0 ? ((t.grossMargin / t.revenue) * 100).toFixed(1) : '0.0';
                      return (
                        <tr
                          key={t.id}
                          className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                        >
                          <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap text-xs">{t.dateTime}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Link
                              to={`/vb/transactions/${t.orderId}`}
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
                              to={`/vb/transactions/${t.orderId}`}
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

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {filtered.length > 0
                  ? `Menampilkan ${displayStart}-${displayEnd} dari ${VB_TOTAL_ORDER_COUNT.toLocaleString('id-ID')} transaksi`
                  : 'Tidak ada data'}
              </p>

              <div className="flex items-center gap-3">
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
                          num === currentPage ? 'bg-[#2563EB] text-white' : 'text-gray-600 hover:bg-gray-100'
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

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="relative">
                    <select
                      value={rowsPerPage}
                      onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VBTransactionExplorerPage;
