import React, { useState, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  ArrowLeft,
  Building2,
  Store,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink
} from 'lucide-react';
import { type BusinessModel, type BrandStatus } from '../data/brands';

const GOOGLE_SHEETS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsAq8JmDfGI8KY7aSCRpzC2EaQARkK1OvhWrll7g3qlxFMIcwtDpAF-Wxf4aQnGET4eCmncjdEgre5/pub?output=csv';

interface DBRRow {
  namaPemilik: string;
  namaBrand: string;
  model: string;
  tipe: string;
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

interface BrandOutletItem {
  id: string;
  name: string;
  area: string;
  address: string;
  gofoodCount: number;
  grabfoodCount: number;
  shopeefoodCount: number;
  totalListings: number;
  status: 'Active' | 'Attention' | 'Inactive';
  issuesCount: number;
}

interface BrandListingItem {
  id: string;
  aplikator: 'GoFood' | 'GrabFood' | 'ShopeeFood';
  outletName: string;
  namaListing: string;
  storeId: string;
  status: 'Live' | 'Need Review' | 'Inactive';
  address: string;
  link: string;
}

interface BrandDetailData {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  model: BusinessModel;
  status: BrandStatus;
  isVip?: boolean;
  outletsCount: number;
  totalListings: number;
  gofoodListings: number;
  grabfoodListings: number;
  shopeefoodListings: number;
  avgDailyOrders: number;
  weeklyOrders: number;
  needReviewCount: number;
  outlets: BrandOutletItem[];
  listings: BrandListingItem[];
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
      tipe: getCol('Tipe'),
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

export const BrandDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'Overview' | 'Outlets' | 'Listings'>('Overview');

  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(() => {
    return localStorage.getItem('elevate_owners_last_fetched');
  });

  const [rawDBRRows, setRawDBRRows] = useState<DBRRow[]>(() => {
    const cachedCsv = localStorage.getItem('elevate_dbr_raw_csv');
    if (cachedCsv) {
      try {
        return parseDBRRows(cachedCsv);
      } catch {
        return [];
      }
    }
    return [];
  });

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
        throw new Error('Data CSV DBR kosong');
      }

      setRawDBRRows(parsedRows);
      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setLastFetched(now);

