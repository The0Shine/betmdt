import { IProduct } from "../product.interface";
import { IResponse, IListResponse } from "./response.interface";

// Category is always populated in product responses
interface IPopulatedCategory {
  _id: string;
  name: string;
}

// Base product with populated category
interface IProductBase extends Omit<IProduct, "category"> {
  category: IPopulatedCategory;
}

// Public response - excludes costPrice (sensitive data)
export interface IProductPublicResponse extends Omit<IProductBase, "costPrice"> {}

// Admin response - includes costPrice
export interface IProductAdminResponse extends IProductBase {}

// Alias for backward compatibility
export type IProductResponse = IProductPublicResponse;

export type IProductSingleResponse = IResponse<IProductPublicResponse>;
export type IProductListResponse = IListResponse<IProductPublicResponse>;
export type IProductAdminSingleResponse = IResponse<IProductAdminResponse>;
export type IProductAdminListResponse = IListResponse<IProductAdminResponse>;


