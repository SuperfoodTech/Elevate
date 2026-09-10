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
  {
    id: '1', dateTime: '21 Agu 2026 15:32:18', orderId: 'GF-9876543210', platform: 'grabfood',
    vb: 'Foodnesia', physicalOutlet: 'Minang Agung - Klojen', platformListing: 'Minang Agung Klojen',
    mid: 'G12345678', klikiitBrandName: 'Minang Agung', status: 'Sukses',
    orderValue: 144000, netSales: 135000, ofdFees: 90360, revenue: 44640,
    cogs: 38000, grossMargin: 6640, adsCostProrated: 1200, gmAfterAds: 5440,
    merchantId: 'G12345678', storeName: 'Minang Agung Klojen',
    transferId: 'TRF-20260821-153218-8472', settlementId: 'SET-20260821-00021',
    cogsDetector: 'Detected', movedAt: '21 Agu 2026  15:38:02', catatan: '-',
    ingestedAt: '21 Agu 2026  15:35:42', ingestedBy: 'System', lastUpdated: '21 Agu 2026  15:35:42',
  },
  {
    id: '2', dateTime: '21 Agu 2026 15:20:05', orderId: 'GF-9876541298', platform: 'grabfood',
    vb: 'Foodnesia', physicalOutlet: 'Depot 88 - Darmo', platformListing: 'Depot 88 Darmo',
    mid: 'G22334455', klikiitBrandName: 'Depot 88', status: 'Sukses',
    orderValue: 96000, netSales: 90000, ofdFees: 58320, revenue: 31680,
    cogs: 25000, grossMargin: 6680, adsCostProrated: 900, gmAfterAds: 5780,
    merchantId: 'G22334455', storeName: 'Depot 88 Darmo',
    transferId: 'TRF-20260821-152005-3341', settlementId: 'SET-20260821-00022',
    cogsDetector: 'Detected', movedAt: '21 Agu 2026  15:25:10', catatan: '-',
    ingestedAt: '21 Agu 2026  15:22:30', ingestedBy: 'System', lastUpdated: '21 Agu 2026  15:22:30',
  },
  {
    id: '3', dateTime: '21 Agu 2026 14:58:02', orderId: 'GF-9876539987', platform: 'grabfood',
    vb: 'Foodnesia', physicalOutlet: 'Roti Bakar 41 - Galaxy', platformListing: 'Roti Bakar 41 Galaxy',
    mid: 'G33445566', klikiitBrandName: 'Roti Bakar 41', status: 'Sukses',
    orderValue: 72000, netSales: 67500, ofdFees: 45180, revenue: 22320,
    cogs: 17500, grossMargin: 4820, adsCostProrated: 700, gmAfterAds: 4120,
    merchantId: 'G33445566', storeName: 'Roti Bakar 41 Galaxy',
    transferId: 'TRF-20260821-145802-1120', settlementId: 'SET-20260821-00023',
    cogsDetector: 'Detected', movedAt: '21 Agu 2026  15:02:45', catatan: '-',
    ingestedAt: '21 Agu 2026  15:00:15', ingestedBy: 'System', lastUpdated: '21 Agu 2026  15:00:15',
  },
  {
    id: '4', dateTime: '21 Agu 2026 14:41:11', orderId: 'GO-12345678901', platform: 'gofood',
    vb: 'Foodnesia', physicalOutlet: 'Ayam Bakar PP - Surabaya', platformListing: 'Ayam Bakar PP Surabaya',
    mid: 'M87654321', klikiitBrandName: 'Ayam Bakar PP', status: 'Sukses',
    orderValue: 68000, netSales: 64600, ofdFees: 12600, revenue: 52000,
    cogs: 35000, grossMargin: 17000, adsCostProrated: 1500, gmAfterAds: 15500,
    merchantId: 'M87654321', storeName: 'Ayam Bakar PP Surabaya',
    transferId: 'TRF-20260821-144111-5532', settlementId: 'SET-20260821-00024',
    cogsDetector: 'Detected', movedAt: '21 Agu 2026  14:46:20', catatan: '-',
    ingestedAt: '21 Agu 2026  14:43:55', ingestedBy: 'System', lastUpdated: '21 Agu 2026  14:43:55',
  },
  {
    id: '5', dateTime: '21 Agu 2026 14:30:47', orderId: 'SHP-5566778899', platform: 'shopeefood',
    vb: 'Foodnesia', physicalOutlet: 'Bubur Ayam Jakarta', platformListing: 'Bubur Ayam Jakarta',
    mid: 'S99887766', klikiitBrandName: 'Bubur Ayam Jakarta', status: 'Sukses',
    orderValue: 58000, netSales: 55100, ofdFees: 14500, revenue: 40600,
    cogs: 28000, grossMargin: 12600, adsCostProrated: 1100, gmAfterAds: 11500,
    merchantId: 'S99887766', storeName: 'Bubur Ayam Jakarta',
    transferId: 'TRF-20260821-143047-7721', settlementId: 'SET-20260821-00025',
    cogsDetector: 'Detected', movedAt: '21 Agu 2026  14:36:00', catatan: '-',
    ingestedAt: '21 Agu 2026  14:32:10', ingestedBy: 'System', lastUpdated: '21 Agu 2026  14:32:10',
  },
  {
    id: '6', dateTime: '21 Agu 2026 14:22:33', orderId: 'GF-9876532211', platform: 'grabfood',
    vb: 'Foodnesia', physicalOutlet: 'Sate Sriwijaya - HRM', platformListing: 'Sate Sriwijaya HRM',
    mid: 'G66778899', klikiitBrandName: 'Sate Sriwijaya', status: 'Batal',
    orderValue: 80000, netSales: 72000, ofdFees: 8000, revenue: 72000,
    cogs: 36000, grossMargin: 36000, adsCostProrated: 1500, gmAfterAds: 34500,
    merchantId: 'G66778899', storeName: 'Sate Sriwijaya HRM',
    transferId: 'TRF-20260821-142233-3355', settlementId: 'SET-20260821-00000',
    cogsDetector: 'Detected', movedAt: '21 Agu 2026  14:23:01',
    catatan: 'Order dibatalkan oleh customer sebelum merchant menerima pesanan.',
    ingestedAt: '21 Agu 2026  14:24:12', ingestedBy: 'System', lastUpdated: '21 Agu 2026  14:24:12',
  },
  {
    id: '7', dateTime: '21 Agu 2026 13:55:44', orderId: 'GO-98765432109', platform: 'gofood',
    vb: 'Foodnesia', physicalOutlet: 'Nasi Padang Sederhana - Semanggi', platformListing: 'Nasi Padang Sederhana Semanggi',
    mid: 'M11223344', klikiitBrandName: 'Nasi Padang Sederhana', status: 'Sukses',
    orderValue: 55000, netSales: 52250, ofdFees: 10450, revenue: 41800,
    cogs: 22000, grossMargin: 19800, adsCostProrated: 900, gmAfterAds: 18900,
    merchantId: 'M11223344', storeName: 'Nasi Padang Sederhana Semanggi',
    transferId: 'TRF-20260821-135544-9910', settlementId: 'SET-20260821-00026',
    cogsDetector: 'Detected', movedAt: '21 Agu 2026  14:00:30', catatan: '-',
    ingestedAt: '21 Agu 2026  13:58:00', ingestedBy: 'System', lastUpdated: '21 Agu 2026  13:58:00',
  },
  {
    id: '8', dateTime: '21 Agu 2026 13:40:10', orderId: 'SHP-4455667788', platform: 'shopeefood',
    vb: 'Foodnesia', physicalOutlet: 'Bebek Goreng Pak Ndut - Tebet', platformListing: 'Bebek Goreng Pak Ndut Tebet',
    mid: 'S44332211', klikiitBrandName: 'Bebek Goreng Pak Ndut', status: 'Sukses',
    orderValue: 120000, netSales: 114000, ofdFees: 30000, revenue: 84000,
    cogs: 52000, grossMargin: 32000, adsCostProrated: 2200, gmAfterAds: 29800,
    merchantId: 'S44332211', storeName: 'Bebek Goreng Pak Ndut Tebet',
    transferId: 'TRF-20260821-134010-6672', settlementId: 'SET-20260821-00027',
    cogsDetector: 'Detected', movedAt: '21 Agu 2026  13:45:55', catatan: '-',
    ingestedAt: '21 Agu 2026  13:42:20', ingestedBy: 'System', lastUpdated: '21 Agu 2026  13:42:20',
  },
  {
    id: '9', dateTime: '21 Agu 2026 12:15:30', orderId: 'GF-9876520011', platform: 'grabfood',
    vb: 'Foodnesia', physicalOutlet: 'Warung Tegal Mbak Yem - Cengkareng', platformListing: 'Warung Tegal Mbak Yem Cengkareng',
    mid: 'G77889900', klikiitBrandName: 'Warung Tegal Mbak Yem', status: 'Sukses',
    orderValue: 43000, netSales: 40850, ofdFees: 13620, revenue: 27230,
    cogs: 16000, grossMargin: 11230, adsCostProrated: 800, gmAfterAds: 10430,
    merchantId: 'G77889900', storeName: 'Warung Tegal Mbak Yem Cengkareng',
    transferId: 'TRF-20260821-121530-4481', settlementId: 'SET-20260821-00028',
    cogsDetector: 'Detected', movedAt: '21 Agu 2026  12:20:15', catatan: '-',
    ingestedAt: '21 Agu 2026  12:17:50', ingestedBy: 'System', lastUpdated: '21 Agu 2026  12:17:50',
  },
  {
    id: '10', dateTime: '21 Agu 2026 11:05:00', orderId: 'GO-87654321098', platform: 'gofood',
    vb: 'Foodnesia', physicalOutlet: 'Mie Ayam Pak Kumis - Kemang', platformListing: 'Mie Ayam Pak Kumis Kemang',
    mid: 'M33221100', klikiitBrandName: 'Mie Ayam Pak Kumis', status: 'Sukses',
    orderValue: 38000, netSales: 36100, ofdFees: 11780, revenue: 24320,
    cogs: 14000, grossMargin: 10320, adsCostProrated: 700, gmAfterAds: 9620,
    merchantId: 'M33221100', storeName: 'Mie Ayam Pak Kumis Kemang',
    transferId: 'TRF-20260821-110500-2201', settlementId: 'SET-20260821-00029',
    cogsDetector: 'Detected', movedAt: '21 Agu 2026  11:10:40', catatan: '-',
    ingestedAt: '21 Agu 2026  11:07:20', ingestedBy: 'System', lastUpdated: '21 Agu 2026  11:07:20',
  },
];

export const VB_TOTAL_ORDER_COUNT = 1248;

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
  return (value / total * 100).toFixed(1).replace('.', ',') + '%';
}
