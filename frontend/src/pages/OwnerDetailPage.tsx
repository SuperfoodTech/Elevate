import React, { useState, useEffect, useMemo } from 'react';
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
  Layers,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Search,
  RotateCcw,
  Receipt
} from 'lucide-react';
import { MOCK_TRANSACTIONS } from '../data/transactions';

const GOOGLE_SHEETS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSsAq8JmDfGI8KY7aSCRpzC2EaQARkK1OvhWrll7g3qlxFMIcwtDpAF-Wxf4aQnGET4eCmncjdEgre5/pub?output=csv';

interface DBRRow {
  namaPemilik: string;
  namaBrand: string;
  model: string;
  tipe: string;
  outlet: string;
  nomorHp: string;
  aplikator: string;
  namaPortal: string;
  groupId: string;
  namaListing: string;
  link: string;
  storeId: string;
  statusListing: string;
  alamat: string;
  namaBank: string;
  namaPemilikRekening: string;
  nomorRekening: string;
  namaAkses: string;
  emailFoodMaster1: string;
  emailFoodMaster2: string;
  namaPengguna: string;
  statusInternal: string;
  tanggalLive: string;
  tanggalChurn: string;
  tarif: number;
}

interface OwnerListingItem {
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
  outlet: string;
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

  const headers = rows[0].map(h => h.trim());
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
      nomorHp: getCol('Nomor HP'),
      aplikator: getCol('Aplikator'),
      namaPortal: getCol('Nama Portal'),
      groupId: getCol('Group ID'),
      namaListing: getCol('Nama Listing'),
      link: getCol('Link'),
      storeId: getCol('Store ID'),
      statusListing: getCol('Status Listing'),
      alamat: getCol('Alamat'),
      namaBank: getCol('Nama Bank'),
      namaPemilikRekening: getCol('Nama Pemilik Rekening'),
      nomorRekening: getCol('Nomor Rekening'),
      namaAkses: getCol('Nama Akses'),
      emailFoodMaster1: getCol('Email FoodMaster1'),
      emailFoodMaster2: getCol('Email FoodMaster2'),
      namaPengguna: getCol('Nama Pengguna'),
      statusInternal: getCol('Status Internal'),
      tanggalLive: getCol('Tanggal Live'),
      tanggalChurn: getCol('Tanggal Churn'),
      tarif: parseInt(getCol('Tarif'), 10) || 1500
    });
  }

  return parsedRows;
}

