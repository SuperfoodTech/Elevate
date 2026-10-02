export interface RekapBillingRow {
  id?: number;
  owner_name: string;
  periode: string;
  pendapatan_kotor: number;
  potongan_ojol: number;
  pendapatan_bersih: number;
  revenue_share_pct: number;
  tagihan_superfood: number;
  payment_status: string;
  notes?: string;
}

export interface RangkumanChannelRow {
  channel: string;
  pendapatan_kotor: number;
  potongan_ojol: number;
  pendapatan_bersih: number;
  rata_rata_order_per_customer: number;
  total_order: number;
  order_sukses: number;
  order_batal: number;
}

export interface MonthlyBreakdownRow extends RangkumanChannelRow {
  bulan_tahun: string;
}

export interface PerformaDataRow {
  periode_label: string;
  pendapatan_kotor: number;
  potongan_ojol: number;
  pendapatan_bersih: number;
  rata_rata_order_per_customer: number;
  total_order: number;
  order_sukses: number;
  order_batal: number;
}

export interface ComparisonChartRow {
  periode_label: string;
  pendapatan_kotor: number;
  potongan_ojol: number;
  pendapatan_bersih: number;
  total_order: number;
  order_sukses: number;
  order_batal: number;
}

export interface OrderStatusRow {
  channel: string;
  total_order: number;
  order_sukses: number;
  order_batal: number;
  pct_sukses: number;
  pct_batal: number;
}

export interface FilterOptions {
  owners: string[];
  outlets: string[];
  brands: string[];
  mapping: Array<{ owner: string; outlet: string; brand: string }>;
}

