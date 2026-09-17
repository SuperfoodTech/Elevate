import React, { useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  Layers,
  Search,
  ChevronDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Building2,
  Store,
  Users,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Download,
  CreditCard,
  X
} from 'lucide-react';
import {
  type ListingRecord,
  type PlatformType,
  type ListingStatus,
  parseDBRToListings
} from '../data/listings';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const GOOGLE_SHEETS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsAq8JmDfGI8KY7aSCRpzC2EaQARkK1OvhWrll7g3qlxFMIcwtDpAF-Wxf4aQnGET4eCmncjdEgre5/pub?output=csv';

function PlatformBadge({ platform }: { platform: PlatformType }) {
  if (platform === 'GoFood') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
        GoFood
      </span>
    );
  }
  if (platform === 'GrabFood') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
        GrabFood
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" />
      ShopeeFood
    </span>
  );
}

function StatusBadge({ status }: { status: ListingStatus }) {
  if (status === 'Live') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#DCFCE7] text-[#166534]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
        Live
      </span>
    );
  }
  if (status === 'Need Review') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#FEF3C7] text-[#92400E]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
        Need Review
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
        className="appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent cursor-pointer min-w-[150px]"
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

export const ListingsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterOutlet, setFilterOutlet] = useState('all');

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(() => {
    return localStorage.getItem('elevate_owners_last_fetched');
  });

  const [listings, setListings] = useState<ListingRecord[]>(() => {
    const cachedCsv = localStorage.getItem('elevate_dbr_raw_csv');
    if (cachedCsv) {
      try {
        let cachedOwners: any[] = [];
        const rawOwners = localStorage.getItem('elevate_owners_real_data');
        if (rawOwners) {
          cachedOwners = JSON.parse(rawOwners);
        }
        const parsed = parseDBRToListings(cachedCsv, cachedOwners);
        if (parsed.length > 0) return parsed;
      } catch {
        // ignore parse error
      }
    }
    return [];
  });

  const isRealData = listings.length > 0;

  const handleFetchRealData = async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const response = await fetch(GOOGLE_SHEETS_CSV_URL);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const csvText = await response.text();
      let cachedOwners: any[] = [];
      const rawOwners = localStorage.getItem('elevate_owners_real_data');
      if (rawOwners) {
        try {
          cachedOwners = JSON.parse(rawOwners);
        } catch {
          // ignore
        }
      }

      const parsed = parseDBRToListings(csvText, cachedOwners);
      if (parsed.length === 0) {
        throw new Error('Data CSV DBR kosong atau tidak memiliki baris data');
      }

      setListings(parsed);
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

  const handleResetData = () => {
    setListings([]);
    setLastFetched(null);
    setFetchError(null);
    localStorage.removeItem('elevate_dbr_raw_csv');
    localStorage.removeItem('elevate_owners_real_data');
    localStorage.removeItem('elevate_owners_last_fetched');
    setPage(1);
  };

  useEffect(() => {
    const cachedCsv = localStorage.getItem('elevate_dbr_raw_csv');
    if (!cachedCsv && listings.length === 0) {
      handleFetchRealData();
    }
  }, []);

  const brandsOptions = useMemo(() => {
    const set = new Set(listings.map((l) => l.namaBrand).filter(Boolean));
    return [{ value: 'all', label: 'Semua Brand' }, ...Array.from(set).map((b) => ({ value: b, label: b }))];
  }, [listings]);

  const outletsOptions = useMemo(() => {
    const set = new Set(listings.map((l) => l.outlet).filter(Boolean));
    return [{ value: 'all', label: 'Semua Outlet' }, ...Array.from(set).map((o) => ({ value: o, label: o }))];
  }, [listings]);

  const platformOptions = [
    { value: 'all', label: 'Semua Platform' },
    { value: 'GoFood', label: 'GoFood' },
    { value: 'GrabFood', label: 'GrabFood' },
    { value: 'ShopeeFood', label: 'ShopeeFood' }
  ];

  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'Live', label: 'Live' },
    { value: 'Need Review', label: 'Need Review' },
    { value: 'Inactive', label: 'Inactive' }
  ];

  const filteredListings = useMemo(() => {
    const cleanSearch = deferredSearchQuery.trim().toLowerCase();
    const searchTokens = cleanSearch.split(/\s+/).filter(Boolean);

    return listings.filter((l) => {
      if (filterPlatform !== 'all' && l.aplikator !== filterPlatform) return false;
      if (filterStatus !== 'all' && l.statusListing !== filterStatus) return false;
      if (filterBrand !== 'all' && l.namaBrand !== filterBrand) return false;
      if (filterOutlet !== 'all' && l.outlet !== filterOutlet) return false;

      if (searchTokens.length > 0) {
        const corpus =
          l._searchIndex ||
          `${l.namaListing} ${l.storeId} ${l.groupId} ${l.namaBrand} ${l.namaPemilik} ${l.outlet} ${l.aplikator} ${l.namaBank} ${l.statusListing}`.toLowerCase();

        if (!searchTokens.every((tok) => corpus.includes(tok))) {
          return false;
        }
      }

      return true;
    });
  }, [listings, filterPlatform, filterStatus, filterBrand, filterOutlet, deferredSearchQuery]);

  const summaryKpi = useMemo(() => {
    const total = listings.length;
    const live = listings.filter((l) => l.statusListing === 'Live').length;
    const needReview = listings.filter((l) => l.statusListing === 'Need Review').length;
    const gofood = listings.filter((l) => l.aplikator === 'GoFood').length;
    const grabfood = listings.filter((l) => l.aplikator === 'GrabFood').length;
    const shopeefood = listings.filter((l) => l.aplikator === 'ShopeeFood').length;

    return { total, live, needReview, gofood, grabfood, shopeefood };
  }, [listings]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / rowsPerPage));

  const paginatedListings = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredListings.slice(start, start + rowsPerPage);
  }, [filteredListings, page, rowsPerPage]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterPlatform('all');
    setFilterStatus('all');
    setFilterBrand('all');
    setFilterOutlet('all');
    setPage(1);
  }, []);

  const handleExportCSV = () => {
    const headers = [
      'Store ID',
      'Aplikator',
      'Nama Listing',
      'Brand',
      'Physical Outlet',
      'Pemilik',
      'Bank',
      'No Rekening',
      'Pemilik Rekening',
      'Status Listing',
      'Status Internal',
      'Group ID',
      'Link'
    ];

    const rows = filteredListings.map((l) => [
      l.storeId,
      l.aplikator,
      `"${l.namaListing}"`,
      `"${l.namaBrand}"`,
      `"${l.outlet}"`,
      `"${l.namaPemilik}"`,
      l.namaBank,
      `'${l.nomorRekening}`,
      `"${l.namaPemilikRekening}"`,
      l.statusListing,
      l.statusInternal,
      l.groupId,
      l.link
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `listings-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const topBarActions = (
    <div className="flex items-center gap-2.5">
      {lastFetched && (
        <span className="text-xs text-gray-400 hidden lg:inline">
          Diperbarui: {lastFetched}
        </span>
      )}
      {fetchError && (
        <span className="text-xs text-[#DC2626] font-medium hidden sm:inline-flex items-center gap-1 bg-[#FEF2F2] px-2.5 py-1 rounded-md border border-[#FEE2E2]">
          <AlertCircle className="w-3.5 h-3.5" />
          {fetchError}
        </span>
      )}
      {isRealData && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          Live DBR
        </span>
      )}
      <button
        onClick={handleFetchRealData}
        disabled={isFetching}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        <span>{isFetching ? 'Sinkronisasi...' : 'Tarik Data DBR'}</span>
      </button>
      {isRealData && (
        <button
          onClick={handleResetData}
          title="Hapus cache lokal DBR"
          className="p-1.5 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors border border-[#E5E7EB]"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <DashboardLayout title="Listings" actions={topBarActions}>
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link to="/dashboard" className="hover:text-gray-900 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Listings</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Katalog seluruh listing aplikator online merchant (GoFood, GrabFood, ShopeeFood) terhubung hierarki Brand & Cabang Fisik.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm self-start md:self-auto"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-[#2563EB]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Total Listings</p>
              <p className="text-2xl font-bold text-[#2563EB]">{summaryKpi.total.toLocaleString('id-ID')}</p>
              <p className="text-xs text-gray-400 mt-0.5">seluruh platform terdaftar</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-[#ECFDF5] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-[#059669]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Live Listings</p>
              <p className="text-2xl font-bold text-[#059669]">{summaryKpi.live.toLocaleString('id-ID')}</p>
              <p className="text-xs text-gray-400 mt-0.5">aktif beroperasi normal</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#D97706]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Perlu Review</p>
              <p className="text-2xl font-bold text-[#D97706]">{summaryKpi.needReview.toLocaleString('id-ID')}</p>
              <p className="text-xs text-gray-400 mt-0.5">unregistered / unmanaged</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-[#FAF5FF] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-medium mb-1.5">Sebaran Platform</p>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="text-[#DC2626]">GO: {summaryKpi.gofood}</span>
                <span className="text-gray-300">|</span>
                <span className="text-[#059669]">GR: {summaryKpi.grabfood}</span>
                <span className="text-gray-300">|</span>
                <span className="text-[#C2410C]">SH: {summaryKpi.shopeefood}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">GoFood, Grab, Shopee</p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama listing, store ID, brand, pemilik, outlet, atau bank..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <SelectDropdown
              value={filterPlatform}
              onChange={(v) => {
                setFilterPlatform(v);
                setPage(1);
              }}
              options={platformOptions}
              label="Filter Platform"
            />

            <SelectDropdown
              value={filterStatus}
              onChange={(v) => {
                setFilterStatus(v);
                setPage(1);
              }}
              options={statusOptions}
              label="Filter Status"
            />

            <SelectDropdown
              value={filterBrand}
              onChange={(v) => {
                setFilterBrand(v);
                setPage(1);
              }}
              options={brandsOptions}
              label="Filter Brand"
            />

            <SelectDropdown
              value={filterOutlet}
              onChange={(v) => {
                setFilterOutlet(v);
                setPage(1);
              }}
              options={outletsOptions}
              label="Filter Outlet"
            />

            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ml-auto"
              title="Reset Filter"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Listings Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500">Nama Listing & Platform</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500">Brand</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500">Physical Outlet</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500">Pemilik / Owner</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500">Rekening Pencairan</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500">Status</th>
                  <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-right">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedListings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-500">
                      <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-base font-semibold text-gray-700">Tidak ada listing yang cocok</p>
                      <p className="text-sm text-gray-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter yang dipilih.</p>
                      <button
                        onClick={resetFilters}
                        className="mt-4 px-4 py-2 text-sm text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] font-medium rounded-lg transition-colors"
                      >
                        Reset Filter
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedListings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* 1. Nama Listing & Platform */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <Link
                            to={`/listings/${listing.id}`}
                            className="font-semibold text-gray-900 hover:text-[#2563EB] hover:underline text-sm truncate max-w-xs"
                            title="Buka detail listing"
                          >
                            {listing.namaListing}
                          </Link>
                          <div className="flex items-center gap-2">
                            <PlatformBadge platform={listing.aplikator} />
                            <span className="font-mono text-[11px] text-gray-500">ID: {listing.storeId}</span>
                            {listing.groupId && listing.groupId !== '-' && (
                              <span className="text-[10px] text-gray-400 font-mono">Grp: {listing.groupId}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Brand */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/brands/${listing.brandId}`}
                          className="font-medium text-[#2563EB] hover:underline text-sm inline-flex items-center gap-1.5"
                        >
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          <span>{listing.namaBrand}</span>
                        </Link>
                      </td>

                      {/* 3. Physical Outlet */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/outlets/${listing.outletId}`}
                          className="font-medium text-gray-800 hover:text-[#2563EB] text-sm inline-flex items-center gap-1.5"
                        >
                          <Store className="w-3.5 h-3.5 text-gray-400" />
                          <span>{listing.outlet}</span>
                        </Link>
                        {listing.alamat && (
                          <p className="text-xs text-gray-400 truncate max-w-[220px] mt-0.5">{listing.alamat}</p>
                        )}
                      </td>

                      {/* 4. Pemilik / Owner */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/owners/${listing.ownerId}`}
                          className="text-sm font-medium text-gray-800 hover:text-[#2563EB] inline-flex items-center gap-1.5"
                        >
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span>{listing.namaPemilik}</span>
                        </Link>
                      </td>

                      {/* 5. Rekening Pencairan */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-gray-800 flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-gray-400" />
                            {listing.namaBank}
                          </span>
                          <span className="font-mono text-xs text-gray-500">{listing.nomorRekening}</span>
                          <span className="text-[11px] text-gray-400 truncate max-w-[180px]">{listing.namaPemilikRekening}</span>
                        </div>
                      </td>

                      {/* 6. Status Listing */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={listing.statusListing} />
                      </td>

                      {/* 7. Link Consumer Side */}
                      <td className="py-3.5 px-4 text-right">
                        {listing.link && listing.link !== '#' ? (
                          <a
                            href={listing.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-md transition-colors border border-[#BFDBFE]"
                            title="Buka halaman toko di aplikasi konsumen"
                          >
                            <span>Buka Toko</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            Tidak ada link
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                Menampilkan {filteredListings.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} -{' '}
                {Math.min(page * rowsPerPage, filteredListings.length)} dari {filteredListings.length} listing
              </span>
              <div className="flex items-center gap-1">
                <span>Baris:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-700 bg-white"
                >
                  {ROWS_PER_PAGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 text-xs text-gray-700 font-medium">
                {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
