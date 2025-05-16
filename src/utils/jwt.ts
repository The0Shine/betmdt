import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { IAccessTokenPayload } from "../interfaces/accessToken";
import { IRefreshTokenPayLoad } from "../interfaces/refreshToken.interface";
import HttpError from "./httpError";
import env from "../config/env";

export const signAccessToken = (payload: IAccessTokenPayload) =>
  new Promise<string>((resolve, reject) => {
    jwt.sign(
      payload,
      env.JWT_SECRETS_AT,
      {
        expiresIn: parseInt(env.ACCESS_TOKEN_EXPIRATION, 10),
      },
      (err, token) => {
        if (err) reject(err);
        else resolve(token as string);
      }
    );
  });

export const signRefreshToken = (
  payload: IRefreshTokenPayLoad,
  exp?: number
) => {
  if (exp) {
    return new Promise<string>((resolve, reject) => {
      jwt.sign({ ...payload, exp }, env.JWT_SECRETS_RT, (err, token) => {
        if (err) reject(err);
        else resolve(token as string);
      });
    });
  } else
    return new Promise<string>((resolve, reject) => {
      jwt.sign(
        payload,
        env.JWT_SECRETS_RT,
        {
          expiresIn: parseInt(env.REFRESH_TOKEN_EXPIRATION, 10),
        },
        (err, token) => {
          if (err) reject(err);
          else resolve(token as string);
        }
      );
    });
};

export const decodeRefreshToken = async (token: string) => {
  return new Promise<IRefreshTokenPayLoad>((resolve, reject) => {
    jwt.verify(token, env.JWT_SECRETS_RT, (err, payload) => {
      if (err)
        reject(
          new HttpError({
            detail: err.message,
            title: err.name,
            code: StatusCodes.UNAUTHORIZED,
          })
        );
      else resolve(payload as IRefreshTokenPayLoad);
    });
  });
};

export const decodeAccessToken = async (token: string) => {
  return new Promise<IAccessTokenPayload>((resolve, reject) => {
    jwt.verify(token, env.JWT_SECRETS_AT, (err, payload) => {
      if (err)
        reject(
          new HttpError({
            detail: err.message,
            title: err.name,
            code: StatusCodes.UNAUTHORIZED,
          })
        );
      else resolve(payload as IAccessTokenPayload);
    });
  });
};
