import type { Document, Types } from "mongoose";

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
}

export interface IShippingAddress {
  address: string;
  city: string;
}

export interface IPaymentResult {
  id?: string;
  status?: string;
  update_time?: string;
  email_address?: string;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  orderItems: IOrderItem[];
  paymentMethod: string;
  paymentResult?: IPaymentResult;
  shippingAddress: IShippingAddress;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: Date;
  status: "pending" | "processing" | "cancelled" | "completed";
  createdAt: Date;
  updatedAt: Date;
}
