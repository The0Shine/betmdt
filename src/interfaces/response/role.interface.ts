import { IRole } from "../role.interface";
import { IResponse, IListResponse } from "./response.interface";

export interface IRoleResponse extends IRole {
  userCount?: number;
  canDelete?: boolean;
  canEdit?: boolean;
}

export type IRoleSingleResponse = IResponse<IRoleResponse>;
export type IRoleListResponse = IListResponse<IRoleResponse>;

export interface IPermissionsResponse {
  all: string[];
  grouped: Record<string, {
    name: string;
    permissions: string[];
  }>;
}

export type IPermissionsRes = IResponse<IPermissionsResponse>;
