import type { Document, Types } from "mongoose";
import type { IShippingAddressSnapshot } from "./address.interface";

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
}

export interface IPaymentResult {
  id?: string;
  status?: string;
  update_time?: string;
  email_address?: string;
}

export interface IRefundInfo {
  refundReason: string;
  refundDate: Date;
  refundTransactionId?: string;
  notes?: string;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  orderItems: IOrderItem[];
  paymentMethod: string;
  paymentResult?: IPaymentResult;
  
  // Address: store snapshot for history preservation
  shippingAddressId?: Types.ObjectId;  // Reference to original address
  shippingAddress: IShippingAddressSnapshot;  // Snapshot at order time
  
  totalPrice: number;
  isPaid: boolean;
  paidAt?: Date;
  status:
    | "pending"
    | "processing"
    | "cancelled"
    | "completed"
    | "refund_requested"
    | "refunded";
  refundInfo?: IRefundInfo;
  createdAt: Date;
  updatedAt: Date;
}

// For backward compatibility - alias
export type IShippingAddress = IShippingAddressSnapshot;
