import { ICart } from "../cart.interface";
import { IResponse } from "./response.interface";

export interface ICartResponse extends Omit<ICart, "items"> {
  items: Array<{
    product: {
      _id: string;
      name: string;
      price: number;
      image: string;
      description: string;
      quantity: number;
    }; 
    quantity: number;
    price: number;
    _id: string;
  }>;
}

export type ICartSingleResponse = IResponse<ICartResponse>;
// Cart doesn't have list response usually, one cart per user
