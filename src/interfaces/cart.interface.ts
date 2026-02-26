import type { Document } from "mongoose";
import type { IUser } from "./user.interface";
import type { IProduct } from "./product.interface";

export interface ICartItem extends Document {
  product: IProduct;
  quantity: number;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICart extends Document {
  user: IUser;
  items: ICartItem[] | string[];
  totalPrice: number;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}
