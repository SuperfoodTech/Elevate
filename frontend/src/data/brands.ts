export type BrandStatus = 'Active' | 'Attention' | 'Inactive';
export type BusinessModel = 'Agency' | 'Virtual Brand' | 'Hybrid';

export interface BrandRecord {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  model: BusinessModel;
  outletsCount: number;
  outletNames: string[];
  addresses: string[];
  listingNames: string[];
  platforms: {
    gofood: number;
    grabfood: number;
    shopeefood: number;
    total: number;
  };
  status: BrandStatus;
  weeklyOrders: number;
  avgDailyOrders: number;
  isVip?: boolean;
  needReviewCount: number;
  _searchIndex?: string;
  _searchIndexNoSpace?: string;
}
