import type { Document } from "mongoose"
import type { IUser } from "./user.interface"

export interface IOrderItem {
  product: string
  name: string
  image: string
  price: number
  quantity: number
}

export interface IShippingAddress {
  address: string
  city: string
  district: string
  ward: string
  phone: string
}

export interface IOrder extends Document {
  user: IUser["_id"]
  orderItems: IOrderItem[]
  shippingAddress: IShippingAddress
  paymentMethod: string
  paymentResult?: {
    id: string
    status: string
    update_time: string
    email_address: string
  }
  itemsPrice: number
  shippingPrice: number
  totalPrice: number
  isPaid: boolean
  paidAt?: Date
  isDelivered: boolean
  deliveredAt?: Date
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  createdAt: Date
  updatedAt: Date
}