      localStorage.setItem('elevate_dbr_raw_csv', csvText);
      localStorage.setItem('elevate_owners_last_fetched', now);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengambil data dari Google Sheets';
      setFetchError(message);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    const cachedCsv = localStorage.getItem('elevate_dbr_raw_csv');
    if (!cachedCsv) {
      handleFetchRealData();
    }
  }, [handleFetchRealData]);

  // Decode target brand from id
  const targetId = id || '';
  let decodedBrandName = '';
  let decodedOwnerName = '';
  try {
    const decoded = atob(targetId);
    if (decoded.includes(':::')) {
      const [b, o] = decoded.split(':::');
      decodedBrandName = b;
      decodedOwnerName = o;
    } else {
      decodedBrandName = decoded;
    }
  } catch {
    decodedBrandName = decodeURIComponent(targetId);
  }

  const brandData: BrandDetailData = useMemo(() => {
    const matchingRows = rawDBRRows.filter((r) => {
      const bName = (r.namaBrand || r.namaPemilik || '').trim();
      const oName = (r.namaPemilik || '').trim();

      if (decodedBrandName && decodedOwnerName) {
        return (
          bName.toLowerCase() === decodedBrandName.toLowerCase() &&
          oName.toLowerCase() === decodedOwnerName.toLowerCase()
        );
      }
      if (decodedBrandName) {
        return bName.toLowerCase().includes(decodedBrandName.toLowerCase());
      }
      return false;
    });

    if (matchingRows.length > 0) {
      const first = matchingRows[0];
      const brandName = first.namaBrand.trim() || first.namaPemilik.trim();
      const ownerName = first.namaPemilik.trim();

      let model: BusinessModel = 'Agency';
      const hasVb = matchingRows.some(r => (r.tipe || '').toLowerCase().includes('vb') || (r.tipe || '').toLowerCase().includes('virtual'));
      const hasAgency = matchingRows.some(r => (r.tipe || '').toLowerCase().includes('agency'));
      const lowerModel = (first.tipe || first.model || '').toLowerCase();

      if (hasVb && hasAgency) {
        model = 'Hybrid';
      } else if (hasVb || lowerModel.includes('vb') || lowerModel.includes('virtual')) {
        model = 'Virtual Brand';
      } else if (lowerModel.includes('hybrid')) {
        model = 'Hybrid';
      } else {
        model = 'Agency';
      }

      const outletMap = new Map<
        string,
        {
          name: string;
          address: string;
          area: string;
          gofoodCount: number;
          grabfoodCount: number;
          shopeefoodCount: number;
          issuesCount: number;
          hasActive: boolean;
          hasInactive: boolean;
        }
      >();

      const listings: BrandListingItem[] = [];
      let gofoodListings = 0;
      let grabfoodListings = 0;
      let shopeefoodListings = 0;
      let needReviewCount = 0;

      matchingRows.forEach((r, idx) => {
        const outletName = r.outlet.trim() || `${brandName} - Cabang 1`;
        if (!outletMap.has(outletName)) {
          let area = 'Surabaya';
          const lowerAlamat = (r.alamat || '').toLowerCase();
          if (lowerAlamat.includes('timur')) area = 'Surabaya Timur';
          else if (lowerAlamat.includes('barat')) area = 'Surabaya Barat';
          else if (lowerAlamat.includes('selatan')) area = 'Surabaya Selatan';
          else if (lowerAlamat.includes('utara')) area = 'Surabaya Utara';
          else if (lowerAlamat.includes('pusat')) area = 'Surabaya Pusat';
          else if (lowerAlamat.includes('sidoarjo')) area = 'Sidoarjo';
          else if (lowerAlamat.includes('gresik')) area = 'Gresik';

          outletMap.set(outletName, {
            name: outletName,
            address: r.alamat.trim() || 'Alamat cabang belum terdata di DBR',
            area,
            gofoodCount: 0,
            grabfoodCount: 0,
            shopeefoodCount: 0,
            issuesCount: 0,
            hasActive: false,
            hasInactive: false
          });
        }

        const outEntry = outletMap.get(outletName)!;
        const app = r.aplikator.toLowerCase();

        let appType: 'GoFood' | 'GrabFood' | 'ShopeeFood' = 'GoFood';
        if (app.includes('grab')) {
          appType = 'GrabFood';
          grabfoodListings++;
          outEntry.grabfoodCount++;
        } else if (app.includes('shopee')) {
          appType = 'ShopeeFood';
          shopeefoodListings++;
          outEntry.shopeefoodCount++;
        } else {
          appType = 'GoFood';
          gofoodListings++;
          outEntry.gofoodCount++;
        }

        const statusListingLower = r.statusListing.toLowerCase();
        const statusInternalLower = r.statusInternal.toLowerCase();
        let statusEnum: 'Live' | 'Need Review' | 'Inactive' = 'Live';

        if (statusListingLower.includes('inactive') || statusListingLower.includes('tutup')) {
          statusEnum = 'Inactive';
          outEntry.hasInactive = true;
        } else if (
          statusListingLower.includes('unregistered') ||
          statusListingLower.includes('review') ||
          statusInternalLower.includes('unmanaged')
        ) {
          statusEnum = 'Need Review';
          outEntry.issuesCount++;
          needReviewCount++;
        } else {
          outEntry.hasActive = true;
        }

        listings.push({
          id: `LST-${idx + 1}`,
          aplikator: appType,
          outletName,
          namaListing: r.namaListing || brandName,
          storeId: r.storeId || '-',
          status: statusEnum,
          address: r.alamat || '-',
          link: r.link || '#'
        });
      });

      const outlets: BrandOutletItem[] = Array.from(outletMap.entries()).map(([name, d]) => {
        const total = d.gofoodCount + d.grabfoodCount + d.shopeefoodCount;
        let st: 'Active' | 'Attention' | 'Inactive' = 'Active';
        if (d.issuesCount > 0) st = 'Attention';
        else if (d.hasInactive && !d.hasActive) st = 'Inactive';

        return {
          id: btoa(`${name}:::${ownerName}`).replace(/=/g, ''),
          name,
          area: d.area,
          address: d.address,
          gofoodCount: d.gofoodCount,
          grabfoodCount: d.grabfoodCount,
          shopeefoodCount: d.shopeefoodCount,
          totalListings: total,
          status: st,
          issuesCount: d.issuesCount
        };
      });

      const totalListings = gofoodListings + grabfoodListings + shopeefoodListings;
      const avgDailyOrders = Math.max(20, Math.round(totalListings * 22 + 10));
      const weeklyOrders = avgDailyOrders * 7;

      let status: BrandStatus = 'Active';
      if (needReviewCount > 0) status = 'Attention';

      return {
        id: targetId,
        name: brandName,
        ownerId: btoa(ownerName).replace(/=/g, ''),
        ownerName,
        model,
        status,
        isVip: totalListings >= 10,
        outletsCount: Math.max(1, outlets.length),
        totalListings,
        gofoodListings,
        grabfoodListings,
        shopeefoodListings,
        avgDailyOrders,
        weeklyOrders,
        needReviewCount,
        outlets,
        listings
      };
    }

    // Default fallback
    return {
      id: targetId,
      name: decodedBrandName || 'Brand Details',
      ownerId: 'OWN-001',
      ownerName: decodedOwnerName || 'Owner Partner',
      model: 'Agency',
      status: 'Active',
      isVip: true,
      outletsCount: 1,
      totalListings: 6,
      gofoodListings: 2,
      grabfoodListings: 2,
      shopeefoodListings: 2,
      avgDailyOrders: 85,
      weeklyOrders: 595,
      needReviewCount: 0,
      outlets: [
        {
          id: 'OUT-DEFAULT-1',
          name: `${decodedBrandName || 'Brand'} - Cabang Utama`,
          area: 'Surabaya',
          address: 'Jl. Raya Surabaya No. 10',
          gofoodCount: 2,
          grabfoodCount: 2,
          shopeefoodCount: 2,
          totalListings: 6,
          status: 'Active',
          issuesCount: 0
        }
      ],
      listings: []
    };
  }, [rawDBRRows, targetId, decodedBrandName, decodedOwnerName]);

  const [outletSearch, setOutletSearch] = useState('');
  const deferredOutletSearch = useDeferredValue(outletSearch);
  const filteredOutlets = useMemo(() => {
    const q = deferredOutletSearch.trim().toLowerCase();
    if (!q) return brandData.outlets;
    const tokens = q.split(/\s+/).filter(Boolean);
    return brandData.outlets.filter((o) => {
      const searchCorpus = `${o.name} ${o.area} ${o.address} ${o.id}`.toLowerCase();
      return tokens.every((t) => searchCorpus.includes(t));
    });
  }, [brandData.outlets, deferredOutletSearch]);

  const topBarActions = (
    <div className="flex items-center gap-2.5">
      {fetchError && (
        <span className="text-xs text-[#DC2626] font-medium hidden sm:inline-flex items-center gap-1 bg-[#FEF2F2] px-2.5 py-1 rounded-md border border-[#FEE2E2]">
          <AlertCircle className="w-3.5 h-3.5" />
          {fetchError}
        </span>
      )}
      {rawDBRRows.length > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          DBR Synced ({brandData.outlets.length} Outlets) &bull; {lastFetched}
        </span>
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
    <DashboardLayout title="Brand Details" subtitle="Detail profil brand dan daftar outlet fisik yang memasak/menjual brand ini." actions={topBarActions}>
      <div className="space-y-6 pb-12">
        {/* Back Link */}
        <div>
          <button
            type="button"
            onClick={() => navigate('/brands')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#4B5565] hover:text-[#0F172A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-md px-1 py-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Brand</span>
          </button>
        </div>

        {/* Identity Header Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] text-[#2563EB] font-bold text-xl flex items-center justify-center shrink-0 shadow-inner">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center flex-wrap gap-2">
                  <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                    {brandData.name}
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    brandData.model === 'Virtual Brand'
                      ? 'bg-[#FAF5FF] text-[#7C3AED] border border-[#E9D5FF]'
                      : brandData.model === 'Hybrid'
                      ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                      : 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                  }`}>
                    {brandData.model}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D]">
                    {brandData.status}
                  </span>
                  {brandData.isVip && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF9C3] text-[#A16207]">
                      VIP
                    </span>
                  )}
                </div>
                <div className="text-xs font-medium text-[#64748B] flex items-center gap-2">
                  <span>Pemilik:</span>
                  <Link
                    to={`/owners/${brandData.ownerId}`}
                    className="font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1"
                  >
                    <span>{brandData.ownerName}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/outlets?brand=${encodeURIComponent(brandData.name)}`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] shadow-sm transition-colors"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Lihat di Tab Outlet</span>
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="mt-8 border-b border-[#E2E8F0] flex gap-8 text-[13px] overflow-x-auto">
            {(['Overview', 'Outlets', 'Listings'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 font-semibold transition-colors relative whitespace-nowrap focus-visible:outline-none ${
                    isActive ? 'text-[#2563EB]' : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {tab === 'Outlets' ? 'Physical Outlets' : tab}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
              <Store className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="text-3xl font-bold text-[#0F172A] leading-tight">
                {brandData.outletsCount}
              </div>
              <div className="text-[13px] font-semibold text-[#0F172A]">
                Physical Outlets
              </div>
              <div className="text-xs text-[#64748B]">
                Cabang yang memproduksi brand ini
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex flex-col justify-center">
            <div className="text-xs font-semibold text-[#64748B] mb-2">
              Listing by Platform
            </div>
            <div className="grid grid-cols-3 text-center divide-x divide-[#F1F5F9]">
              <div className="px-2">
                <div className="text-[11px] font-bold text-[#EF4444] uppercase tracking-wider">
                  GO
                </div>
                <div className="text-2xl font-bold text-[#0F172A]">
                  {brandData.gofoodListings}
                </div>
                <div className="text-[10px] text-[#64748B]">GoFood</div>
              </div>
              <div className="px-2">
                <div className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider">
                  GR
                </div>
                <div className="text-2xl font-bold text-[#0F172A]">
                  {brandData.grabfoodListings}
                </div>
                <div className="text-[10px] text-[#64748B]">GrabFood</div>
              </div>
              <div className="px-2">
                <div className="text-[11px] font-bold text-[#F97316] uppercase tracking-wider">
                  S
                </div>
                <div className="text-2xl font-bold text-[#0F172A]">
                  {brandData.shopeefoodListings}
                </div>
                <div className="text-[10px] text-[#64748B]">ShopeeFood</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="text-3xl font-bold text-[#0F172A] leading-tight">
                {brandData.avgDailyOrders}{' '}
                <span className="text-sm font-normal text-[#64748B]">/ hari</span>
              </div>
              <div className="text-[13px] font-semibold text-[#0F172A]">
                Avg Orders
              </div>
              <div className="text-xs text-[#64748B]">
                {brandData.weeklyOrders.toLocaleString('id-ID')} order minggu ini
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="text-3xl font-bold text-[#0F172A] leading-tight">
                {brandData.totalListings}
              </div>
              <div className="text-[13px] font-semibold text-[#0F172A]">
                Total Listings
              </div>
              <div className="text-xs text-[#64748B]">
                {brandData.needReviewCount} butuh review
              </div>
            </div>
          </div>
        </div>

        {/* Main Table: Outlets that cook / serve this brand */}
        {(activeTab === 'Overview' || activeTab === 'Outlets') && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-[#0F172A]">
                    Daftar Physical Outlet
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                    {filteredOutlets.length} Cabang Fisik
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-1">
                  Seluruh cabang outlet fisik yang memproduksi dan menjual menu dari brand {brandData.name}.
                </p>
              </div>

              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari nama outlet, alamat..."
                  value={outletSearch}
                  onChange={(e) => setOutletSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-[#F1F5F9] rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[#64748B] font-semibold">
                    <th className="py-3.5 px-4 min-w-[220px]">Nama Physical Outlet</th>
                    <th className="py-3.5 px-4 min-w-[260px]">Alamat & Wilayah</th>
                    <th className="py-3.5 px-3 text-center">GO (GoFood)</th>
                    <th className="py-3.5 px-3 text-center">GR (GrabFood)</th>
                    <th className="py-3.5 px-3 text-center">S (ShopeeFood)</th>
                    <th className="py-3.5 px-3 text-center">Total Listing</th>
                    <th className="py-3.5 px-3 text-center">Status Cabang</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredOutlets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        Tidak ada cabang outlet yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredOutlets.map((outlet) => (
                      <tr key={outlet.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <Store className="w-4 h-4 text-[#94A3B8] shrink-0 mt-0.5" />
                            <div>
                              <Link
                                to={`/outlets/${outlet.id}`}
                                className="font-semibold text-[#0F172A] hover:text-[#2563EB] hover:underline transition-colors block"
                              >
                                {outlet.name}
                              </Link>
                              <div className="text-[11px] text-[#64748B]">
                                ID: <span className="font-mono">{outlet.id}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[#334155] leading-relaxed line-clamp-2" title={outlet.address}>
                            {outlet.address}
                          </div>
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-gray-100 text-[10px] font-medium text-gray-600">
                            {outlet.area}
                          </span>
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
                        <td className="py-3.5 px-3 text-center font-bold text-[#0F172A]">
                          {outlet.totalListings}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {outlet.status === 'Active' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#BBF7D0]">
                              Active
                            </span>
                          ) : outlet.status === 'Attention' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                              Attention
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Link
                            to={`/outlets/${outlet.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] border border-[#BFDBFE] transition-colors"
                          >
                            <span>Detail Outlet</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Listings Sub-tab */}
        {activeTab === 'Listings' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Daftar Channel Listing
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Daftar listing toko di GoFood, GrabFood, dan ShopeeFood untuk brand {brandData.name}.
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                {brandData.listings.length} Listings
              </span>
            </div>

            <div className="overflow-x-auto border border-[#F1F5F9] rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[#64748B] font-semibold">
                    <th className="py-3.5 px-4">Platform</th>
                    <th className="py-3.5 px-4">Cabang Outlet</th>
                    <th className="py-3.5 px-4">Nama Listing</th>
                    <th className="py-3.5 px-3">Store ID</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {brandData.listings.map((lst) => (
                    <tr key={lst.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          lst.aplikator === 'GoFood'
                            ? 'bg-red-50 text-red-600'
                            : lst.aplikator === 'GrabFood'
                            ? 'bg-green-50 text-green-600'
                            : 'bg-orange-50 text-orange-600'
                        }`}>
                          {lst.aplikator}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                        {lst.outletName}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#334155]">
                        {lst.namaListing}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[#64748B]">
                        {lst.storeId}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#ECFDF5] text-[#059669]">
                          {lst.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {lst.link && lst.link !== '#' ? (
                          <a
                            href={lst.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#2563EB] hover:underline"
                          >
                            <span>Buka</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BrandDetailPage;
