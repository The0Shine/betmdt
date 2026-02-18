import { IStockVoucher, IStockHistory } from "../stock.interface";
import { IResponse, IListResponse } from "./response.interface";

// Stock Voucher with populated fields
export interface IStockVoucherResponse extends Omit<IStockVoucher, "createdBy" | "approvedBy" | "rejectedBy" | "items"> {
  createdBy: {
    _id: string;
    lastName: string;
    email: string;
  } | string;
  approvedBy?: {
    _id: string;
    lastName: string;
    email: string;
  } | string;
  rejectedBy?: {
    _id: string;
    lastName: string;
    email: string;
  } | string;
  items: Array<{
    product: {
      _id: string;
      name: string;
      image?: string;
    } | string;
    productName?: string;
    quantity: number;
    price?: number;
    costPrice?: number;
    note?: string;
  }>;
  relatedOrder?: any; // Populated generic
}

export type IStockSingleResponse = IResponse<IStockVoucherResponse>;
export type IStockListResponse = IListResponse<IStockVoucherResponse>;

// Stock History
export interface IStockHistoryResponse extends Omit<IStockHistory, "product" | "createdBy" | "relatedVoucher" | "relatedOrder"> {
  product: {
    _id: string;
    name: string;
    image?: string;
  } | string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  } | string;
  relatedVoucher?: {
    _id: string;
    voucherNumber: string;
    type: string;
    status: string;
  } | string;
  relatedOrder?: {
    _id: string;
  } | string;
}

// Standard List Response
export type IStockHistoryListResponse = IListResponse<IStockHistoryResponse>;
