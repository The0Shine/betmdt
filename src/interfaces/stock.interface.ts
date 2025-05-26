import type { Document, Types } from "mongoose";

export interface IStockItem {
  product: Types.ObjectId;
  productName: string;
  quantity: number;
  unit: string;
  costPrice: number;
  note?: string;
}

export interface IStockVoucher extends Document {
  _id: Types.ObjectId;
  voucherNumber: string;
  type: "import" | "export";
  status: "pending" | "approved" | "rejected" | "cancelled";
  reason: string;
  items: IStockItem[];
  totalValue: number;
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  relatedOrder?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStockHistory extends Document {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  productName: string;
  type: "import" | "export";
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  reason: string;
  relatedVoucher: Types.ObjectId;
  voucherNumber: string;
  relatedOrder?: Types.ObjectId;
  createdBy: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: "import" | "export";
  status?: "pending" | "approved" | "rejected" | "cancelled";
  startDate?: string;
  endDate?: string;
  createdBy?: string;
}

export interface StockHistoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: "import" | "export";
  productId?: string;
  voucherNumber?: string;
  startDate?: string;
  endDate?: string;
}

export interface StockResponse {
  success: boolean;
  count: number;
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
  data: IStockVoucher[];
}

export interface StockHistoryResponse {
  success: boolean;
  count: number;
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
  data: IStockHistory[];
}

export interface SingleStockResponse {
  success: boolean;
  data: IStockVoucher;
}
