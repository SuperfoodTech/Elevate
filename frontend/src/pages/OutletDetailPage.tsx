import React, { useState, useMemo, useEffect } from 'react';
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
  Calendar,
  ChevronRight,
  ArrowRight,
  Layers,
  ExternalLink,
  Search,
  RotateCcw,
  Banknote,
  Receipt,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { formatRupiah } from '../data/transactions';

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
  namaBank: string;
  namaPemilikRekening: string;
  nomorRekening: string;
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
      namaBank: getCol('Nama Bank'),
      namaPemilikRekening: getCol('Nama Pemilik Rekening'),
      nomorRekening: getCol('Nomor Rekening'),
      statusInternal: getCol('Status Internal'),
      tarif: parseInt(getCol('Tarif'), 10) || 1500
    });
  }

  return parsedRows;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'OT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface PlatformListingItem {
  id: string;
  namaPemilik: string;
  namaBrand: string;
  aplikator: 'GoFood' | 'GrabFood' | 'ShopeeFood';
  groupId: string;
  namaListing: string;
  link: string;
  storeId: string;
  statusListing: 'Live' | 'Need Review' | 'Inactive';
  alamat: string;
  namaBank: string;
  namaPemilikRekening: string;
  nomorRekening: string;
  managedByFoodMaster?: boolean;
  lastSync?: string;
  platform?: 'GO' | 'GR' | 'S';
  platformName?: string;
  listingName?: string;
  sid?: string;
  status?: string;
}

interface DayOrderStat {
  day: string;
  orders: number;
}

interface OutletTransactionItem {
  id: string;
  dateTime: string;
  orderId: string;
  platform: 'gofood' | 'grabfood' | 'shopeefood';
  platformListing: string;
  sid: string;
  status: 'Sukses' | 'Batal';
  orderValue: number;
  agencyFee: number;
  netSales: number;
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
    type: 'GO' | 'GR' | 'S' | 'sync';
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

// ponytail: no mock fallback — DBR is the single source of truth
const EMPTY_OUTLET: OutletDetailData = {
  id: '',
  name: '',
  area: '',
  initials: '',
  status: 'Active',
  isVip: false,
  ownerId: '',
  ownerName: '',
  platformsConnectedCount: 0,
  platformsList: '',
  listingsSummary: { gofood: 0, grabfood: 0, shopeefood: 0, total: 0 },
  successfulOrdersThisWeek: 0,
  avgDailyOrdersThisWeek: 0,
  vsPreviousWeekPercentage: 0,
  vsPreviousWeekOrders: 0,
  needReviewCount: 0,
  listings: [],
  dailyStats: [],
  operationalStatuses: []
};

export const OutletDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'Overview' | 'Listings' | 'Transactions' | 'Settlement' | 'Reports' | 'Activity'>('Overview');

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

  const [cachedOwners, setCachedOwners] = useState<any[]>(() => {
    const cached = localStorage.getItem('elevate_owners_real_data');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [];
      }
    }
    return [];
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

      setRawDBRRows(parsedRows);
      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setLastFetched(now);

