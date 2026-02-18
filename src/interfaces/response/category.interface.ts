import { ICategory } from "../category.interface";
import { IResponse, IListResponse } from "./response.interface";

// Category with populated parent
export interface ICategoryResponse extends Omit<ICategory, "parent"> {
  parent?: {
    _id: string;
    name: string;
  } | null;
}

export type ICategorySingleResponse = IResponse<ICategoryResponse>;
export type ICategoryListResponse = IListResponse<ICategoryResponse>;