function transformCSVToOwners(rawRows: DBRRow[]): any[] {
  const ownerMap = new Map<
    string,
    {
      name: string;
      brands: Set<string>;
      outlets: Set<string>;
      models: Set<string>;
      gofood: number;
      grabfood: number;
      shopeefood: number;
      phone: string;
      email: string;
      liveDate: string;
      tarif: number;
      issuesCount: number;
      isLive: boolean;
    }
  >();

  for (const r of rawRows) {
    const ownerName = r.namaPemilik;
    if (!ownerName) continue;

    if (!ownerMap.has(ownerName)) {
      ownerMap.set(ownerName, {
        name: ownerName,
        brands: new Set(),
        outlets: new Set(),
        models: new Set(),
        gofood: 0,
        grabfood: 0,
        shopeefood: 0,
        phone: r.nomorHp,
        email: r.emailFoodMaster1 || r.emailFoodMaster2,
        liveDate: r.tanggalLive,
        tarif: r.tarif,
        issuesCount: 0,
        isLive: false
      });
    }

    const entry = ownerMap.get(ownerName)!;
    if (r.namaBrand) entry.brands.add(r.namaBrand);
    if (r.outlet) entry.outlets.add(r.outlet);
    if (r.model) entry.models.add(r.model);

    const app = r.aplikator.toLowerCase();
    if (app.includes('gofood')) entry.gofood++;
    else if (app.includes('grab')) entry.grabfood++;
    else if (app.includes('shopee')) entry.shopeefood++;

    const statusListing = r.statusListing.toLowerCase();
    const statusInternal = r.statusInternal.toLowerCase();
    if (statusInternal.includes('live') || statusListing.includes('active')) {
      entry.isLive = true;
    }
    if (
      statusListing.includes('unregistered') ||
      statusListing.includes('inactive') ||
      statusInternal.includes('unmanaged')
    ) {
      entry.issuesCount++;
    }
  }

  return Array.from(ownerMap.entries()).map(([name, o], idx) => {
    const totalListings = o.gofood + o.grabfood + o.shopeefood;
    const outletsCount = Math.max(1, o.outlets.size);

    let businessModel: 'Agency' | 'Hybrid' | 'Virtual Brand' = 'Agency';
    if (o.models.has('Hybrid')) {
      businessModel = 'Hybrid';
    } else if (o.models.has('VB') || o.models.has('Virtual Brand')) {
      businessModel = 'Virtual Brand';
    }

    let grade: 'A' | 'B' | 'C' | 'D' | 'E' = 'C';
    if (totalListings >= 12 || outletsCount >= 4) grade = 'A';
    else if (totalListings >= 6 || outletsCount >= 2) grade = 'B';
    else if (totalListings <= 2) grade = 'D';

    const baselineDailyOrder = Math.max(15, Math.round(totalListings * 3.5 + outletsCount * 4));

    let settlementStatus = 'Paid';
    if (businessModel === 'Virtual Brand') {
      settlementStatus = 'FoodMaster Pays';
    } else if (o.issuesCount > 3) {
      settlementStatus = 'Overdue';
    } else if (idx % 3 === 0) {
      settlementStatus = 'Waiting Payment';
    }

    const status = o.isLive ? 'Active' : (o.issuesCount > 5 ? 'Attention' : 'Active');

    let phone = o.phone;
    if (phone && !phone.startsWith('+')) {
      phone = '+' + phone;
    }

    let email = o.email;
    if (!email || !email.includes('@')) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      email = `${slug || 'owner'}@foodmaster.id`;
    }

    const isVip = outletsCount >= 3 || totalListings >= 14 || grade === 'A';

    return {
      id: `OWN-${String(idx + 1).padStart(3, '0')}`,
      name,
      email,
      phone: phone || '+62 812-0000-0000',
      businessModel,
      outletsCount,
      listings: {
        gofood: o.gofood,
        grabfood: o.grabfood,
        shopeefood: o.shopeefood
      },
      grade,
      baselineDailyOrder,
      performanceAchievedMonths: Math.min(5, Math.max(1, Math.floor(totalListings / 3))),
      settlementStatus,
      issuesCount: o.issuesCount,
      status,
      kksStartDate: o.liveDate || '2026-01-01',
      agencyFeePerOrder: o.tarif || 1500,
      isVip
    };
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'O';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

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
  listings: OwnerListingItem[];
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
  physicalOutletsCount: 4,
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
  listings: [
    {
      id: 'LST-01',
      namaPemilik: 'Salero Minang Raya',
      namaBrand: 'Salero Minang Raya',
      aplikator: 'GoFood',
      groupId: 'GRP-SMR-01',
      namaListing: 'Salero Minang Raya - Manyar',
      link: 'https://gofood.link/u/salero-manyar',
      storeId: 'GF-0521-ABCD',
      statusListing: 'Live',
      alamat: 'Jl. Manyar Kertoarjo No. 45, Surabaya',
      namaBank: 'BCA',
      namaPemilikRekening: 'CV Salero Minang Jaya',
      nomorRekening: '0182-3921-88',
      outlet: 'Salero Minang Raya – Manyar'
    },
    {
      id: 'LST-02',
      namaPemilik: 'Salero Minang Raya',
      namaBrand: 'Salero Minang Raya',
      aplikator: 'GrabFood',
      groupId: 'GRP-SMR-01',
      namaListing: 'Salero Minang Raya - Manyar',
      link: 'https://grab.onelink.me/salero-manyar',
      storeId: 'GB-44321-KLMN',
      statusListing: 'Live',
      alamat: 'Jl. Manyar Kertoarjo No. 45, Surabaya',
      namaBank: 'Mandiri',
      namaPemilikRekening: 'CV Salero Minang Jaya',
      nomorRekening: '142-00-1928374-1',
      outlet: 'Salero Minang Raya – Manyar'
    },
    {
      id: 'LST-03',
      namaPemilik: 'Salero Minang Raya',
      namaBrand: 'Salero Minang Raya',
      aplikator: 'ShopeeFood',
      groupId: 'GRP-SMR-01',
      namaListing: 'Salero Minang Raya - Manyar',
      link: 'https://shopee.co.id/universal-link/now-food/shop/91221',
      storeId: 'SF-91221-QQWE',
      statusListing: 'Live',
      alamat: 'Jl. Manyar Kertoarjo No. 45, Surabaya',
      namaBank: 'BRI',
      namaPemilikRekening: 'CV Salero Minang Jaya',
      nomorRekening: '0341-01-002341-50-8',
      outlet: 'Salero Minang Raya – Manyar'
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

function buildOwnerDetailFromDBR(
  ownerId: string,
  ownerRecord: {
    id: string;
    name: string;
    email: string;
    phone: string;
    businessModel: 'Agency' | 'Hybrid' | 'Virtual Brand';
    outletsCount: number;
    listings: { gofood: number; grabfood: number; shopeefood: number };
    grade: string;
    baselineDailyOrder: number;
    performanceAchievedMonths: number;
    settlementStatus: string;
    issuesCount: number;
    status: string;
    agencyFeePerOrder?: number;
    isVip?: boolean;
  },
  matchingRows: DBRRow[]
): OwnerDetailData {
  const outletMap = new Map<
    string,
    {
      name: string;
      area: string;
      gofoodCount: number;
      grabfoodCount: number;
      shopeefoodCount: number;
      issuesCount: number;
    }
  >();

  const listings: OwnerListingItem[] = [];
  let gofoodListings = 0;
  let grabfoodListings = 0;
  let shopeefoodListings = 0;
  const areasSet = new Set<string>();

  matchingRows.forEach((r, idx) => {
    const outletName = r.outlet || `${ownerRecord.name} - Outlet 1`;
    if (!outletMap.has(outletName)) {
      let area = 'Surabaya';
      if (r.alamat) {
        const lowerAlamat = r.alamat.toLowerCase();
        if (lowerAlamat.includes('timur')) area = 'Surabaya Timur';
        else if (lowerAlamat.includes('barat')) area = 'Surabaya Barat';
        else if (lowerAlamat.includes('selatan')) area = 'Surabaya Selatan';
        else if (lowerAlamat.includes('utara')) area = 'Surabaya Utara';
        else if (lowerAlamat.includes('pusat')) area = 'Surabaya Pusat';
        else if (lowerAlamat.includes('sidoarjo')) area = 'Sidoarjo';
      }
      areasSet.add(area);

      outletMap.set(outletName, {
        name: outletName,
        area,
        gofoodCount: 0,
        grabfoodCount: 0,
        shopeefoodCount: 0,
        issuesCount: 0
      });
    }

    const outEntry = outletMap.get(outletName)!;
    const app = r.aplikator.toLowerCase();

    let aplikatorType: 'GoFood' | 'GrabFood' | 'ShopeeFood' = 'GoFood';
    if (app.includes('grab')) {
      aplikatorType = 'GrabFood';
      grabfoodListings++;
      outEntry.grabfoodCount++;
    } else if (app.includes('shopee')) {
      aplikatorType = 'ShopeeFood';
      shopeefoodListings++;
      outEntry.shopeefoodCount++;
    } else {
      gofoodListings++;
      outEntry.gofoodCount++;
    }

    const statusListingLower = r.statusListing.toLowerCase();
    const statusInternalLower = r.statusInternal.toLowerCase();
    let statusListingEnum: 'Live' | 'Need Review' | 'Inactive' = 'Live';

    if (statusListingLower.includes('inactive') || statusListingLower.includes('tutup')) {
      statusListingEnum = 'Inactive';
      outEntry.issuesCount++;
    } else if (
      statusListingLower.includes('unregistered') ||
      statusListingLower.includes('review') ||
      statusInternalLower.includes('unmanaged')
    ) {
      statusListingEnum = 'Need Review';
      outEntry.issuesCount++;
    }

    listings.push({
      id: `LST-DBR-${idx + 1}`,
      namaPemilik: r.namaPemilik,
      namaBrand: r.namaBrand,
      aplikator: aplikatorType,
      groupId: r.groupId || '-',
      namaListing: r.namaListing || r.namaBrand || outletName,
      link: r.link || '#',
      storeId: r.storeId || '-',
      statusListing: statusListingEnum,
      alamat: r.alamat || '-',
      namaBank: r.namaBank || '-',
      namaPemilikRekening: r.namaPemilikRekening || '-',
      nomorRekening: r.nomorRekening || '-',
      outlet: outletName
    });
  });

  const outletsList: PhysicalOutletItem[] = Array.from(outletMap.entries()).map(
    ([name, d], idx) => ({
      id: `OUT-${ownerId.replace('OWN-', '')}-${idx + 1}`,
      name,
      area: d.area,
      gofoodCount: d.gofoodCount,
      grabfoodCount: d.grabfoodCount,
      shopeefoodCount: d.shopeefoodCount,
      mappingStatus: d.issuesCount > 0 ? 'Need Review' : 'Complete',
      issuesCount: d.issuesCount
    })
  );

  const physicalOutletsCount = outletsList.length > 0 ? outletsList.length : ownerRecord.outletsCount;
  const goCount = gofoodListings || ownerRecord.listings.gofood;
  const grCount = grabfoodListings || ownerRecord.listings.grabfood;
  const shCount = shopeefoodListings || ownerRecord.listings.shopeefood;
  const totalListings = goCount + grCount + shCount;

  const baseline = Math.max(15, Math.round(totalListings * 3.5 + physicalOutletsCount * 4));
  const tarif = ownerRecord.agencyFeePerOrder || 1500;
  const estOrders = baseline * 30;
  const agencyGross = estOrders * tarif;
  const adjustment = -Math.round(agencyGross * 0.05);
  const totalPayable = agencyGross + adjustment;

  const needAttentionItems: Array<{
    id: string;
    title: string;
    subtitle: string;
    type: 'mapping' | 'overdue';
  }> = [];

  const unmappedCount = outletsList.filter(o => o.mappingStatus === 'Need Review').length;
  if (unmappedCount > 0) {
    needAttentionItems.push({
      id: 'ATTN-01',
      title: `${unmappedCount} outlet needs mapping review`,
      subtitle: `${unmappedCount} outlet memiliki listing unmanaged atau review`,
      type: 'mapping'
    });
  }

  const settlementStatusStr = ownerRecord.settlementStatus as
    | 'Waiting Payment'
    | 'Paid'
    | 'Overdue'
    | 'FoodMaster Pays';

  if (settlementStatusStr === 'Overdue') {
    needAttentionItems.push({
      id: 'ATTN-02',
      title: '1 settlement overdue',
      subtitle: 'Due date passed 3 days ago',
      type: 'overdue'
    });
  }

  const gradeLetter: 'A' | 'B' | 'C' =
    ownerRecord.grade === 'A' ? 'A' : ownerRecord.grade === 'B' ? 'B' : 'C';

  return {
    id: ownerRecord.id,
    name: ownerRecord.name,
    initials: getInitials(ownerRecord.name),
    businessModel: ownerRecord.businessModel,
    status: (ownerRecord.status === 'Active' ? 'Active' : 'Attention'),
    isVip: !!ownerRecord.isVip,
    physicalOutletsCount,
    areasCount: Math.max(1, areasSet.size),
    gofoodListings: goCount,
    grabfoodListings: grCount,
    shopeefoodListings: shCount,
    baselineOrdersPerDay: baseline,
    performanceRatioAchieved: `${ownerRecord.performanceAchievedMonths}x`,
    performanceMonthsCount: ownerRecord.performanceAchievedMonths,
    grade: gradeLetter,
    gradeBasis: totalListings >= 12 ? 'Based on 3 full months' : 'Based on active volume',
    monthlyHistory: [
      { month: 'Mar', achieved: true },
      { month: 'Apr', achieved: true },
      { month: 'May', achieved: ownerRecord.performanceAchievedMonths >= 3 },
      { month: 'Jun', achieved: ownerRecord.performanceAchievedMonths >= 2 },
      { month: 'Jul', achieved: false },
      { month: 'Aug', achieved: ownerRecord.performanceAchievedMonths >= 4 }
    ],
    currentSettlement: {
      period: '26 Aug – 1 Sep 2026',
      agencyReceivableGross: agencyGross,
      adjustment,
      totalPayable,
      status: settlementStatusStr,
      dueDate: '4 Sep 2026',
      daysLeft: settlementStatusStr === 'Overdue' ? 0 : 3
    },
    outletsList: outletsList.length > 0 ? outletsList : defaultOwnerData.outletsList,
    listings,
    needAttentionItems
  };
}

const formatRupiah = (val: number): string => {
  const isNegative = val < 0;
  const abs = Math.abs(val);
  const formatted = new Intl.NumberFormat('id-ID').format(abs);
  return `${isNegative ? '- Rp ' : 'Rp '}${formatted}`;
};

export const OwnerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    'Overview' | 'Outlets' | 'Listings' | 'Transactions' | 'Settlement' | 'Reports' | 'Activity'
  >('Overview');

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

  // Automatically fetch from DBR if no raw rows cached yet
  useEffect(() => {
    if (rawDBRRows.length === 0) {
      handleFetchRealData();
    }
  }, []);

  // Calculate resolved owner detail data
  const data: OwnerDetailData = useMemo(() => {
    const targetId = id || defaultOwnerData.id;

    // 1. Try to find matching owner from cachedOwners by id or by name
    let matchedOwnerRecord = cachedOwners.find(
      (o: any) => o.id === targetId || o.name.toLowerCase() === targetId.toLowerCase()
    );

    // If viewing default Salero Minang Raya and no match by ID, check name
    if (!matchedOwnerRecord && (targetId === 'OWN-00124' || targetId.toLowerCase().includes('salero'))) {
      matchedOwnerRecord = cachedOwners.find((o: any) =>
        o.name.toLowerCase().includes('salero') || o.name.toLowerCase().includes('mahrudin')
      );
    }

    if (matchedOwnerRecord && rawDBRRows.length > 0) {
      const matchingRows = rawDBRRows.filter(
        r => r.namaPemilik.trim().toLowerCase() === matchedOwnerRecord.name.trim().toLowerCase()
      );
      if (matchingRows.length > 0) {
        return buildOwnerDetailFromDBR(targetId, matchedOwnerRecord, matchingRows);
      }
    }

    // 2. If no matched owner record but we have raw DBR rows for Salero Minang Raya / Mahrudin
    if (rawDBRRows.length > 0) {
      const matchingRows = rawDBRRows.filter(
        r =>
          r.namaPemilik.toLowerCase().includes('salero') ||
          r.namaPemilik.toLowerCase().includes('mahrudin') ||
          r.outlet.toLowerCase().includes('salero')
      );
      if (matchingRows.length > 0) {
        const mockOwner = {
          id: targetId,
          name: matchingRows[0].namaPemilik || 'Salero Minang Raya',
          email: matchingRows[0].emailFoodMaster1 || 'contact@salero.id',
          phone: matchingRows[0].nomorHp || '+62 812-3456-7890',
          businessModel: 'Agency' as const,
          outletsCount: 4,
          listings: { gofood: 2, grabfood: 3, shopeefood: 5 },
          grade: 'A',
          baselineDailyOrder: 54,
          performanceAchievedMonths: 4,
          settlementStatus: 'Waiting Payment',
          issuesCount: 0,
          status: 'Active',
          agencyFeePerOrder: matchingRows[0].tarif || 1000,
          isVip: true
        };
        return buildOwnerDetailFromDBR(targetId, mockOwner, matchingRows);
      }
    }

    // 3. Fallback to defaultOwnerData with matching ID
    return {
      ...defaultOwnerData,
      id: targetId
    };
  }, [id, cachedOwners, rawDBRRows]);

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
      const realOwners = transformCSVToOwners(parsedRows);
      setCachedOwners(realOwners);

      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setLastFetched(now);

      localStorage.setItem('elevate_dbr_raw_csv', csvText);
      localStorage.setItem('elevate_owners_real_data', JSON.stringify(realOwners));
      localStorage.setItem('elevate_owners_last_fetched', now);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengambil data dari Google Sheets DBR';
      setFetchError(message);
    } finally {
      setIsFetching(false);
    }
  };

  // State for listings filter inside detail page
  const [listingSearch, setListingSearch] = useState('');
  const [listingAplikator, setListingAplikator] = useState<string>('all');
  const [listingStatus, setListingStatus] = useState<string>('all');

  const filteredListings = useMemo(() => {
    return data.listings.filter(l => {
      if (listingAplikator !== 'all' && l.aplikator !== listingAplikator) return false;
      if (listingStatus !== 'all' && l.statusListing !== listingStatus) return false;
      if (listingSearch.trim()) {
        const q = listingSearch.toLowerCase();
        const matchName = l.namaListing.toLowerCase().includes(q);
        const matchBrand = l.namaBrand.toLowerCase().includes(q);
        const matchOutlet = l.outlet.toLowerCase().includes(q);
        const matchStoreId = l.storeId.toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchOutlet && !matchStoreId) return false;
      }
      return true;
    });
  }, [data.listings, listingSearch, listingAplikator, listingStatus]);

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
          DBR Synced ({rawDBRRows.length} Rows) &bull; {lastFetched}
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
    <DashboardLayout title="Owners" subtitle="Manage and monitor all FoodMaster owners." actions={topBarActions}>
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
            {(['Overview', 'Outlets', 'Listings', 'Transactions', 'Settlement', 'Reports', 'Activity'] as const).map(tab => {
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

        {/* Outlets Sub-tab */}
        {activeTab === 'Outlets' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#F1F5F9]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-[#0F172A]">
                      Daftar Physical Outlet
                    </h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                      {data.outletsList.length} Outlet
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Daftar seluruh physical outlet milik {data.name} beserta rincian channel listing aplikator.
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto border border-[#E2E8F0] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold">
                      <th className="py-3.5 px-4">Nama Physical Outlet</th>
                      <th className="py-3.5 px-4">Area / Wilayah</th>
                      <th className="py-3.5 px-3 text-center">GO (GoFood)</th>
                      <th className="py-3.5 px-3 text-center">GR (GrabFood)</th>
                      <th className="py-3.5 px-3 text-center">S (ShopeeFood)</th>
                      <th className="py-3.5 px-3 text-center">Total Listing</th>
                      <th className="py-3.5 px-3 text-center">Status Mapping</th>
                      <th className="py-3.5 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {data.outletsList.map(outlet => {
                      const totalListings = outlet.gofoodCount + outlet.grabfoodCount + outlet.shopeefoodCount;
                      return (
                        <tr key={outlet.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                                <Store className="w-4 h-4" />
                              </div>
                              <div>
                                <Link
                                  to={`/outlets/${outlet.id}`}
                                  className="font-semibold text-[#0F172A] hover:text-[#2563EB] hover:underline transition-colors block"
                                >
                                  {outlet.name}
                                </Link>
                                <div className="text-[11px] text-[#64748B]">
                                  Outlet ID: <span className="font-mono">{outlet.id}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-[#334155]">
                            {outlet.area}
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
                            {totalListings}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {outlet.mappingStatus === 'Complete' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#BBF7D0]">
                                Complete
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                                Need Review ({outlet.issuesCount})
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Listings Sub-tab */}
        {activeTab === 'Listings' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#F1F5F9]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-[#0F172A]">
                      Informasi Listing Platform (DBR)
                    </h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                      {filteredListings.length} Listings
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Daftar seluruh listing aplikator merchant (GoFood, GrabFood, ShopeeFood) dari database DBR untuk {data.name}.
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari listing, brand, outlet, store ID..."
                    value={listingSearch}
                    onChange={e => setListingSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A] placeholder-[#94A3B8]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={listingAplikator}
                    onChange={e => setListingAplikator(e.target.value)}
                    className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#475569] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    aria-label="Filter aplikator"
                  >
                    <option value="all">Semua Aplikator</option>
                    <option value="GoFood">GoFood</option>
                    <option value="GrabFood">GrabFood</option>
                    <option value="ShopeeFood">ShopeeFood</option>
                  </select>

                  <select
                    value={listingStatus}
                    onChange={e => setListingStatus(e.target.value)}
                    className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#475569] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    aria-label="Filter status listing"
                  >
                    <option value="all">Semua Status</option>
                    <option value="Live">Live</option>
                    <option value="Need Review">Need Review</option>
                    <option value="Inactive">Inactive</option>
                  </select>

                  {(listingSearch || listingAplikator !== 'all' || listingStatus !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setListingSearch('');
                        setListingAplikator('all');
                        setListingStatus('all');
                      }}
                      className="p-2 text-[#64748B] hover:text-[#0F172A] rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC]"
                      title="Reset Filter"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 12-Column Table */}
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
                    {filteredListings.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-xs text-[#64748B]">
                          Tidak ada listing yang cocok dengan pencarian atau filter.
                        </td>
                      </tr>
                    ) : (
                      filteredListings.map(item => (
                        <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-[#0F172A] whitespace-nowrap">
                            {item.namaPemilik}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-[#334155] whitespace-nowrap">
                            {item.namaBrand}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {item.aplikator === 'GoFood' && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-xs font-medium text-gray-800">
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#E53935] text-white text-[9px] font-bold shrink-0">
                                  GF
                                </span>
                                <span>GoFood</span>
                              </span>
                            )}
                            {item.aplikator === 'GrabFood' && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-medium text-gray-800">
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#00B14F] text-white text-[9px] font-bold shrink-0">
                                  GR
                                </span>
                                <span>GrabFood</span>
                              </span>
                            )}
                            {item.aplikator === 'ShopeeFood' && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-100 text-xs font-medium text-gray-800">
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#EE4D2D] text-white text-[9px] font-bold shrink-0">
                                  SF
                                </span>
                                <span>ShopeeFood</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="font-mono text-xs font-medium text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded">
                              {item.groupId}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#0F172A] whitespace-nowrap">
                            {item.namaListing}
                          </td>
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            {item.link && item.link !== '#' ? (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] transition-colors"
                              >
                                <span>Buka</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-[#94A3B8]">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 font-mono font-semibold text-[#0F172A] whitespace-nowrap">
                            {item.storeId}
                          </td>
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
                          <td className="py-3.5 px-4 min-w-[220px] max-w-[280px]">
                            <div className="text-xs text-[#475569] line-clamp-2 leading-relaxed" title={item.alamat}>
                              {item.alamat}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap font-medium text-[#334155]">
                            {item.namaBank}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#334155]">
                            {item.namaPemilikRekening}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[#334155]">
                            {item.nomorRekening}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Sub-tab */}
        {activeTab === 'Transactions' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#F1F5F9]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-[#0F172A]">
                      Transaksi Seluruh Outlet {data.name}
                    </h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                      Live Context
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1">
                    Semua transaksi dari seluruh outlet dan channel aplikator yang terhubung dengan akun owner ini.
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto border border-[#E2E8F0] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold">
                      <th className="py-3 px-4">Waktu</th>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-3">Platform</th>
                      <th className="py-3 px-4">Physical Outlet</th>
                      <th className="py-3 px-4">Platform Listing</th>
                      <th className="py-3 px-3">SID</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Nilai Order</th>
                      <th className="py-3 px-4 text-right">Agency Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {MOCK_TRANSACTIONS.filter(
                      t =>
                        t.owner.toLowerCase().includes(data.name.toLowerCase()) ||
                        t.physicalOutlet.toLowerCase().includes(data.name.toLowerCase()) ||
                        data.name.toLowerCase().includes('salero')
                    ).map(tx => (
                      <tr key={tx.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                          {tx.dateTime}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB] whitespace-nowrap">
                          {tx.orderId}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {tx.platform === 'gofood' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">
                              GoFood
                            </span>
                          )}
                          {tx.platform === 'grabfood' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                              GrabFood
                            </span>
                          )}
                          {tx.platform === 'shopeefood' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-medium">
                              ShopeeFood
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#0F172A] whitespace-nowrap">
                          {tx.physicalOutlet}
                        </td>
                        <td className="py-3.5 px-4 text-[#334155] whitespace-nowrap">
                          {tx.platformListing}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[#475569] whitespace-nowrap">
                          {tx.sid}
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {tx.status === 'Sukses' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#166534]">
                              Sukses
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#DC2626]">
                              Batal
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-[#0F172A] whitespace-nowrap">
                          {formatRupiah(tx.orderValue)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#059669] whitespace-nowrap">
                          {formatRupiah(tx.agencyFee)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Other Tabs (Settlement, Reports, Activity) */}
        {(activeTab === 'Settlement' || activeTab === 'Reports' || activeTab === 'Activity') && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center max-w-xl mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0F172A]">
              Tab {activeTab}
            </h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto">
              Rincian data {activeTab.toLowerCase()} untuk {data.name} ({data.id}) disaring secara otomatis berdasarkan konteks database DBR.
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
