import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  Store,
  Search,
  ChevronDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { MOCK_OUTLETS, type OutletRecord, type OutletStatus } from '../data/outlets';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const GOOGLE_SHEETS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsAq8JmDfGI8KY7aSCRpzC2EaQARkK1OvhWrll7g3qlxFMIcwtDpAF-Wxf4aQnGET4eCmncjdEgre5/pub?output=csv';

interface DBRRow {
  namaPemilik: string;
  namaBrand: string;
  model: string;
  outlet: string;
  aplikator: string;
  groupId: string;
  namaListing: string;
  link: string;
  storeId: string;
  statusListing: string;
  alamat: string;
  statusInternal: string;
  tarif: number;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current);
        current = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
      } else if (char === '\n') {
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
      } else {
        current += char;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

function parseDBRRows(csvText: string): DBRRow[] {
  const startIdx = csvText.indexOf('Nama Pemilik,Nama Brand');
  const validText = startIdx >= 0 ? csvText.slice(startIdx) : csvText;
  const rows = parseCSV(validText);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  const parsedRows: DBRRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;

    const getCol = (name: string) => {
      const idx = headers.indexOf(name);
      return idx >= 0 && idx < row.length ? row[idx].trim() : '';
    };

    const namaPemilik = getCol('Nama Pemilik');
    if (!namaPemilik) continue;

    parsedRows.push({
      namaPemilik,
      namaBrand: getCol('Nama Brand'),
      model: getCol('Model'),
      outlet: getCol('Outlet'),
      aplikator: getCol('Aplikator'),
      groupId: getCol('Group ID'),
      namaListing: getCol('Nama Listing'),
      link: getCol('Link'),
      storeId: getCol('Store ID'),
      statusListing: getCol('Status Listing'),
      alamat: getCol('Alamat'),
      statusInternal: getCol('Status Internal'),
      tarif: parseInt(getCol('Tarif'), 10) || 1500
    });
  }

  return parsedRows;
}

