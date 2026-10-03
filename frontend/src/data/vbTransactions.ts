export type Platform = 'gofood' | 'grabfood' | 'shopeefood';
export type OrderStatus = 'Sukses' | 'Batal';

export interface VBTransaction {
  id: string;
  dateTime: string;
  orderId: string;
  platform: Platform;
  vb: string;
  physicalOutlet: string;
  platformListing: string;
  mid: string;
  klikiitBrandName: string;
  status: OrderStatus;
  orderValue: number;
  netSales: number;
  ofdFees: number;
  revenue: number;
  cogs: number;
  grossMargin: number;
  adsCostProrated: number;
  gmAfterAds: number;
  merchantId: string;
  storeName: string;
  transferId: string;
  settlementId: string;
  cogsDetector: 'Detected' | 'Not Detected';
  movedAt: string;
  catatan: string;
  ingestedAt: string;
  ingestedBy: string;
  lastUpdated: string;
}

export const MOCK_VB_TRANSACTIONS: VBTransaction[] = [
  // Week 3 (17 - 23 Agu 2026)
  {
    id: 'vb-1',
    dateTime: '21 Agu 2026 15:32:18',
    orderId: 'GF-9876543210',
    platform: 'grabfood',
    vb: 'Foodnesia',
    physicalOutlet: 'Minang Agung - Klojen',
    platformListing: 'Minang Agung Klojen',
    mid: 'G12345678',
    klikiitBrandName: 'Minang Agung',
    status: 'Sukses',
    orderValue: 144000,
    netSales: 135000,
    ofdFees: 90360,
    revenue: 44640,
    cogs: 38000,
    grossMargin: 6640,
    adsCostProrated: 1200,
    gmAfterAds: 5440,
    merchantId: 'G12345678',
    storeName: 'Minang Agung Klojen',
    transferId: 'TRF-20260821-153218-8472',
    settlementId: 'SET-20260821-00021',
    cogsDetector: 'Detected',
    movedAt: '21 Agu 2026 15:38:02',
    catatan: '-',
    ingestedAt: '21 Agu 2026 15:35:42',
    ingestedBy: 'System',
    lastUpdated: '21 Agu 2026 15:35:42',
  },
  {
    id: 'vb-2',
    dateTime: '20 Agu 2026 12:14:05',
    orderId: 'GF-9876543211',
    platform: 'gofood',
    vb: 'Ayam Rempah',
    physicalOutlet: 'Ayam Rempah - Gubeng',
    platformListing: 'Ayam Rempah Gubeng',
    mid: 'G23456789',
    klikiitBrandName: 'Ayam Rempah',
    status: 'Sukses',
    orderValue: 88000,
    netSales: 80000,
    ofdFees: 52000,
    revenue: 28000,
    cogs: 22000,
    grossMargin: 6000,
    adsCostProrated: 800,
    gmAfterAds: 5200,
    merchantId: 'G23456789',
    storeName: 'Ayam Rempah Gubeng',
    transferId: 'TRF-20260820-121405-1123',
    settlementId: 'SET-20260820-00015',
    cogsDetector: 'Detected',
    movedAt: '20 Agu 2026 12:20:00',
    catatan: '-',
    ingestedAt: '20 Agu 2026 12:18:00',
    ingestedBy: 'System',
    lastUpdated: '20 Agu 2026 12:18:00',
  },
  {
    id: 'vb-3',
    dateTime: '18 Agu 2026 18:45:10',
    orderId: 'SF-5544332211',
    platform: 'shopeefood',
    vb: 'Bebek Madura',
    physicalOutlet: 'Bebek Madura - Manyar',
    platformListing: 'Bebek Madura Manyar',
    mid: 'S99887766',
    klikiitBrandName: 'Bebek Madura',
    status: 'Sukses',
    orderValue: 125000,
    netSales: 115000,
    ofdFees: 75000,
    revenue: 40000,
    cogs: 31000,
    grossMargin: 9000,
    adsCostProrated: 1500,
    gmAfterAds: 7500,
    merchantId: 'S99887766',
    storeName: 'Bebek Madura Manyar',
    transferId: 'TRF-20260818-184510-4491',
    settlementId: 'SET-20260818-00042',
    cogsDetector: 'Detected',
    movedAt: '18 Agu 2026 18:50:00',
    catatan: '-',
    ingestedAt: '18 Agu 2026 18:48:00',
    ingestedBy: 'System',
    lastUpdated: '18 Agu 2026 18:48:00',
  },
  // Week 4 (24 - 30 Agu 2026)
  {
    id: 'vb-4',
    dateTime: '28 Agu 2026 14:10:00',
    orderId: 'GF-1122334455',
    platform: 'gofood',
    vb: 'Foodnesia',
    physicalOutlet: 'Minang Agung - Klojen',
    platformListing: 'Minang Agung Klojen',
    mid: 'G12345678',
    klikiitBrandName: 'Minang Agung',
    status: 'Sukses',
    orderValue: 95000,
    netSales: 87000,
    ofdFees: 58000,
    revenue: 29000,
    cogs: 24000,
    grossMargin: 5000,
    adsCostProrated: 900,
    gmAfterAds: 4100,
    merchantId: 'G12345678',
    storeName: 'Minang Agung Klojen',
    transferId: 'TRF-20260828-141000-9921',
    settlementId: 'SET-20260828-00088',
    cogsDetector: 'Detected',
    movedAt: '28 Agu 2026 14:15:00',
    catatan: '-',
    ingestedAt: '28 Agu 2026 14:12:00',
    ingestedBy: 'System',
    lastUpdated: '28 Agu 2026 14:12:00',
  }
];

export const VB_TOTAL_ORDER_COUNT = MOCK_VB_TRANSACTIONS.length;

export const VB_TRANSACTIONS_BY_ORDER_ID: Map<string, VBTransaction> = new Map(
  MOCK_VB_TRANSACTIONS.map((t) => [t.orderId, t])
);

export function getPlatformLabel(platform: Platform): string {
  if (platform === 'gofood') return 'GoFood';
  if (platform === 'grabfood') return 'GrabFood';
  return 'ShopeeFood';
}

export function formatRupiah(value: number): string {
  return 'Rp ' + value.toLocaleString('id-ID');
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0,0%';
  return ((value / total) * 100).toFixed(1).replace('.', ',') + '%';
}
