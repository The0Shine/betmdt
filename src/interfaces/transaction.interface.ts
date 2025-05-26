import type { Document, Types } from "mongoose";

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  transactionNumber?: string;
  type: "income" | "expense"; // Chỉ thu và chi
  category: "order" | "stock"; // Chỉ đơn hàng và kho
  amount: number;
  description: string;
  paymentMethod:
    | "cash"
    | "bank_transfer"
    | "credit_card"
    | "e_wallet"
    | "other";
  relatedOrder?: Types.ObjectId;
  relatedVoucher?: Types.ObjectId;
  relatedCustomer?: Types.ObjectId;
  createdBy: Types.ObjectId;
  transactionDate: Date;
  notes?: string;
  metadata?: {
    orderNumber?: string;
    voucherNumber?: string;
    voucherType?: string;
    customerInfo?: string;
    autoCreated?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// Query parameters
export interface TransactionQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: "income" | "expense";
  category?: "order" | "stock";
  paymentMethod?:
    | "cash"
    | "bank_transfer"
    | "credit_card"
    | "e_wallet"
    | "other";
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  createdBy?: string;
  autoCreated?: boolean;
}

// Response interfaces
export interface TransactionResponse {
  success: boolean;
  count: number;
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
  summary?: TransactionSummary;
  data: ITransaction[];
}

export interface SingleTransactionResponse {
  success: boolean;
  data: ITransaction;
}

// Create transaction data
export interface CreateTransactionData {
  type: "income" | "expense";
  category: "order" | "stock";
  amount: number;
  description: string;
  paymentMethod?:
    | "cash"
    | "bank_transfer"
    | "credit_card"
    | "e_wallet"
    | "other";
  relatedOrder?: string;
  relatedVoucher?: string;
  relatedCustomer?: string;
  transactionDate?: Date;
  notes?: string;
  metadata?: {
    orderNumber?: string;
    voucherNumber?: string;
    voucherType?: string;
    customerInfo?: string;
    autoCreated?: boolean;
  };
}

// Transaction summary
export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  averageTransaction: number;
  orderIncome: number; // Thu từ đơn hàng
  stockExpense: number; // Chi cho kho
}

// Dashboard stats
export interface TransactionStats {
  today: TransactionSummary;
  thisWeek: TransactionSummary;
  thisMonth: TransactionSummary;
  thisYear: TransactionSummary;
  recentTransactions: ITransaction[];
  categoryBreakdown: Array<{
    category: string;
    income: number;
    expense: number;
    count: number;
  }>;
}
