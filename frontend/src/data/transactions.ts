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

export const MOCK_TRANSACTIONS: Transaction[] = [
  // Week 3 (17 - 23 Agu 2026)
  {
    id: 'w3-1',
    dateTime: '23 Agu 2026 19:40',
    orderId: 'GF-81273-3344111',
    platform: 'gofood',
    owner: 'Salero Group',
    physicalOutlet: 'Salero Minang Raya - Manyar',
    platformListing: 'Salero Minang Raya Manyar',
    sid: 'GF-81273',
    status: 'Sukses',
    orderValue: 52000,
    agencyFee: 2000,
    orderStage: 'live',
    netSales: 46800,
    marketingSuccessFee: 0,
    orderCommission: 5200,
    ofdFees: 0,
    ingestedAt: '23 Agu 2026 19:45:00',
    ingestedBy: 'System',
    lastUpdated: '23 Agu 2026 19:45:00',
  },
  {
    id: 'w3-2',
    dateTime: '22 Agu 2026 13:15',
    orderId: 'GR-44512-7788991',
    platform: 'grabfood',
    owner: 'Roti Bakar 41 Group',
    physicalOutlet: 'Roti Bakar 41 - Merr',
    platformListing: 'Roti Bakar 41 Merr',
    sid: 'GR-44512',
    status: 'Sukses',
    orderValue: 35000,
    agencyFee: 2000,
    orderStage: 'live',
    netSales: 31500,
    marketingSuccessFee: 0,
    orderCommission: 3500,
    ofdFees: 0,
    ingestedAt: '22 Agu 2026 13:20:00',
    ingestedBy: 'System',
    lastUpdated: '22 Agu 2026 13:20:00',
  },
  {
    id: 'w3-3',
    dateTime: '21 Agu 2026 20:30',
    orderId: 'SF-91881-1122339',
    platform: 'shopeefood',
    owner: 'Salero Group',
    physicalOutlet: 'Salero Minang Raya - Gubeng',
    platformListing: 'Salero Minang Raya Gubeng',
    sid: 'SF-91881',
    status: 'Sukses',
    orderValue: 42000,
    agencyFee: 2000,
    orderStage: 'live',
    netSales: 37800,
    marketingSuccessFee: 0,
    orderCommission: 4200,
    ofdFees: 0,
    ingestedAt: '21 Agu 2026 20:35:00',
    ingestedBy: 'System',
    lastUpdated: '21 Agu 2026 20:35:00',
  },
  {
    id: 'w3-4',
    dateTime: '20 Agu 2026 18:05',
    orderId: 'GF-33442-9900881',
    platform: 'gofood',
    owner: 'Kebab Baba Amir Group',
    physicalOutlet: 'Kebab Baba Amir - Ketintang',
    platformListing: 'Kebab Baba Amir Ketintang',
    sid: 'GF-33442',
    status: 'Batal',
    orderValue: 28000,
    agencyFee: 2000,
    orderStage: 'live',
    netSales: 25200,
    marketingSuccessFee: 0,
    orderCommission: 2800,
    ofdFees: 0,
    ingestedAt: '20 Agu 2026 18:10:00',
    ingestedBy: 'System',
    lastUpdated: '20 Agu 2026 18:10:00',
  },
  {
    id: 'w3-5',
    dateTime: '19 Agu 2026 12:45',
    orderId: 'SF-22112-4433220',
    platform: 'shopeefood',
    owner: 'Martabak Holans Group',
    physicalOutlet: 'Martabak Holans - Darmo',
    platformListing: 'Martabak Holans Darmo',
    sid: 'SF-22112',
    status: 'Sukses',
    orderValue: 64000,
    agencyFee: 2000,
    orderStage: 'live',
    netSales: 57600,
    marketingSuccessFee: 0,
    orderCommission: 6400,
    ofdFees: 0,
    ingestedAt: '19 Agu 2026 12:50:00',
    ingestedBy: 'System',
    lastUpdated: '19 Agu 2026 12:50:00',
  },
  {
    id: 'w3-6',
    dateTime: '18 Agu 2026 16:20',
    orderId: 'GR-77122-8877661',
    platform: 'grabfood',
    owner: 'Bubur Ayam Group',
    physicalOutlet: 'Bubur Ayam Jak. Bang Udin',
    platformListing: 'Bubur Ayam Jak. Bang Udin',
    sid: 'GR-77122',
    status: 'Sukses',
    orderValue: 39000,
    agencyFee: 2000,
    orderStage: 'live',
    netSales: 35100,
    marketingSuccessFee: 0,
    orderCommission: 3900,
    ofdFees: 0,
    ingestedAt: '18 Agu 2026 16:25:00',
    ingestedBy: 'System',
    lastUpdated: '18 Agu 2026 16:25:00',
  },
  {
    id: 'w3-7',
    dateTime: '17 Agu 2026 14:10',
    orderId: 'GF-55001-6655441',
    platform: 'gofood',
    owner: 'Depot 88 Group',
    physicalOutlet: 'Depot 88 - Citraland',
    platformListing: 'Depot 88 Citraland',
    sid: 'GF-55001',
    status: 'Sukses',
    orderValue: 48000,
    agencyFee: 2000,
    orderStage: 'akuisisi_to_live',
    netSales: 43200,
    marketingSuccessFee: 0,
    orderCommission: 4800,
    ofdFees: 0,
    ingestedAt: '17 Agu 2026 14:15:00',
    ingestedBy: 'System',
    lastUpdated: '17 Agu 2026 14:15:00',
  },
  // Week 4 (24 - 30 Agu 2026)
  {
    id: 'w4-1',
    dateTime: '30 Agu 2026 22:10',
    orderId: 'GF-81273-7788002',
    platform: 'gofood',
    owner: 'Salero Group',
    physicalOutlet: 'Salero Minang Raya - Gubeng',
    platformListing: 'Salero Minang Raya Gubeng',
    sid: 'GF-81273',
    status: 'Sukses',
    orderValue: 33000,
    agencyFee: 2000,
    orderStage: 'akuisisi_to_live',
    netSales: 29700,
    marketingSuccessFee: 0,
    orderCommission: 3300,
    ofdFees: 0,
    ingestedAt: '30 Agu 2026 22:17:05',
    ingestedBy: 'System',
    lastUpdated: '30 Agu 2026 22:17:05',
  },
  {
    id: 'w4-2',
    dateTime: '30 Agu 2026 21:05',
    orderId: 'SF-33412-9900112',
    platform: 'shopeefood',
    owner: 'Kebab Baba Amir Group',
    physicalOutlet: 'Kebab Baba Amir - Ketintang',
    platformListing: 'Kebab Baba Amir Ketintang',
    sid: 'SF-33412',
    status: 'Sukses',
    orderValue: 27000,
    agencyFee: 2000,
    orderStage: 'akuisisi_to_live',
    netSales: 24300,
    marketingSuccessFee: 0,
    orderCommission: 2700,
    ofdFees: 0,
    ingestedAt: '30 Agu 2026 21:12:00',
    ingestedBy: 'System',
    lastUpdated: '30 Agu 2026 21:12:00',
  },
  {
    id: 'w4-3',
    dateTime: '30 Agu 2026 20:30',
    orderId: 'GR-77311-2233440',
    platform: 'grabfood',
    owner: 'Roti Bakar 41 Group',
    physicalOutlet: 'Roti Bakar 41 - Merr',
    platformListing: 'Roti Bakar 41 Merr',
    sid: 'GR-77311',
    status: 'Batal',
    orderValue: 35000,
    agencyFee: 2000,
    orderStage: 'akuisisi_to_live',
    netSales: 31500,
    marketingSuccessFee: 0,
    orderCommission: 3500,
    ofdFees: 0,
    ingestedAt: '30 Agu 2026 20:37:30',
    ingestedBy: 'System',
    lastUpdated: '30 Agu 2026 20:37:30',
  },
  // Week 5 (31 Agu - 6 Sep 2026)
  {
    id: 'w5-1',
    dateTime: '31 Agu 2026 21:45',
    orderId: 'GR-99321-9988776',
    platform: 'grabfood',
    owner: 'Salero Group',
    physicalOutlet: 'Salero Minang Raya 2 - Manyar',
    platformListing: 'Salero Minang Raya Manyar 2',
    sid: 'GR-99321',
    status: 'Sukses',
    orderValue: 68000,
    agencyFee: 2000,
    orderStage: 'live',
    netSales: 61000,
    marketingSuccessFee: 0,
    orderCommission: 7000,
    ofdFees: 0,
    ingestedAt: '31 Agu 2026 21:52:00',
    ingestedBy: 'System',
    lastUpdated: '31 Agu 2026 21:52:00',
  },
  {
    id: 'w5-2',
    dateTime: '1 Sep 2026 14:32',
    orderId: 'GF-81273-2345678',
    platform: 'gofood',
    owner: 'Salero Group',
    physicalOutlet: 'Salero Minang Raya - Manyar',
    platformListing: 'Salero Minang Raya Manyar',
    sid: 'GF-81273',
    status: 'Sukses',
    orderValue: 36000,
    agencyFee: 2000,
    orderStage: 'live',
    netSales: 32000,
    marketingSuccessFee: 0,
    orderCommission: 4000,
    ofdFees: 0,
    ingestedAt: '1 Sep 2026 13:02:15',
    ingestedBy: 'System',
    lastUpdated: '1 Sep 2026 13:02:15',
  }
];

export const TOTAL_ORDER_COUNT = MOCK_TRANSACTIONS.length;

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
