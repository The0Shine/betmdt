import { JwtPayload } from "jsonwebtoken";

export interface IAccessTokenPayload extends JwtPayload {
  _id: string;
  role: string;
}