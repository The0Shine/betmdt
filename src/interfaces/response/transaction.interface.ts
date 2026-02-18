import { ITransaction } from "../transaction.interface";
import { IResponse, IListResponse } from "./response.interface";

export interface ITransactionResponse extends Omit<ITransaction, "createdBy" | "relatedOrder" | "relatedVoucher" | "relatedCustomer"> {
  createdBy?: { name: string; email: string } | string;
  relatedOrder?: { orderNumber: string; totalAmount: number; customer?: any; shippingAddress?: any } | string;
  relatedVoucher?: { voucherNumber: string; type: string; reason?: string; items?: any } | string;
  relatedCustomer?: { name: string; email: string; phone: string; address?: string } | string;
}

export type ITransactionSingleResponse = IResponse<ITransactionResponse>;
export type ITransactionListResponse = IListResponse<ITransactionResponse>;

export interface ITransactionStatsResponse {
    today: any; // Using ITransactionSummary from service would be better if allowed to import service types
    thisWeek: any;
    thisMonth: any;
    thisYear: any;
    recentTransactions: ITransactionResponse[];
    categoryBreakdown: any[];
}
export type ITransactionStatsRes = IResponse<ITransactionStatsResponse>;