function transformDBRToOutlets(rawRows: DBRRow[], cachedOwners: any[]): OutletRecord[] {
  const ownerVipMap = new Map<string, { isVip: boolean; ownerId: string }>();
  if (Array.isArray(cachedOwners)) {
    for (const ow of cachedOwners) {
      if (ow && ow.name) {
        ownerVipMap.set(ow.name.trim().toLowerCase(), {
          isVip: !!ow.isVip,
          ownerId: ow.id || 'OWN-001'
        });
      }
    }
  }

  const outletGroupMap = new Map<
    string,
    {
      name: string;
      brand: string;
      ownerName: string;
      alamat: string;
      gofood: number;
      grabfood: number;
      shopeefood: number;
      needReviewCount: number;
      hasActive: boolean;
      hasInactive: boolean;
    }
  >();

  for (const r of rawRows) {
    const outletName = r.outlet.trim() || `${r.namaBrand || r.namaPemilik} Outlet`;
    const ownerName = r.namaPemilik.trim();
    const groupKey = `${outletName.toLowerCase()}:::${ownerName.toLowerCase()}`;

    if (!outletGroupMap.has(groupKey)) {
      outletGroupMap.set(groupKey, {
        name: outletName,
        brand: r.namaBrand.trim() || r.namaPemilik.trim(),
        ownerName,
        alamat: r.alamat.trim(),
        gofood: 0,
        grabfood: 0,
        shopeefood: 0,
        needReviewCount: 0,
        hasActive: false,
        hasInactive: false
      });
    }

    const group = outletGroupMap.get(groupKey)!;
    if (!group.alamat && r.alamat.trim()) {
      group.alamat = r.alamat.trim();
    }
    if (!group.brand && r.namaBrand.trim()) {
      group.brand = r.namaBrand.trim();
    }

    const app = r.aplikator.toLowerCase();
    if (app.includes('gofood') || app.includes('go food')) {
      group.gofood++;
    } else if (app.includes('grab') || app.includes('grabfood')) {
      group.grabfood++;
    } else if (app.includes('shopee') || app.includes('shopeefood')) {
      group.shopeefood++;
    }

    const statusListingLower = r.statusListing.toLowerCase();
    const statusInternalLower = r.statusInternal.toLowerCase();

    if (
      statusListingLower.includes('unregistered') ||
      statusListingLower.includes('review') ||
      statusInternalLower.includes('unmanaged')
    ) {
      group.needReviewCount++;
    }

    if (statusInternalLower.includes('live') || statusListingLower.includes('active')) {
      group.hasActive = true;
    }
    if (statusListingLower.includes('inactive') || statusListingLower.includes('tutup')) {
      group.hasInactive = true;
    }
  }

  const outlets: OutletRecord[] = [];
  let index = 1;

  for (const group of outletGroupMap.values()) {
    const totalListings = group.gofood + group.grabfood + group.shopeefood;
    const ownerLookup = ownerVipMap.get(group.ownerName.toLowerCase());
    const isVip = ownerLookup ? ownerLookup.isVip : totalListings >= 8;
    const ownerId = ownerLookup ? ownerLookup.ownerId : `OWN-${String(index).padStart(3, '0')}`;

    let area = 'Surabaya';
    let city = 'Surabaya';
    const lowerAlamat = group.alamat.toLowerCase();

    if (lowerAlamat.includes('timur')) area = 'Surabaya Timur';
    else if (lowerAlamat.includes('barat')) area = 'Surabaya Barat';
    else if (lowerAlamat.includes('selatan')) area = 'Surabaya Selatan';
    else if (lowerAlamat.includes('utara')) area = 'Surabaya Utara';
    else if (lowerAlamat.includes('pusat')) area = 'Surabaya Pusat';
    else if (lowerAlamat.includes('sidoarjo')) {
      area = 'Sidoarjo';
      city = 'Sidoarjo';
    } else if (lowerAlamat.includes('gresik')) {
      area = 'Gresik';
      city = 'Gresik';
    }

    let status: OutletStatus = 'Active';
    if (group.needReviewCount > 0) {
      status = 'Attention';
    } else if (group.hasInactive && !group.hasActive) {
      status = 'Inactive';
    }

    const avgDailyOrders = Math.max(18, Math.round(totalListings * 24 + 15));
    const weeklyOrders = avgDailyOrders * 7;

    outlets.push({
      id: btoa(`${group.name}:::${group.ownerName}`).replace(/=/g, ''),
      name: group.name,
      brand: group.brand,
      ownerId,
      ownerName: group.ownerName,
      area,
      city,
      address: group.alamat || 'Alamat cabang belum terdata di DBR',
      platforms: {
        gofood: group.gofood,
        grabfood: group.grabfood,
        shopeefood: group.shopeefood,
        total: totalListings
      },
      status,
      weeklyOrders,
      avgDailyOrders,
      isVip,
      botActive: group.needReviewCount === 0,
      needReviewCount: group.needReviewCount
    });
  }

  return outlets;
}

function StatusBadge({ status }: { status: OutletStatus }) {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#DCFCE7] text-[#166534]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
        Active
      </span>
    );
  }
  if (status === 'Attention') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#FEF3C7] text-[#92400E]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
        Attention
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      Inactive
    </span>
  );
}

