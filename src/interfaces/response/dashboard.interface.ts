import { IResponse } from "./response.interface";

export interface IDashboardOverview {
  stats: {
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    todayOrders: number;
    monthlyRevenue: number;
    revenueGrowth: number;
  };
  charts: {
    orderStatus: Array<{ _id: string; count: number }>;
    topProducts: Array<{ name: string; sold: number; revenue: number }>;
  };
  alerts: {
    lowStockProducts: Array<{ id: string; name: string; quantity: number }>;
  };
  recent: {
    orders: Array<{
      id: string;
      customer: string;
      total: number;
      status: string;
      createdAt: any;
    }>;
  };
}
export type IDashboardOverviewResponse = IResponse<IDashboardOverview>;

export interface IRevenueChart {
  chartData: Array<{ date: string; revenue: number; orders: number }>;
  period: string;
}
export type IRevenueChartResponse = IResponse<IRevenueChart>;

export interface IProductStats {
  overview: {
    totalProducts: number;
    totalStock: number;
    totalValue: number;
    lowStock: number;
    outOfStock: number;
  };
  categories: Array<{ _id: string; count: number; totalValue: number }>;
  topSelling: Array<{
    id: string;
    name: string;
    sold: number;
    revenue: number;
    image: string;
  }>;
  recentlyAdded: Array<{
    _id: string;
    name: string;
    price: number;
    quantity: number;
    createdAt: any;
  }>;
}
export type IProductStatsResponse = IResponse<IProductStats>;

export interface IInventoryStats {
    summary: {
      pendingVouchers: number;
      monthlyImports: number;
      monthlyExports: number;
      criticalStockCount: number;
    };
    recentMovements: Array<{
      id: string;
      type: string;
      voucherNumber: string;
      status: string;
      totalValue: number;
      createdBy: string;
      createdAt: any;
    }>;
    criticalStock: Array<{
      id: string;
      name: string;
      quantity: number;
    }>;
    monthlyStats: Array<{ _id: string; count: number; totalValue: number }>;
  }
  export type IInventoryStatsResponse = IResponse<IInventoryStats>;
