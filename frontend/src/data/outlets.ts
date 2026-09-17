export type OutletStatus = 'Active' | 'Attention' | 'Inactive';

export interface OutletRecord {
  id: string;
  name: string;
  brand: string;
  ownerId: string;
  ownerName: string;
  area: string;
  city: string;
  address: string;
  platforms: {
    gofood: number;
    grabfood: number;
    shopeefood: number;
    total: number;
  };
  status: OutletStatus;
  weeklyOrders: number;
  avgDailyOrders: number;
  isVip?: boolean;
  botActive: boolean;
  needReviewCount: number;
  _searchIndex?: string;
}

export const MOCK_OUTLETS: OutletRecord[] = [];
