import { IAddress } from "../address.interface";
import { IResponse, IListResponse } from "./response.interface";

export interface IAddressResponse {
  _id: string;
  fullName: string;
  phone: string;
  provinceCode?: string;
  provinceName: string;
  districtCode?: string;
  districtName: string;
  wardCode?: string;
  wardName: string;
  streetAddress: string;
  fullAddress: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type IAddressSingleResponse = IResponse<IAddressResponse>;
export type IAddressListResponse = IListResponse<IAddressResponse>;
