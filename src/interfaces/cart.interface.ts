import type { Document } from "mongoose";
import type { IUser } from "./user.interface";
import type { IProduct } from "./product.interface";

export interface ICartItem extends Document {
  product: IProduct | string;
  quantity: number;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICart extends Document {
  user: IUser | string;
  items: ICartItem[] | string[];
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}
