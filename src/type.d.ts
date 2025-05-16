import { Request } from "express";
import { IAccessTokenPayload } from "./interfaces/accessToken";
import { IUser } from "./interfaces/user.interface";

declare module "express" {
  interface Request {
    tokenPayload?: IAccessTokenPayload; // Add type for token payload
    user?: IUser; // Add type for user property
  }
}
