import { IResponse } from "./response.interface";
import { IUserResponse } from "./user.interface";

export interface ILoginResponse {
  accessToken: string;
  refreshToken: string;
}

export type ITokenResponse = ILoginResponse;

export interface IRegisterResponse {
  message: string;
}

export type IAuthLoginResponse = IResponse<ILoginResponse>;
export type IAuthRegisterResponse = IResponse<IRegisterResponse>;
export type IAuthMeResponse = IResponse<IUserResponse>; 
