import jwt from "jsonwebtoken";
import env from "../config/env";

export const generateToken = (id: string): string => {
  return jwt.sign({ id }, env.JWT_SECRETS_AT, {
    expiresIn: parseInt(env.ACCESS_TOKEN_EXPIRATION, 10),
  });
};