// In-Memory Client Cache with 3-Minute TTL
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export const fetchCached = async (url: string, options?: RequestInit, forceRefresh = false): Promise<any> => {
  const now = Date.now();
  if (!forceRefresh && apiCache.has(url)) {
    const cached = apiCache.get(url)!;
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  apiCache.set(url, { data, timestamp: now });
  return data;
};

export const clearApiCache = () => {
  apiCache.clear();
};

// API Helper Methods
export const api = {
  // Filters
  getFilters: async (): Promise<FilterOptions> => {
    return fetchCached('/api/performa-comparison/filters');
  },

  // Rekap Tagihan Billing
  getRekapBilling: async (cycle: 'Weekly' | 'Monthly', periode?: string, owner?: string) => {
    const params = new URLSearchParams({ billing_cycle: cycle });
    if (periode) params.append('periode', periode);
    if (owner) params.append('owner_name', owner);
    return fetchCached(`/api/rekap-tagihan-billing?${params.toString()}`);
  },

  getRekapTagihanDaily: async (owner: string, startDate: string, endDate: string, nominal?: number) => {
    const params = new URLSearchParams({ owner, start_date: startDate, end_date: endDate });
    if (nominal) params.append('nominal_bagi_hasil', nominal.toString());
    return fetchCached(`/api/rekap-tagihan?${params.toString()}`);
  },

  updatePaymentStatus: async (id: number, status: string, notes: string) => {
    const res = await fetch(`/api/rekap-tagihan-billing/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: status, notes })
    });
    clearApiCache(); // Invalidate cache after status update
    return res.json();
  },

  // Rangkuman Ojol
  getRangkumanSummary: async (params: Record<string, string>) => {
    const search = new URLSearchParams(params).toString();
    return fetchCached(`/api/laporan-aplikasi-ojol/summary?${search}`);
  },

  getRangkumanMonthly: async (params: Record<string, string>) => {
    const search = new URLSearchParams(params).toString();
    return fetchCached(`/api/laporan-aplikasi-ojol/monthly?${search}`);
  },

  // Laporan Performa
  getLaporanPerforma: async (params: Record<string, string>) => {
    const search = new URLSearchParams(params).toString();
    return fetchCached(`/api/performa-comparison/data?${search}`);
  },

  // Performa Comparison
  getComparisonCharts: async (params: Record<string, string>) => {
    const search = new URLSearchParams(params).toString();
    return fetchCached(`/api/performa-comparison/charts?${search}`);
  },

  // Laporan Jam Ramai
  getJamRamaiSummary: async (params: Record<string, string>) => {
    const search = new URLSearchParams(params).toString();
    return fetchCached(`/api/laporan-jam-ramai/summary?${search}`);
  },

  getJamRamaiMatrix: async (params: Record<string, string>) => {
    const search = new URLSearchParams(params).toString();
    return fetchCached(`/api/laporan-jam-ramai/by-day?${search}`);
  },

  // Order Status (Sukses vs Batal)
  getOrderStatusSummary: async (params: Record<string, string>) => {
    const search = new URLSearchParams(params).toString();
    return fetchCached(`/api/order-status/summary?${search}`);
  },

  // Materialized View Analytics
  getOrderRanking: async (params?: Record<string, string>) => {
    const search = params ? new URLSearchParams(params).toString() : '';
    return fetchCached(`/api/analytics/order-ranking?${search}`);
  },

  getWeekOverWeek: async () => {
    return fetchCached('/api/analytics/week-over-week');
  },

  getBaselineVsCurrent: async () => {
    return fetchCached('/api/analytics/baseline-vs-current');
  },

  // Home Dashboard Aggregated Metrics
  getHomeDashboardMetrics: async (params: {
    startDate?: string;
    endDate?: string;
    owner?: string;
    business?: string;
    forceRefresh?: boolean;
  }): Promise<HomeDashboardResponse> => {
    const search = new URLSearchParams();
    if (params.startDate) search.append('start_date', params.startDate);
    if (params.endDate) search.append('end_date', params.endDate);
    if (params.owner) search.append('owner', params.owner);
    if (params.business) search.append('business', params.business);
    if (params.forceRefresh) search.append('refresh', 'true');
    return fetchCached(`/api/dashboard-summary?${search.toString()}`);
  },

  // Transactions Explorer API
  getTransactions: async (params?: {
    platform?: string;
    start_date?: string;
    end_date?: string;
    owner?: string;
    outlet?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const search = new URLSearchParams();
    if (params?.platform && params.platform !== 'all') search.append('platform', params.platform);
    if (params?.start_date) search.append('start_date', params.start_date);
    if (params?.end_date) search.append('end_date', params.end_date);
    if (params?.owner && params.owner !== 'all') search.append('owner', params.owner);
    if (params?.outlet && params.outlet !== 'all') search.append('outlet', params.outlet);
    if (params?.status && params.status !== 'all') search.append('status', params.status);
    if (params?.search && params.search.trim()) search.append('search', params.search.trim());
    if (params?.limit) search.append('limit', String(params.limit));
    if (params?.offset !== undefined) search.append('offset', String(params.offset));
    return fetchCached(`/api/transactions?${search.toString()}`);
  },

  getTransactionFilterOptions: async () => {
    return fetchCached('/api/transactions/filter-options');
  },

  getTransactionDetail: async (orderId: string) => {
    return fetchCached(`/api/transactions/${encodeURIComponent(orderId)}`);
  }
};

export interface HomeDashboardKPI {
  total_owner?: number;
  total_owner_change?: number;
  total_outlet?: number;
  total_outlet_change?: number;
  active_listings?: number;
  active_listings_change?: number;
  merchant_orders?: number;
  virtual_orders?: number;
  sparklines?: {
    owners?: { val: number }[];
    outlets?: { val: number }[];
    listings?: { val: number }[];
    merchantOrders?: { val: number }[];
    virtualOrders?: { val: number }[];
    [key: string]: any;
  };
  [key: string]: any;
}

export interface DailyVelocityPoint {
  date: string;
  merchantOrders: number;
  virtualOrders: number;
  totalOrders: number;
}

export interface MerchantChartPoint {
  date: string;
  gmv: number;
  ofdFees: number;
  revenue: number;
  orderSucceed: number;
  orderCanceled: number;
}

export interface VirtualChartPoint {
  date: string;
  gmv: number;
  ofdFees: number;
  revenue: number;
  cogs: number;
  grossMargin: number;
  orderSucceed: number;
  orderCanceled: number;
}

export interface TopBrandRankingItem {
  name: string;
  gmv: number;
  share: number;
  orders: number;
  growth: string;
}

export interface SettlementFlowPoint {
  date: string;
  receivable: number;
  payable: number;
  disbursed: number;
}

export interface HomeDashboardResponse {
  status: string;
  has_data: boolean;
  kpi: HomeDashboardKPI;
  velocity: DailyVelocityPoint[];
  merchant_chart_data: MerchantChartPoint[];
  virtual_chart_data: VirtualChartPoint[];
  top_brands: TopBrandRankingItem[];
  settlement_flow: SettlementFlowPoint[];
}