function SelectDropdown({
  value,
  onChange,
  options,
  label
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

export const OutletsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterArea, setFilterArea] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(() => {
    return localStorage.getItem('elevate_owners_last_fetched');
  });

  const [outlets, setOutlets] = useState<OutletRecord[]>(() => {
    const cachedCsv = localStorage.getItem('elevate_dbr_raw_csv');
    if (cachedCsv) {
      try {
        const rows = parseDBRRows(cachedCsv);
        let cachedOwners: any[] = [];
        const rawOwners = localStorage.getItem('elevate_owners_real_data');
        if (rawOwners) {
          cachedOwners = JSON.parse(rawOwners);
        }
        const transformed = transformDBRToOutlets(rows, cachedOwners);
        if (transformed.length > 0) return transformed;
      } catch {
        // Fallback to MOCK_OUTLETS
      }
    }
    return [];
  });

  const [isRealData, setIsRealData] = useState<boolean>(() => {
    return !!localStorage.getItem('elevate_dbr_raw_csv');
  });

  const handleFetchRealData = async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const response = await fetch(GOOGLE_SHEETS_CSV_URL);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const csvText = await response.text();
      const parsedRows = parseDBRRows(csvText);
      if (parsedRows.length === 0) {
        throw new Error('Data CSV DBR kosong atau tidak memiliki baris data');
      }

      let cachedOwners: any[] = [];
      const rawOwners = localStorage.getItem('elevate_owners_real_data');
      if (rawOwners) {
        try {
          cachedOwners = JSON.parse(rawOwners);
        } catch {
          // ignore
        }
      }

      const transformed = transformDBRToOutlets(parsedRows, cachedOwners);
      if (transformed.length === 0) {
        throw new Error('Tidak ada outlet yang dapat dipetakan dari CSV');
      }

      setOutlets(transformed);
      setIsRealData(true);
      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setLastFetched(now);

      localStorage.setItem('elevate_dbr_raw_csv', csvText);
      localStorage.setItem('elevate_owners_last_fetched', now);
      setPage(1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengambil data dari Google Sheets DBR';
      setFetchError(message);
    } finally {
      setIsFetching(false);
    }
  };

  const handleResetToMock = () => {
    setOutlets([]);
    setIsRealData(false);
    setLastFetched(null);
    setFetchError(null);
    localStorage.removeItem('elevate_dbr_raw_csv');
    localStorage.removeItem('elevate_owners_real_data');
    localStorage.removeItem('elevate_owners_last_fetched');
    setPage(1);
  };

  useEffect(() => {
    const cachedCsv = localStorage.getItem('elevate_dbr_raw_csv');
    if (!cachedCsv) {
      handleFetchRealData();
    }
  }, []);

  const brands = useMemo(() => {
    const set = new Set(outlets.map((o) => o.brand).filter(Boolean));
    return [{ value: 'all', label: 'Semua Brand' }, ...Array.from(set).map((b) => ({ value: b, label: b }))];
  }, [outlets]);

  const areas = useMemo(() => {
    const set = new Set(outlets.map((o) => o.area).filter(Boolean));
    return [{ value: 'all', label: 'Semua Area' }, ...Array.from(set).map((a) => ({ value: a, label: a }))];
  }, [outlets]);

  const statuses = [
    { value: 'all', label: 'Semua Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Attention', label: 'Attention' },
    { value: 'Inactive', label: 'Inactive' }
  ];

  const filteredOutlets = useMemo(() => {
    return outlets.filter((o) => {
      if (filterBrand !== 'all' && o.brand !== filterBrand) return false;
      if (filterArea !== 'all' && o.area !== filterArea) return false;
      if (filterStatus !== 'all' && o.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = o.name.toLowerCase().includes(q);
        const matchBrand = o.brand.toLowerCase().includes(q);
        const matchOwner = o.ownerName.toLowerCase().includes(q);
        const matchAddress = o.address.toLowerCase().includes(q);
        const matchId = o.id.toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchOwner && !matchAddress && !matchId) {
          return false;
        }
      }
      return true;
    });
  }, [outlets, filterBrand, filterArea, filterStatus, searchQuery]);

  const summaryKpi = useMemo(() => {
    const total = outlets.length;
    const active = outlets.filter((o) => o.status === 'Active').length;
    const attention = outlets.filter((o) => o.status === 'Attention').length;
    const totalWeeklyOrders = outlets.reduce((sum, o) => sum + o.weeklyOrders, 0);
    return { total, active, attention, totalWeeklyOrders };
  }, [outlets]);

  const totalPages = Math.max(1, Math.ceil(filteredOutlets.length / rowsPerPage));

  const paginatedOutlets = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredOutlets.slice(start, start + rowsPerPage);
  }, [filteredOutlets, page, rowsPerPage]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterBrand('all');
    setFilterArea('all');
    setFilterStatus('all');
    setPage(1);
  }, []);

  const isFiltered =
    filterBrand !== 'all' || filterArea !== 'all' || filterStatus !== 'all' || searchQuery.trim() !== '';

  const startNumber = filteredOutlets.length === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const endNumber = Math.min(page * rowsPerPage, filteredOutlets.length);

  const topBarActions = (
    <div className="flex items-center gap-2.5">
      {fetchError && (
        <span className="text-xs text-[#DC2626] font-medium hidden sm:inline-flex items-center gap-1 bg-[#FEF2F2] px-2.5 py-1 rounded-md border border-[#FEE2E2]">
          <AlertCircle className="w-3.5 h-3.5" />
          {fetchError}
        </span>
      )}
      {isRealData && (
        <div className="hidden sm:inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            Live DBR ({outlets.length} Outlets) &bull; {lastFetched}
          </span>
          <button
            type="button"
            onClick={handleResetToMock}
            className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] px-2 py-1 rounded hover:bg-[#F1F5F9] transition-colors"
            title="Kembalikan ke data mock default"
          >
            Reset Mock
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={handleFetchRealData}
        disabled={isFetching}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] shadow-xs transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-[#2563EB] ${isFetching ? 'animate-spin' : ''}`} />
        <span>{isFetching ? 'Mengambil Data...' : 'Fetch Data Real'}</span>
      </button>
    </div>
  );

  return (
    <DashboardLayout
      title="Outlets"
      subtitle="Daftar seluruh outlet fisik cabang untuk operasional pesanan dan integrasi platform."
      actions={topBarActions}
    >
      <div className="space-y-6">
        {fetchError && (
          <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-center justify-between text-xs text-[#991B1B]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
              <span>Gagal mengambil data dari Google Sheets: {fetchError}</span>
            </div>
            <button
              type="button"
              onClick={handleFetchRealData}
              className="font-semibold underline hover:text-[#7F1D1D] ml-2"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-1" aria-label="Breadcrumb">
              <Link to="/dashboard" className="hover:text-gray-700 transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-gray-800 font-medium">Outlets</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">Physical Outlets</h1>
            <p className="mt-1 text-sm text-gray-500">
              Daftar seluruh outlet fisik cabang untuk operasional pesanan dan integrasi platform.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 bg-white border border-gray-200 px-3 py-2 rounded-lg font-medium">
                Total: <strong className="text-gray-800 font-mono">{filteredOutlets.length}</strong> outlet
              </span>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-[#2563EB]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Total Physical Outlets</p>
                <p className="text-2xl font-bold text-gray-900">{summaryKpi.total}</p>
                <p className="text-xs text-gray-400 mt-0.5">seluruh brand terdaftar</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Outlets Aktif</p>
                <p className="text-2xl font-bold text-[#16A34A]">{summaryKpi.active}</p>
                <p className="text-xs text-gray-400 mt-0.5">operasional normal</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#D97706]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Perlu Perhatian</p>
                <p className="text-2xl font-bold text-[#D97706]">{summaryKpi.attention}</p>
                <p className="text-xs text-gray-400 mt-0.5">butuh review listing/bot</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-[#FAF5FF] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Orders Minggu Ini</p>
                <p className="text-2xl font-bold text-[#7C3AED]">{summaryKpi.totalWeeklyOrders.toLocaleString('id-ID')}</p>
                <p className="text-xs text-gray-400 mt-0.5">agregat seluruh outlet</p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nama outlet, brand, alamat, atau ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                />
              </div>

              <SelectDropdown
                value={filterBrand}
                onChange={(v) => {
                  setFilterBrand(v);
                  setPage(1);
                }}
                options={brands}
                label="Filter Brand"
              />

              <SelectDropdown
                value={filterArea}
                onChange={(v) => {
                  setFilterArea(v);
                  setPage(1);
                }}
                options={areas}
                label="Filter Area"
              />

              <SelectDropdown
                value={filterStatus}
                onChange={(v) => {
                  setFilterStatus(v);
                  setPage(1);
                }}
                options={statuses}
                label="Filter Status"
              />

              {isFiltered && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#E53935] hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935]"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Outlet Cabang</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Brand / Owner</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Alamat</th>
                    <th className="py-2 px-3 text-center border-x border-[#EBEBEF]" colSpan={3}>
                      <div className="text-[10px] text-[#9C9CA6] font-semibold mb-1">Outlet Listing (by Platform)</div>
                      <div className="grid grid-cols-3 gap-2 font-bold text-[11px]">
                        <span className="text-[#DC2626]">GO</span>
                        <span className="text-[#16A34A]">GR</span>
                        <span className="text-[#EA580C]">S</span>
                      </div>
                    </th>
                    <th className="text-right px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Avg Orders / Hari</th>
                    <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Status Outlet</th>
                    <th className="text-center px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOutlets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center text-sm">
                        <Store className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        {outlets.length === 0 ? (
                          <>
                            <p className="font-semibold text-gray-700">Belum ada data Outlet</p>
                            <p className="text-xs text-gray-400 mt-1">Klik "Fetch Data Real" di kanan atas untuk memuat data dari DBR.</p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-gray-700">Tidak ada outlet yang cocok</p>
                            <p className="text-xs text-gray-400 mt-1">Coba sesuaikan filter atau kata kunci pencarian.</p>
                          </>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedOutlets.map((outlet, idx) => (
                      <tr
                        key={outlet.id}
                        className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${
                          idx % 2 === 0 ? '' : 'bg-gray-50/30'
                        }`}
                      >
                        {/* Outlet Cabang */}
                        <td className="px-4 py-3.5">
                          <Link
                            to={`/outlets/${outlet.id}`}
                            className="font-medium text-gray-900 hover:text-[#2563EB] transition-colors focus:outline-none focus-visible:underline block"
                          >
                            {outlet.name}
                          </Link>
                          <p className="font-mono text-xs text-gray-400 mt-0.5">{outlet.id}</p>
                        </td>

                        {/* Brand / Owner */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="font-semibold text-gray-800 text-xs">{outlet.brand}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-gray-500">{outlet.ownerName}</span>
                            {outlet.isVip && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                VIP
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Alamat */}
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-gray-800 leading-snug">{outlet.address}</p>
                          <span className="inline-block text-[11px] text-gray-500 font-medium mt-0.5">
                            {outlet.city}
                          </span>
                        </td>

                        {/* Listings by Platform: GO / GR / S */}
                        <td className="py-3 px-2 text-center font-semibold text-[#111827] border-l border-[#F0F0F4] tabular-nums">
                          {outlet.platforms.gofood}
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-[#111827] tabular-nums">
                          {outlet.platforms.grabfood}
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-[#111827] border-r border-[#F0F0F4] tabular-nums">
                          {outlet.platforms.shopeefood}
                        </td>

                        {/* Avg Orders / Hari */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <p className="font-semibold text-gray-900">{outlet.avgDailyOrders} <span className="text-xs text-gray-500 font-normal">/ hari</span></p>
                          <p className="text-xs text-gray-400 font-mono">{outlet.weeklyOrders.toLocaleString('id-ID')} minggu ini</p>
                        </td>

                        {/* Status Outlet */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StatusBadge status={outlet.status} />
                          {outlet.needReviewCount > 0 && (
                            <span className="block text-[11px] text-[#D97706] font-medium mt-0.5">
                              {outlet.needReviewCount} perlu review
                            </span>
                          )}
                        </td>


                        {/* Action */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <Link
                            to={`/outlets/${outlet.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-[#2563EB] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                            title={`Lihat detail ${outlet.name}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Baris per halaman:</span>
                <div className="relative">
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    className="appearance-none border border-gray-200 rounded-md pl-2.5 pr-6 py-1 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
                    aria-label="Baris per halaman"
                  >
                    {ROWS_PER_PAGE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <p className="text-sm text-gray-500">
                {filteredOutlets.length > 0
                  ? `Menampilkan ${startNumber}-${endNumber} dari ${filteredOutlets.length} outlet`
                  : '0 dari 0'}
              </p>

              <nav className="flex items-center gap-1" aria-label="Pagination">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => setPage(num)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                      num === page ? 'bg-[#2563EB] text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    aria-label={`Page ${num}`}
                    aria-current={num === page ? 'page' : undefined}
                  >
                    {num}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </nav>
            </div>
          </div>
        </div>
    </DashboardLayout>
  );
};

export default OutletsPage;
