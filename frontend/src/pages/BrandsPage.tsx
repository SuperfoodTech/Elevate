import React, { useState, useMemo, useCallback, useEffect, useDeferredValue } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  Building2,
  Search,
  ChevronDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Store,
  CheckCircle2,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  Layers,
  X
} from 'lucide-react';
import { type BrandRecord, type BrandStatus, type BusinessModel } from '../data/brands';

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

function transformDBRToBrands(rawRows: DBRRow[], cachedOwners: any[]): BrandRecord[] {
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

  const brandGroupMap = new Map<
    string,
    {
      name: string;
      ownerName: string;
      modelRaw: string;
      outlets: Set<string>;
      addresses: Set<string>;
      listings: Set<string>;
      gofood: number;
      grabfood: number;
      shopeefood: number;
      needReviewCount: number;
      hasActive: boolean;
      hasInactive: boolean;
    }
  >();

  for (const r of rawRows) {
    const brandName = r.namaBrand.trim() || r.namaPemilik.trim();
    const ownerName = r.namaPemilik.trim();
    const groupKey = `${brandName.toLowerCase()}:::${ownerName.toLowerCase()}`;

    if (!brandGroupMap.has(groupKey)) {
      brandGroupMap.set(groupKey, {
        name: brandName,
        ownerName,
        modelRaw: r.model.trim(),
        outlets: new Set<string>(),
        addresses: new Set<string>(),
        listings: new Set<string>(),
        gofood: 0,
        grabfood: 0,
        shopeefood: 0,
        needReviewCount: 0,
        hasActive: false,
        hasInactive: false
      });
    }

    const group = brandGroupMap.get(groupKey)!;
    if (r.outlet.trim()) {
      group.outlets.add(r.outlet.trim());
    }
    if (r.alamat.trim()) {
      group.addresses.add(r.alamat.trim());
    }
    if (r.namaListing.trim()) {
      group.listings.add(r.namaListing.trim());
    }
    if (!group.modelRaw && r.model.trim()) {
      group.modelRaw = r.model.trim();
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

  const brands: BrandRecord[] = [];
  let index = 1;

  for (const group of brandGroupMap.values()) {
    const totalListings = group.gofood + group.grabfood + group.shopeefood;
    const ownerLookup = ownerVipMap.get(group.ownerName.toLowerCase());
    const isVip = ownerLookup ? ownerLookup.isVip : totalListings >= 8;
    const ownerId = ownerLookup ? ownerLookup.ownerId : `OWN-${String(index).padStart(3, '0')}`;

    let model: BusinessModel = 'Agency';
    const lowerModel = group.modelRaw.toLowerCase();
    if (lowerModel.includes('vb') || lowerModel.includes('virtual')) {
      model = 'Virtual Brand';
    } else if (lowerModel.includes('hybrid')) {
      model = 'Hybrid';
    } else {
      model = 'Agency';
    }

    let status: BrandStatus = 'Active';
    if (group.needReviewCount > 0) {
      status = 'Attention';
    } else if (group.hasInactive && !group.hasActive) {
      status = 'Inactive';
    }

    const avgDailyOrders = Math.max(20, Math.round(totalListings * 22 + 10));
    const weeklyOrders = avgDailyOrders * 7;
    const outletNames = Array.from(group.outlets);
    const addresses = Array.from(group.addresses);
    const listingNames = Array.from(group.listings);

    const searchCorpus = [
      group.name,
      group.ownerName,
      ownerId,
      model,
      status
    ]
      .join(' ')
      .toLowerCase();

    const corpusNoSpaces = searchCorpus.replace(/\s+/g, '');

    brands.push({
      id: btoa(`${group.name}:::${group.ownerName}`).replace(/=/g, ''),
      name: group.name,
      ownerId,
      ownerName: group.ownerName,
      model,
      outletsCount: Math.max(1, outletNames.length),
      outletNames,
      addresses,
      listingNames,
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
      needReviewCount: group.needReviewCount,
      _searchIndex: searchCorpus,
      _searchIndexNoSpace: corpusNoSpaces
    });

    index++;
  }

  return brands;
}

function StatusBadge({ status }: { status: BrandStatus }) {
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

function ModelBadge({ model }: { model: BusinessModel }) {
  if (model === 'Virtual Brand') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FAF5FF] text-[#7C3AED] border border-[#E9D5FF]">
        Virtual Brand
      </span>
    );
  }
  if (model === 'Hybrid') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
        Hybrid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
      Agency
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

export const BrandsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [filterModel, setFilterModel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(() => {
    return localStorage.getItem('elevate_owners_last_fetched');
  });

  const [brands, setBrands] = useState<BrandRecord[]>(() => {
    const cachedCsv = localStorage.getItem('elevate_dbr_raw_csv');
    if (cachedCsv) {
      try {
        const rows = parseDBRRows(cachedCsv);
        let cachedOwners: any[] = [];
        const rawOwners = localStorage.getItem('elevate_owners_real_data');
        if (rawOwners) {
          cachedOwners = JSON.parse(rawOwners);
        }
        const transformed = transformDBRToBrands(rows, cachedOwners);
        if (transformed.length > 0) return transformed;
      } catch {
        // Return empty on parse error
      }
    }
    return [];
  });

  const isRealData = brands.length > 0;

  const handleFetchRealData = useCallback(async () => {
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

      const transformed = transformDBRToBrands(parsedRows, cachedOwners);
      if (transformed.length === 0) {
        throw new Error('Tidak ada brand yang dapat dipetakan dari CSV');
      }

      setBrands(transformed);
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
  }, []);

  const handleResetData = () => {
    setBrands([]);
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
  }, [handleFetchRealData]);

  const modelOptions = [
    { value: 'all', label: 'Semua Model' },
    { value: 'Agency', label: 'Agency' },
    { value: 'Virtual Brand', label: 'Virtual Brand' },
    { value: 'Hybrid', label: 'Hybrid' }
  ];

  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Attention', label: 'Attention' },
    { value: 'Inactive', label: 'Inactive' }
  ];

  const filteredBrands = useMemo(() => {
    const cleanSearch = deferredSearchQuery.trim().toLowerCase();
    const searchTokens = cleanSearch.split(/\s+/).filter(Boolean);
    const searchWithoutSpaces = cleanSearch.replace(/\s+/g, '');

    return brands.filter((b) => {
      if (filterModel !== 'all' && b.model !== filterModel) return false;
      if (filterStatus !== 'all' && b.status !== filterStatus) return false;

      if (cleanSearch) {
        const searchCorpus =
          b._searchIndex ||
          [
            b.name,
            b.ownerName,
            b.ownerId,
            b.model,
            b.status
          ]
            .join(' ')
            .toLowerCase();

        const corpusWithoutSpaces =
          b._searchIndexNoSpace || searchCorpus.replace(/\s+/g, '');

        // 1. Multi-token match: every token in search query must match somewhere in brand data
        const tokensMatch = searchTokens.every((token) => searchCorpus.includes(token));

        // 2. Space-insensitive match: e.g. "wonder food" matches "wonderfood"
        const spaceInsensitiveMatch = corpusWithoutSpaces.includes(searchWithoutSpaces);

        if (!tokensMatch && !spaceInsensitiveMatch) {
          return false;
        }
      }

      return true;
    });
  }, [brands, filterModel, filterStatus, deferredSearchQuery]);

  const summaryKpi = useMemo(() => {
    const total = brands.length;
    const active = brands.filter((b) => b.status === 'Active').length;
    const virtualBrands = brands.filter((b) => b.model === 'Virtual Brand').length;
    const totalWeeklyOrders = brands.reduce((sum, b) => sum + b.weeklyOrders, 0);
    return { total, active, virtualBrands, totalWeeklyOrders };
  }, [brands]);

  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / rowsPerPage));

  const paginatedBrands = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredBrands.slice(start, start + rowsPerPage);
  }, [filteredBrands, page, rowsPerPage]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilterModel('all');
    setFilterStatus('all');
    setPage(1);
  }, []);

  const isFiltered = filterModel !== 'all' || filterStatus !== 'all' || searchQuery.trim() !== '';

  const startNumber = filteredBrands.length === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const endNumber = Math.min(page * rowsPerPage, filteredBrands.length);

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
            Live DBR ({brands.length} Brands) &bull; {lastFetched}
          </span>
          <button
            type="button"
            onClick={handleResetData}
            className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] px-2 py-1 rounded hover:bg-[#F1F5F9] transition-colors"
            title="Reset data cache lokal"
          >
            Reset Data
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
      title="Brands"
      subtitle="Daftar seluruh brand aktif dan virtual brand yang dikelola dalam ekosistem FoodMaster."
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
              <span className="text-gray-800 font-medium">Brands</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">Merchant Brands</h1>
            <p className="mt-1 text-sm text-gray-500">
              Daftar seluruh brand aktif dan virtual brand yang dikelola dalam ekosistem FoodMaster.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 bg-white border border-gray-200 px-3 py-2 rounded-lg font-medium">
              Total: <strong className="text-gray-800 font-mono">{filteredBrands.length}</strong> brand
            </span>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-[#2563EB]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Total Brands</p>
              <p className="text-2xl font-bold text-gray-900">{summaryKpi.total}</p>
              <p className="text-xs text-gray-400 mt-0.5">seluruh portofolio merchant</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Brand Aktif</p>
              <p className="text-2xl font-bold text-[#16A34A]">{summaryKpi.active}</p>
              <p className="text-xs text-gray-400 mt-0.5">operasional normal</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-[#FAF5FF] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Virtual Brands (VB)</p>
              <p className="text-2xl font-bold text-[#7C3AED]">{summaryKpi.virtualBrands}</p>
              <p className="text-xs text-gray-400 mt-0.5">ekspansi portofolio virtual</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-[#FFFBEB] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-[#D97706]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Orders Minggu Ini</p>
              <p className="text-2xl font-bold text-[#D97706]">{summaryKpi.totalWeeklyOrders.toLocaleString('id-ID')}</p>
              <p className="text-xs text-gray-400 mt-0.5">agregat estimasi pesanan</p>
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
                placeholder="Cari nama brand, pemilik, atau model bisnis..."
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
              value={filterModel}
              onChange={(v) => {
                setFilterModel(v);
                setPage(1);
              }}
              options={modelOptions}
              label="Filter Model Bisnis"
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
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap min-w-[220px]">Brand</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap min-w-[180px]">Pemilik / Owner</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap min-w-[130px]">Model Bisnis</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap min-w-[120px]">Outlet Fisik</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap min-w-[140px]">Avg Orders / Hari</th>
                  <th className="text-left px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap min-w-[130px]">Status Brand</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-gray-600 whitespace-nowrap min-w-[110px]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBrands.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-sm">
                      <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      {brands.length === 0 ? (
                        <>
                          <p className="font-semibold text-gray-700">Belum ada data Brand</p>
                          <p className="text-xs text-gray-400 mt-1">Klik "Fetch Data Real" di kanan atas untuk memuat data dari DBR.</p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-gray-700">Tidak ada brand yang cocok</p>
                          <p className="text-xs text-gray-400 mt-1">Coba sesuaikan filter atau kata kunci pencarian.</p>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedBrands.map((brand, idx) => (
                    <tr
                      key={brand.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${
                        idx % 2 === 0 ? '' : 'bg-gray-50/30'
                      }`}
                    >
                      {/* Brand */}
                      <td className="px-4 py-3.5 min-w-[220px]">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/brands/${brand.id}`}
                            className="font-medium text-gray-900 hover:text-[#2563EB] transition-colors block"
                          >
                            {brand.name}
                          </Link>
                        </div>
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                          {brand.platforms.total} total listing terdaftar
                        </span>
                      </td>

                      {/* Owner */}
                      <td className="px-4 py-3.5 whitespace-nowrap min-w-[180px]">
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/owners/${brand.ownerId}`}
                            className="text-xs font-semibold text-gray-800 hover:text-[#2563EB] transition-colors"
                          >
                            {brand.ownerName}
                          </Link>
                          {brand.isVip && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              VIP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Model Bisnis */}
                      <td className="px-4 py-3.5 whitespace-nowrap min-w-[130px]">
                        <ModelBadge model={brand.model} />
                      </td>

                      {/* Outlet Fisik */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap min-w-[120px]">
                        <button
                          type="button"
                          onClick={() => navigate(`/outlets?brand=${encodeURIComponent(brand.name)}`)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-[#2563EB] text-xs font-semibold transition-colors"
                          title={`Lihat cabang outlet untuk ${brand.name}`}
                        >
                          <Store className="w-3.5 h-3.5" />
                          <span>{brand.outletsCount} Cabang</span>
                        </button>
                      </td>

                      {/* Avg Orders / Hari */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <p className="font-semibold text-gray-900">
                          {brand.avgDailyOrders} <span className="text-xs text-gray-500 font-normal">/ hari</span>
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          {brand.weeklyOrders.toLocaleString('id-ID')} minggu ini
                        </p>
                      </td>

                      {/* Status Brand */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={brand.status} />
                        {brand.needReviewCount > 0 && (
                          <span className="block text-[11px] text-[#D97706] font-medium mt-0.5">
                            {brand.needReviewCount} listing perlu review
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <Link
                          to={`/brands/${brand.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-[#2563EB] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                          title={`Lihat detail brand ${brand.name}`}
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
              {filteredBrands.length > 0
                ? `Menampilkan ${startNumber}-${endNumber} dari ${filteredBrands.length} brand`
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

export default BrandsPage;
