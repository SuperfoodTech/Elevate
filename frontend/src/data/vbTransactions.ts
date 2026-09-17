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

export const MOCK_VB_TRANSACTIONS: VBTransaction[] = [];

export const VB_TOTAL_ORDER_COUNT = 0;

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
