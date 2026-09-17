export type Platform = 'gofood' | 'grabfood' | 'shopeefood';
export type OrderStatus = 'Sukses' | 'Batal';
export type OrderStage = 'live' | 'akuisisi_to_live';

export interface Transaction {
  id: string;
  dateTime: string;
  orderId: string;
  platform: Platform;
  owner: string;
  physicalOutlet: string;
  platformListing: string;
  sid: string;
  status: OrderStatus;
  orderValue: number;
  agencyFee: number;
  orderStage?: OrderStage;
  netSales?: number;
  marketingSuccessFee?: number;
  orderCommission?: number;
  ofdFees?: number;
  ingestedAt?: string;
  ingestedBy?: string;
  lastUpdated?: string;
}

export const MOCK_TRANSACTIONS: Transaction[] = [];

export const TOTAL_ORDER_COUNT = 0;

// O(1) lookup map keyed by orderId
export const TRANSACTIONS_BY_ORDER_ID: Map<string, Transaction> = new Map(
  MOCK_TRANSACTIONS.map((t) => [t.orderId, t])
);

export function getPlatformLabel(platform: Platform): string {
  if (platform === 'gofood') return 'GoFood';
  if (platform === 'grabfood') return 'GrabFood';
  return 'ShopeeFood';
}

export function getDataSource(platform: Platform): string {
  if (platform === 'gofood') return 'GoFood Agency';
  if (platform === 'grabfood') return 'GrabFood Agency';
  return 'ShopeeFood Agency';
}

export function formatRupiah(value: number): string {
  return 'Rp ' + value.toLocaleString('id-ID');
}
