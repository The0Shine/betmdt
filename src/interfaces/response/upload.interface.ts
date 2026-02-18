import { IResponse, IListResponse } from "./response.interface";

export interface IUploadedImage {
  url: string;
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  original_filename: string;
  resource_type: string;
}

export type IUploadSingleResponse = IResponse<IUploadedImage>;
export type IUploadListResponse = IListResponse<IUploadedImage>; 
