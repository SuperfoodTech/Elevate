export type Platform = 'gofood' | 'grabfood' | 'shopeefood';
export type OrderStatus = 'Sukses' | 'Batal';

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
  netSales?: number;
  marketingSuccessFee?: number;
  orderCommission?: number;
  ofdFees?: number;
  ingestedAt?: string;
  ingestedBy?: string;
  lastUpdated?: string;
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', dateTime: '1 Sep 2026 14:32', orderId: 'GF-81273-2345678', platform: 'gofood', owner: 'Salero Group', physicalOutlet: 'Salero Minang Raya - Manyar', platformListing: 'Salero Minang Raya Manyar', sid: 'GF-81273', status: 'Sukses', orderValue: 36000, agencyFee: 2000, netSales: 32000, marketingSuccessFee: 0, orderCommission: 4000, ofdFees: 0, ingestedAt: '1 Sep 2026  13:02:15', ingestedBy: 'System', lastUpdated: '1 Sep 2026  13:02:15' },
  { id: '2', dateTime: '1 Sep 2026 14:28', orderId: 'SF-91881-8877665', platform: 'shopeefood', owner: 'Salero Group', physicalOutlet: 'Salero Minang Raya - Gubeng', platformListing: 'Salero Minang Raya Gubeng', sid: 'SF-91881', status: 'Sukses', orderValue: 28000, agencyFee: 2000, netSales: 24000, marketingSuccessFee: 0, orderCommission: 4000, ofdFees: 0, ingestedAt: '1 Sep 2026  14:35:20', ingestedBy: 'System', lastUpdated: '1 Sep 2026  14:35:20' },
  { id: '3', dateTime: '1 Sep 2026 14:21', orderId: 'GR-77311-5544332', platform: 'grabfood', owner: 'Roti Bakar 41 Group', physicalOutlet: 'Roti Bakar 41 - Merr', platformListing: 'Roti Bakar 41 Merr', sid: 'GR-77311', status: 'Sukses', orderValue: 40000, agencyFee: 2000, netSales: 36000, marketingSuccessFee: 0, orderCommission: 4000, ofdFees: 0, ingestedAt: '1 Sep 2026  14:28:00', ingestedBy: 'System', lastUpdated: '1 Sep 2026  14:28:00' },
  { id: '4', dateTime: '1 Sep 2026 14:18', orderId: 'GF-81273-1122334', platform: 'gofood', owner: 'Salero Group', physicalOutlet: 'Salero Minang Raya - Manyar', platformListing: 'Salero Minang Raya Manyar', sid: 'GF-81273', status: 'Batal', orderValue: 45000, agencyFee: 2000, netSales: 40500, marketingSuccessFee: 0, orderCommission: 4500, ofdFees: 0, ingestedAt: '1 Sep 2026  14:25:10', ingestedBy: 'System', lastUpdated: '1 Sep 2026  14:25:10' },
  { id: '5', dateTime: '31 Agu 2026 21:45', orderId: 'GR-99321-9988776', platform: 'grabfood', owner: 'Salero Group', physicalOutlet: 'Salero Minang Raya 2 - Manyar', platformListing: 'Salero Minang Raya Manyar 2', sid: 'GR-99321', status: 'Sukses', orderValue: 68000, agencyFee: 2000, netSales: 61000, marketingSuccessFee: 0, orderCommission: 7000, ofdFees: 0, ingestedAt: '31 Agu 2026  21:52:00', ingestedBy: 'System', lastUpdated: '31 Agu 2026  21:52:00' },
  { id: '6', dateTime: '31 Agu 2026 20:12', orderId: 'SF-22112-6655443', platform: 'shopeefood', owner: 'Martabak Holans Group', physicalOutlet: 'Martabak Holans - Darmo', platformListing: 'Martabak Holans Darmo', sid: 'SF-22112', status: 'Sukses', orderValue: 36000, agencyFee: 2000, netSales: 32000, marketingSuccessFee: 0, orderCommission: 4000, ofdFees: 0, ingestedAt: '31 Agu 2026  20:19:45', ingestedBy: 'System', lastUpdated: '31 Agu 2026  20:19:45' },
  { id: '7', dateTime: '31 Agu 2026 19:03', orderId: 'GR-77122-4433221', platform: 'grabfood', owner: 'Bubur Ayam Group', physicalOutlet: 'Bubur Ayam Jak. Bang Udin', platformListing: 'Bubur Ayam Jak. Bang Udin', sid: 'GR-77122', status: 'Sukses', orderValue: 44000, agencyFee: 2000, netSales: 39600, marketingSuccessFee: 0, orderCommission: 4400, ofdFees: 0, ingestedAt: '31 Agu 2026  19:10:30', ingestedBy: 'System', lastUpdated: '31 Agu 2026  19:10:30' },
  { id: '8', dateTime: '31 Agu 2026 18:52', orderId: 'GF-33442-5566778', platform: 'gofood', owner: 'Kebab Baba Amir Group', physicalOutlet: 'Kebab Baba Amir - Ketintang', platformListing: 'Kebab Baba Amir Ketintang', sid: 'GF-33442', status: 'Batal', orderValue: 32000, agencyFee: 2000, netSales: 28800, marketingSuccessFee: 0, orderCommission: 3200, ofdFees: 0, ingestedAt: '31 Agu 2026  18:59:00', ingestedBy: 'System', lastUpdated: '31 Agu 2026  18:59:00' },
  { id: '9', dateTime: '31 Agu 2026 18:30', orderId: 'SF-55211-7788990', platform: 'shopeefood', owner: 'Depot 88 Group', physicalOutlet: 'Depot 88 - Citraland', platformListing: 'Depot 88 Citraland', sid: 'SF-55211', status: 'Batal', orderValue: 25000, agencyFee: 2000, netSales: 22500, marketingSuccessFee: 0, orderCommission: 2500, ofdFees: 0, ingestedAt: '31 Agu 2026  18:37:15', ingestedBy: 'System', lastUpdated: '31 Agu 2026  18:37:15' },
  { id: '10', dateTime: '31 Agu 2026 17:20', orderId: 'GF-81273-9988661', platform: 'gofood', owner: 'Salero Group', physicalOutlet: 'Salero Minang Raya - Manyar', platformListing: 'Salero Minang Raya Manyar', sid: 'GF-81273', status: 'Sukses', orderValue: 56000, agencyFee: 2000, netSales: 50400, marketingSuccessFee: 0, orderCommission: 5600, ofdFees: 0, ingestedAt: '31 Agu 2026  17:27:00', ingestedBy: 'System', lastUpdated: '31 Agu 2026  17:27:00' },
  { id: '11', dateTime: '31 Agu 2026 16:55', orderId: 'GR-44512-3321100', platform: 'grabfood', owner: 'Roti Bakar 41 Group', physicalOutlet: 'Roti Bakar 41 - Merr', platformListing: 'Roti Bakar 41 Merr', sid: 'GR-44512', status: 'Sukses', orderValue: 38000, agencyFee: 2000, netSales: 34200, marketingSuccessFee: 0, orderCommission: 3800, ofdFees: 0, ingestedAt: '31 Agu 2026  17:02:10', ingestedBy: 'System', lastUpdated: '31 Agu 2026  17:02:10' },
  { id: '12', dateTime: '31 Agu 2026 16:10', orderId: 'SF-91882-6677889', platform: 'shopeefood', owner: 'Salero Group', physicalOutlet: 'Salero Minang Raya - Manyar', platformListing: 'Salero Minang Raya Manyar', sid: 'SF-91882', status: 'Sukses', orderValue: 42000, agencyFee: 2000, netSales: 37800, marketingSuccessFee: 0, orderCommission: 4200, ofdFees: 0, ingestedAt: '31 Agu 2026  16:17:45', ingestedBy: 'System', lastUpdated: '31 Agu 2026  16:17:45' },
  { id: '13', dateTime: '31 Agu 2026 15:30', orderId: 'GF-22334-1122556', platform: 'gofood', owner: 'Martabak Holans Group', physicalOutlet: 'Martabak Holans - Darmo', platformListing: 'Martabak Holans Darmo', sid: 'GF-22334', status: 'Batal', orderValue: 29000, agencyFee: 2000, netSales: 26100, marketingSuccessFee: 0, orderCommission: 2900, ofdFees: 0, ingestedAt: '31 Agu 2026  15:37:00', ingestedBy: 'System', lastUpdated: '31 Agu 2026  15:37:00' },
  { id: '14', dateTime: '31 Agu 2026 14:45', orderId: 'GR-66123-4455667', platform: 'grabfood', owner: 'Bubur Ayam Group', physicalOutlet: 'Bubur Ayam Jak. Bang Udin', platformListing: 'Bubur Ayam Jak. Bang Udin', sid: 'GR-66123', status: 'Sukses', orderValue: 51000, agencyFee: 2000, netSales: 45900, marketingSuccessFee: 0, orderCommission: 5100, ofdFees: 0, ingestedAt: '31 Agu 2026  14:52:20', ingestedBy: 'System', lastUpdated: '31 Agu 2026  14:52:20' },
  { id: '15', dateTime: '30 Agu 2026 22:10', orderId: 'GF-81273-7788002', platform: 'gofood', owner: 'Salero Group', physicalOutlet: 'Salero Minang Raya - Gubeng', platformListing: 'Salero Minang Raya Gubeng', sid: 'GF-81273', status: 'Sukses', orderValue: 33000, agencyFee: 2000, netSales: 29700, marketingSuccessFee: 0, orderCommission: 3300, ofdFees: 0, ingestedAt: '30 Agu 2026  22:17:05', ingestedBy: 'System', lastUpdated: '30 Agu 2026  22:17:05' },
  { id: '16', dateTime: '30 Agu 2026 21:05', orderId: 'SF-33412-9900112', platform: 'shopeefood', owner: 'Kebab Baba Amir Group', physicalOutlet: 'Kebab Baba Amir - Ketintang', platformListing: 'Kebab Baba Amir Ketintang', sid: 'SF-33412', status: 'Sukses', orderValue: 27000, agencyFee: 2000, netSales: 24300, marketingSuccessFee: 0, orderCommission: 2700, ofdFees: 0, ingestedAt: '30 Agu 2026  21:12:00', ingestedBy: 'System', lastUpdated: '30 Agu 2026  21:12:00' },
  { id: '17', dateTime: '30 Agu 2026 20:30', orderId: 'GR-77311-2233440', platform: 'grabfood', owner: 'Roti Bakar 41 Group', physicalOutlet: 'Roti Bakar 41 - Merr', platformListing: 'Roti Bakar 41 Merr', sid: 'GR-77311', status: 'Batal', orderValue: 35000, agencyFee: 2000, netSales: 31500, marketingSuccessFee: 0, orderCommission: 3500, ofdFees: 0, ingestedAt: '30 Agu 2026  20:37:30', ingestedBy: 'System', lastUpdated: '30 Agu 2026  20:37:30' },
  { id: '18', dateTime: '30 Agu 2026 19:15', orderId: 'GF-55001-3344512', platform: 'gofood', owner: 'Depot 88 Group', physicalOutlet: 'Depot 88 - Citraland', platformListing: 'Depot 88 Citraland', sid: 'GF-55001', status: 'Sukses', orderValue: 47000, agencyFee: 2000, netSales: 42300, marketingSuccessFee: 0, orderCommission: 4700, ofdFees: 0, ingestedAt: '30 Agu 2026  19:22:15', ingestedBy: 'System', lastUpdated: '30 Agu 2026  19:22:15' },
  { id: '19', dateTime: '30 Agu 2026 18:40', orderId: 'SF-22112-4455667', platform: 'shopeefood', owner: 'Martabak Holans Group', physicalOutlet: 'Martabak Holans - Darmo', platformListing: 'Martabak Holans Darmo', sid: 'SF-22112', status: 'Sukses', orderValue: 39000, agencyFee: 2000, netSales: 35100, marketingSuccessFee: 0, orderCommission: 3900, ofdFees: 0, ingestedAt: '30 Agu 2026  18:47:00', ingestedBy: 'System', lastUpdated: '30 Agu 2026  18:47:00' },
  { id: '20', dateTime: '30 Agu 2026 17:00', orderId: 'GR-99321-1100221', platform: 'grabfood', owner: 'Salero Group', physicalOutlet: 'Salero Minang Raya 2 - Manyar', platformListing: 'Salero Minang Raya Manyar 2', sid: 'GR-99321', status: 'Sukses', orderValue: 62000, agencyFee: 2000, netSales: 55800, marketingSuccessFee: 0, orderCommission: 6200, ofdFees: 0, ingestedAt: '30 Agu 2026  17:07:20', ingestedBy: 'System', lastUpdated: '30 Agu 2026  17:07:20' },
];

export const TOTAL_ORDER_COUNT = 12456;

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