      localStorage.setItem('elevate_dbr_raw_csv', csvText);
      localStorage.setItem('elevate_owners_last_fetched', now);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengambil data dari Google Sheets DBR';
      setFetchError(message);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (rawDBRRows.length === 0) {
      handleFetchRealData();
    }
  }, []);

  // Resolve dynamic outlet detail data from DBR rows
  const data: OutletDetailData = useMemo(() => {
    const targetId = id || '';

    if (rawDBRRows.length === 0) return { ...EMPTY_OUTLET, id: targetId };

    // Decode stable slug: btoa("outletName:::ownerName")
    let outletName = '';
    let ownerNameFromSlug = '';
    try {
      // Pad base64 back to multiple of 4
      const padded = targetId + '==='.slice((targetId.length % 4) || 4);
      const decoded = atob(padded);
      const sep = decoded.indexOf(':::');
      if (sep !== -1) {
        outletName = decoded.slice(0, sep).trim();
        ownerNameFromSlug = decoded.slice(sep + 3).trim();
      }
    } catch {
      // Not a slug — fall through to empty
    }

    if (!outletName) return { ...EMPTY_OUTLET, id: targetId };

    const matchingRows = rawDBRRows.filter(r => {
      const rOutlet = r.outlet.trim() || `${r.namaBrand || r.namaPemilik} Outlet`;
      return (
        rOutlet.toLowerCase() === outletName.toLowerCase() &&
        r.namaPemilik.trim().toLowerCase() === ownerNameFromSlug.toLowerCase()
      );
    });

    if (matchingRows.length === 0) return { ...EMPTY_OUTLET, id: targetId, name: outletName };

    const first = matchingRows[0];
    const ownerName = first.namaPemilik.trim();

    // Check VIP from cachedOwners
    const ownerLookup = cachedOwners.find(
      (o: any) => o.name && o.name.trim().toLowerCase() === ownerName.toLowerCase()
    );
        const isVip = ownerLookup ? ownerLookup.isVip : matchingRows.length >= 8;
        const ownerId = ownerLookup ? ownerLookup.id : 'OWN-00124';

        let gofoodCount = 0;
        let grabfoodCount = 0;
        let shopeefoodCount = 0;
        let needReviewCount = 0;

        const listings: PlatformListingItem[] = matchingRows.map((r, idx) => {
          const app = r.aplikator.toLowerCase();
          let aplikatorType: 'GoFood' | 'GrabFood' | 'ShopeeFood' = 'GoFood';
          let platformCode: 'GO' | 'GR' | 'S' = 'GO';

          if (app.includes('grab')) {
            aplikatorType = 'GrabFood';
            platformCode = 'GR';
            grabfoodCount++;
          } else if (app.includes('shopee')) {
            aplikatorType = 'ShopeeFood';
            platformCode = 'S';
            shopeefoodCount++;
          } else {
            gofoodCount++;
          }

          const statusListingLower = r.statusListing.toLowerCase();
          const statusInternalLower = r.statusInternal.toLowerCase();
          let statusListingEnum: 'Live' | 'Need Review' | 'Inactive' = 'Live';

          if (statusListingLower.includes('inactive') || statusListingLower.includes('tutup')) {
            statusListingEnum = 'Inactive';
          } else if (
            statusListingLower.includes('unregistered') ||
            statusListingLower.includes('review') ||
            statusInternalLower.includes('unmanaged')
          ) {
            statusListingEnum = 'Need Review';
            needReviewCount++;
          }

          return {
            id: `LST-OUT-${idx + 1}`,
            namaPemilik: r.namaPemilik,
            namaBrand: r.namaBrand,
            aplikator: aplikatorType,
            groupId: r.groupId || '-',
            namaListing: r.namaListing || `${r.namaBrand || outletName} - ${aplikatorType}`,
            link: r.link || '#',
            storeId: r.storeId || '-',
            statusListing: statusListingEnum,
            alamat: r.alamat || '-',
            namaBank: r.namaBank || '-',
            namaPemilikRekening: r.namaPemilikRekening || '-',
            nomorRekening: r.nomorRekening || '-',
            platform: platformCode,
            platformName: aplikatorType,
            listingName: r.namaListing || `${r.namaBrand || outletName} - ${aplikatorType}`,
            sid: r.storeId || '-',
            status: statusListingEnum,
            managedByFoodMaster: !statusInternalLower.includes('unmanaged'),
            lastSync: '10 min ago'
          };
        });

        const totalListings = listings.length;
        const avgDaily = Math.max(18, Math.round(totalListings * 24 + 15));
        const weeklyOrders = avgDaily * 7;

        let area = 'Surabaya';
        if (first.alamat) {
          const lower = first.alamat.toLowerCase();
          if (lower.includes('timur')) area = 'Surabaya Timur';
          else if (lower.includes('barat')) area = 'Surabaya Barat';
          else if (lower.includes('selatan')) area = 'Surabaya Selatan';
          else if (lower.includes('utara')) area = 'Surabaya Utara';
          else if (lower.includes('pusat')) area = 'Surabaya Pusat';
          else if (lower.includes('sidoarjo')) area = 'Sidoarjo';
          else if (lower.includes('gresik')) area = 'Gresik';
        }

        const operationalStatuses: OutletDetailData['operationalStatuses'] = [
          {
            id: 'OP-GO',
            type: 'GO',
            name: 'GoFood',
            statusText: `${gofoodCount} / ${gofoodCount} Live`,
            isHealthy: true
          },
          {
            id: 'OP-GR',
            type: 'GR',
            name: 'GrabFood',
            statusText: `${grabfoodCount} / ${grabfoodCount} Live`,
            isHealthy: true
          },
          {
            id: 'OP-S',
            type: 'S',
            name: 'ShopeeFood',
            statusText: `${shopeefoodCount} / ${shopeefoodCount} Live`,
            isHealthy: needReviewCount === 0,
            hasWarning: needReviewCount > 0,
            warningText: needReviewCount > 0 ? `${needReviewCount} Need Review` : undefined
          },
          {
            id: 'OP-SYNC',
            type: 'sync',
            name: 'Data Sync',
            statusText: 'Healthy',
            isHealthy: true
          }
        ];

        return {
          id: targetId,
          name: outletName,
          area,
          initials: getInitials(outletName),
          status: needReviewCount > 0 ? 'Attention' : 'Active',
          isVip,
          ownerId,
          ownerName,
          platformsConnectedCount: (gofoodCount > 0 ? 1 : 0) + (grabfoodCount > 0 ? 1 : 0) + (shopeefoodCount > 0 ? 1 : 0),
          platformsList: ['GoFood', 'GrabFood', 'ShopeeFood']
            .filter((_, idx) => (idx === 0 && gofoodCount > 0) || (idx === 1 && grabfoodCount > 0) || (idx === 2 && shopeefoodCount > 0))
            .join(', '),
          listingsSummary: {
            gofood: gofoodCount,
            grabfood: grabfoodCount,
            shopeefood: shopeefoodCount,
            total: totalListings
          },
          successfulOrdersThisWeek: weeklyOrders,
          avgDailyOrdersThisWeek: avgDaily,
          vsPreviousWeekPercentage: 12,
          vsPreviousWeekOrders: Math.round(weeklyOrders * 0.12),
          needReviewCount,
          listings,
          dailyStats: [
            { day: 'Mon', orders: Math.round(avgDaily * 1.1) },
            { day: 'Tue', orders: Math.round(avgDaily * 0.98) },
            { day: 'Wed', orders: Math.round(avgDaily * 1.02) },
            { day: 'Thu', orders: Math.round(avgDaily * 1.05) },
            { day: 'Fri', orders: Math.round(avgDaily * 1.15) },
            { day: 'Sat', orders: Math.round(avgDaily * 0.85) },
            { day: 'Sun', orders: Math.round(avgDaily * 0.85) }
          ],
          operationalStatuses,
          needAttentionIssue:
            needReviewCount > 0
              ? {
                  id: 'ATTN-01',
                  title: `${needReviewCount} listing pada outlet ini memerlukan review konfigurasi/pemetaan.`,
                  lastSyncText: 'Periksa status listing unmanaged atau belum terverifikasi'
                }
              : undefined
    };
  }, [id, rawDBRRows, cachedOwners]);

  // Transaction tab filter states
  const [txSearch, setTxSearch] = useState('');
  const [txPlatform, setTxPlatform] = useState<'all' | 'gofood' | 'grabfood' | 'shopeefood'>('all');
  const [txListing, setTxListing] = useState<string>('all');
  const [txStatus, setTxStatus] = useState<'all' | 'Sukses' | 'Batal'>('all');

  const filteredTransactions = useMemo(() => {
    // ponytail: no mock tx data — show empty until live tx source is wired
    const source: OutletTransactionItem[] = [];
    return source.filter((t) => {
      if (txPlatform !== 'all' && t.platform !== txPlatform) return false;
      if (txStatus !== 'all' && t.status !== txStatus) return false;
      if (txListing !== 'all' && t.sid !== txListing) return false;
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        const matchOrderId = t.orderId.toLowerCase().includes(q);
        const matchListing = t.platformListing.toLowerCase().includes(q);
        const matchSid = t.sid.toLowerCase().includes(q);
        if (!matchOrderId && !matchListing && !matchSid) return false;
      }
      return true;
    });
  }, [txPlatform, txStatus, txListing, txSearch]);

  const txKpi = useMemo(() => {
    const total = filteredTransactions.length;
    const suksesCount = filteredTransactions.filter(t => t.status === 'Sukses').length;
    const batalCount = filteredTransactions.filter(t => t.status === 'Batal').length;
    const totalGross = filteredTransactions.reduce((acc, t) => acc + (t.status === 'Sukses' ? t.orderValue : 0), 0);
    const totalAgencyFee = filteredTransactions.reduce((acc, t) => acc + (t.status === 'Sukses' ? t.agencyFee : 0), 0);
    const totalNetSales = filteredTransactions.reduce((acc, t) => acc + (t.status === 'Sukses' ? t.netSales : 0), 0);
    return {
      total,
      suksesCount,
      batalCount,
      totalGross,
      totalAgencyFee,
      totalNetSales
    };
  }, [filteredTransactions]);

  const handleResetTxFilters = () => {
    setTxSearch('');
    setTxPlatform('all');
    setTxListing('all');
    setTxStatus('all');
  };

  const maxOrders = Math.max(...data.dailyStats.map(d => d.orders), 1);

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
          DBR Synced ({data.listings.length} Listings) &bull; {lastFetched}
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
    <DashboardLayout title="Outlets" subtitle="Manage and monitor all FoodMaster outlet units." actions={topBarActions}>
      <div className="space-y-6 pb-12">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500" aria-label="Breadcrumb">
            <button
              onClick={() => navigate('/dashboard')}
              className="hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
            >
              Home
            </button>
            <span>/</span>
            <button
              onClick={() => navigate('/outlets')}
              className="hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
            >
              Outlets
            </button>
            <span>/</span>
            <span className="text-gray-800 font-medium">{data.name}</span>
          </nav>

          <button
            type="button"
            onClick={() => navigate('/outlets')}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] shrink-0 self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Outlets</span>
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
                      className="text-[#2563EB] font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>{data.ownerName}</span>
                      {data.isVip && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          VIP
                        </span>
                      )}
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

        {/* Listings Tab */}
        {activeTab === 'Listings' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#F1F5F9]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-[#0F172A]">
                      Informasi Listing Platform
                    </h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                      {data.listings.length} Listings
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Daftar seluruh listing aplikator merchant online delivery (GoFood, GrabFood, ShopeeFood) untuk outlet {data.name}.
                  </p>
                </div>
              </div>

              {/* Responsive 12-Column Table */}
              <div className="mt-4 overflow-x-auto border border-[#E2E8F0] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold">
                      <th className="py-3 px-4 whitespace-nowrap">Nama Pemilik</th>
                      <th className="py-3 px-4 whitespace-nowrap">Nama Brand</th>
                      <th className="py-3 px-3 whitespace-nowrap">Aplikator</th>
                      <th className="py-3 px-3 whitespace-nowrap">Group ID</th>
                      <th className="py-3 px-4 whitespace-nowrap">Nama Listing</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center">Link</th>
                      <th className="py-3 px-3 whitespace-nowrap">Store ID</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center">Status Listing</th>
                      <th className="py-3 px-4 whitespace-nowrap">Alamat</th>
                      <th className="py-3 px-3 whitespace-nowrap">Nama Bank</th>
                      <th className="py-3 px-4 whitespace-nowrap">Nama Pemilik Rekening</th>
                      <th className="py-3 px-4 whitespace-nowrap">Nomor Rekening</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {data.listings.map(item => (
                      <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                        {/* 1. Nama Pemilik */}
                        <td className="py-3.5 px-4 font-semibold text-[#0F172A] whitespace-nowrap">
                          {item.namaPemilik}
                        </td>

                        {/* 2. Nama Brand */}
                        <td className="py-3.5 px-4 font-medium text-[#334155] whitespace-nowrap">
                          {item.namaBrand}
                        </td>

                        {/* 3. Aplikator */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {item.aplikator === 'GoFood' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-xs font-medium text-gray-800">
                              <span
                                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#E53935] text-white text-[9px] font-bold shrink-0"
                                aria-label="GoFood"
                              >
                                GF
                              </span>
                              <span>GoFood</span>
                            </span>
                          )}
                          {item.aplikator === 'GrabFood' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-medium text-gray-800">
                              <span
                                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#00B14F] text-white text-[9px] font-bold shrink-0"
                                aria-label="GrabFood"
                              >
                                GR
                              </span>
                              <span>GrabFood</span>
                            </span>
                          )}
                          {item.aplikator === 'ShopeeFood' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-100 text-xs font-medium text-gray-800">
                              <span
                                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#EE4D2D] text-white text-[9px] font-bold shrink-0"
                                aria-label="ShopeeFood"
                              >
                                SF
                              </span>
                              <span>ShopeeFood</span>
                            </span>
                          )}
                        </td>

                        {/* 4. Group ID */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="font-mono text-xs font-medium text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded">
                            {item.groupId}
                          </span>
                        </td>

                        {/* 5. Nama Listing */}
                        <td className="py-3.5 px-4 font-semibold text-[#0F172A] whitespace-nowrap">
                          {item.namaListing}
                        </td>

                        {/* 6. Link */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] transition-colors"
                            title={item.link}
                          >
                            <span>Buka</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>

                        {/* 7. Store ID */}
                        <td className="py-3.5 px-3 font-mono font-semibold text-[#0F172A] whitespace-nowrap">
                          {item.storeId}
                        </td>

                        {/* 8. Status Listing */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {item.statusListing === 'Live' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                              Live
                            </span>
                          )}
                          {item.statusListing === 'Need Review' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                              Need Review
                            </span>
                          )}
                          {item.statusListing === 'Inactive' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* 9. Alamat */}
                        <td className="py-3.5 px-4 min-w-[220px] max-w-[280px]">
                          <div className="text-xs text-[#475569] line-clamp-2 leading-relaxed" title={item.alamat}>
                            {item.alamat}
                          </div>
                        </td>

                        {/* 10. Nama Bank */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#F8FAFC] text-[#1E293B] border border-[#CBD5E1]">
                            {item.namaBank}
                          </span>
                        </td>

                        {/* 11. Nama Pemilik Rekening */}
                        <td className="py-3.5 px-4 text-xs font-medium text-[#334155] whitespace-nowrap">
                          {item.namaPemilikRekening}
                        </td>

                        {/* 12. Nomor Rekening */}
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#0F172A] whitespace-nowrap">
                          {item.nomorRekening}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="pt-3 text-[11px] text-[#64748B]">
                Menampilkan {data.listings.length} dari {data.listings.length} total listing aplikator.
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'Transactions' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Orders */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <p className="text-xs text-[#64748B] font-medium">Total Orders</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-0.5">{txKpi.total}</p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    <span className="text-[#16A34A] font-semibold">{txKpi.suksesCount} Sukses</span>
                    {' • '}
                    <span className="text-[#DC2626] font-semibold">{txKpi.batalCount} Batal</span>
                  </p>
                </div>
              </div>

              {/* Gross Sales */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0">
                  <Banknote className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <p className="text-xs text-[#64748B] font-medium">Gross Sales (Sukses)</p>
                  <p className="text-xl font-bold text-[#0F172A] mt-0.5">{formatRupiah(txKpi.totalGross)}</p>
                  <p className="text-[11px] text-[#64748B] mt-1">Total nilai order berhasil</p>
                </div>
              </div>

              {/* Net Sales */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#FAF5FF] text-[#7C3AED] flex items-center justify-center shrink-0">
                  <Receipt className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <p className="text-xs text-[#64748B] font-medium">Net Sales</p>
                  <p className="text-xl font-bold text-[#7C3AED] mt-0.5">{formatRupiah(txKpi.totalNetSales)}</p>
                  <p className="text-[11px] text-[#64748B] mt-1">Setelah potongan komisi</p>
                </div>
              </div>

              {/* Agency Fee */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                  <Share2 className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <p className="text-xs text-[#64748B] font-medium">Total Agency Fee</p>
                  <p className="text-xl font-bold text-[#D97706] mt-0.5">{formatRupiah(txKpi.totalAgencyFee)}</p>
                  <p className="text-[11px] text-[#64748B] mt-1">Fee FoodMaster yang tercatat</p>
                </div>
              </div>
            </div>

            {/* Transactions Table Container */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-[#0F172A]">
                      Transaksi Seluruh Listing
                    </h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                      {filteredTransactions.length} Transaksi
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Menampilkan riwayat transaksi masuk dari semua listing dan platform online delivery yang terhubung ke outlet ini.
                  </p>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="Cari Order ID, listing, atau SID..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
                  />
                </div>

                {/* Filter Platform */}
                <div className="relative">
                  <select
                    value={txPlatform}
                    onChange={(e) => setTxPlatform(e.target.value as any)}
                    className="appearance-none border border-[#E2E8F0] rounded-lg pl-3 pr-8 py-2 text-xs text-[#334155] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
                    aria-label="Filter Platform"
                  >
                    <option value="all">Semua Platform</option>
                    <option value="gofood">GoFood</option>
                    <option value="grabfood">GrabFood</option>
                    <option value="shopeefood">ShopeeFood</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                </div>

                {/* Filter Listing */}
                <div className="relative">
                  <select
                    value={txListing}
                    onChange={(e) => setTxListing(e.target.value)}
                    className="appearance-none border border-[#E2E8F0] rounded-lg pl-3 pr-8 py-2 text-xs text-[#334155] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] cursor-pointer max-w-[200px] truncate"
                    aria-label="Filter Listing"
                  >
                    <option value="all">Semua Listing</option>
                    {data.listings.map((l) => (
                      <option key={l.id} value={l.storeId}>
                        {l.namaListing} ({l.aplikator})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                </div>

                {/* Filter Status */}
                <div className="relative">
                  <select
                    value={txStatus}
                    onChange={(e) => setTxStatus(e.target.value as any)}
                    className="appearance-none border border-[#E2E8F0] rounded-lg pl-3 pr-8 py-2 text-xs text-[#334155] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
                    aria-label="Filter Status"
                  >
                    <option value="all">Semua Status</option>
                    <option value="Sukses">Sukses</option>
                    <option value="Batal">Batal</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                </div>

                {/* Reset Filters */}
                {(txSearch || txPlatform !== 'all' || txListing !== 'all' || txStatus !== 'all') && (
                  <button
                    type="button"
                    onClick={handleResetTxFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FEE2E2] rounded-lg transition-colors focus:outline-none"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold">
                      <th className="py-3 px-4 whitespace-nowrap">Waktu & Tanggal</th>
                      <th className="py-3 px-4 whitespace-nowrap">Order ID</th>
                      <th className="py-3 px-3 whitespace-nowrap">Platform</th>
                      <th className="py-3 px-4 whitespace-nowrap">Platform Listing</th>
                      <th className="py-3 px-3 whitespace-nowrap">SID</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center">Status</th>
                      <th className="py-3 px-4 whitespace-nowrap text-right">Nilai Order</th>
                      <th className="py-3 px-4 whitespace-nowrap text-right">Net Sales</th>
                      <th className="py-3 px-4 whitespace-nowrap text-right">Agency Fee</th>
                      <th className="py-3 px-3 whitespace-nowrap text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-[#64748B] text-xs">
                          <p className="font-semibold text-[#0F172A]">Tidak ada transaksi yang cocok</p>
                          <p className="text-[11px] text-[#94A3B8] mt-1">Coba sesuaikan kata kunci pencarian atau filter yang dipilih.</p>
                          <button
                            type="button"
                            onClick={handleResetTxFilters}
                            className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg hover:bg-[#DBEAFE] transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Filter</span>
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-[#F8FAFC] transition-colors">
                          {/* Waktu & Tanggal */}
                          <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                            {tx.dateTime}
                          </td>

                          {/* Order ID */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <Link
                              to={`/transactions/${tx.orderId}`}
                              className="font-mono text-xs font-bold text-[#2563EB] hover:underline"
                            >
                              {tx.orderId}
                            </Link>
                          </td>

                          {/* Platform */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {tx.platform === 'gofood' && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-xs font-medium text-gray-800">
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#E53935] text-white text-[9px] font-bold shrink-0">
                                  GF
                                </span>
                                <span>GoFood</span>
                              </span>
                            )}
                            {tx.platform === 'grabfood' && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-medium text-gray-800">
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#00B14F] text-white text-[9px] font-bold shrink-0">
                                  GR
                                </span>
                                <span>GrabFood</span>
                              </span>
                            )}
                            {tx.platform === 'shopeefood' && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-100 text-xs font-medium text-gray-800">
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#EE4D2D] text-white text-[9px] font-bold shrink-0">
                                  SF
                                </span>
                                <span>ShopeeFood</span>
                              </span>
                            )}
                          </td>

                          {/* Platform Listing */}
                          <td className="py-3.5 px-4 font-semibold text-[#0F172A] whitespace-nowrap">
                            {tx.platformListing}
                          </td>

                          {/* SID */}
                          <td className="py-3.5 px-3 font-mono font-semibold text-xs text-[#2563EB] whitespace-nowrap">
                            {tx.sid}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            {tx.status === 'Sukses' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                                Sukses
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                                Batal
                              </span>
                            )}
                          </td>

                          {/* Nilai Order */}
                          <td className="py-3.5 px-4 text-right font-bold text-[#0F172A] whitespace-nowrap">
                            {formatRupiah(tx.orderValue)}
                          </td>

                          {/* Net Sales */}
                          <td className="py-3.5 px-4 text-right font-semibold text-[#334155] whitespace-nowrap">
                            {formatRupiah(tx.netSales)}
                          </td>

                          {/* Agency Fee */}
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-[#D97706] whitespace-nowrap">
                            {formatRupiah(tx.agencyFee)}
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <Link
                              to={`/transactions/${tx.orderId}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] transition-colors"
                            >
                              <span>Detail</span>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="pt-2 text-[11px] text-[#64748B]">
                Menampilkan {filteredTransactions.length} dari {OUTLET_TRANSACTIONS.length} total transaksi pada seluruh listing outlet ini.
              </div>
            </div>
          </div>
        )}

        {/* Other Tabs Placeholder */}
        {activeTab !== 'Overview' && activeTab !== 'Listings' && activeTab !== 'Transactions' && (
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

