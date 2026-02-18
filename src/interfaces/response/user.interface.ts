import { IUser } from "../user.interface";
import { IResponse, IListResponse } from "./response.interface";

// User with populated Role and added permissions fields from controller
export interface IUserResponse extends Omit<IUser, "password" | "role"> {
  role: {
    _id: string;
    name: string;
    permissions?: string[];
  };
  canDelete?: boolean;
  canEdit?: boolean;
}

export type IUserSingleResponse = IResponse<IUserResponse>;
export type IUserListResponse = IListResponse<IUserResponse>;

export interface IWishlistResponse {
  message: string;
}
