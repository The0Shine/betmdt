import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import { asyncHandler } from "./async.middleware";
import { ErrorResponse } from "../utils/errorResponse";
import env from "../config/env";
import HttpError from "../utils/httpError";
import { StatusCodes } from "http-status-codes";
import { decodeAccessToken } from "../utils/jwt";

// Proteger rutas
export const auth = async function (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization)
      throw new HttpError({
        title: "unauthorized",
        detail: "Missing Authorization header",
        code: StatusCodes.UNAUTHORIZED,
      });

    const token = authorization.split(" ")[1];

    const payload = await decodeAccessToken(token);

    req["tokenPayload"] = payload;
    next();
  } catch (e: any) {
    if (e.opts?.title === "invalid_token") {
      return next(
        new HttpError({
          title: "unauthorized",
          detail: "Invalid Authorization header",
          code: StatusCodes.UNAUTHORIZED,
        })
      );
    }
    next(e);
  }
};
// Otorgar acceso a roles específicos
