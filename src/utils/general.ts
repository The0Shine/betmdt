import { Response } from "express";
import { IResponse, IListResponse } from "../interfaces/response/response.interface";
import type { Document } from "mongoose";

/**
 * Standard response envelope for ALL API responses:
 * {
 *   success: true,
 *   data: <payload>,
 *   meta?: { count, total, pagination, etc. } // only for lists
 * }
 */

/**
 * Converts a Mongoose document (or plain object) to a plain object.
 * This eliminates the need for "as any" casts when passing to jsonOne/jsonAll.
 */
function toPlainObject<T>(doc: T | Document): T {
  if (doc && typeof (doc as Document).toObject === "function") {
    return (doc as Document).toObject() as T;
  }
  return doc as T;
}

// SEND RESPONSE FOR LIST
const jsonAll = function <T>(
  res: Response,
  status: number,
  data: (T | Document)[],
  meta: object = {}
): Response<IListResponse<T>> {
  const plainData = data.map((item) => toPlainObject<T>(item));
  return res.status(status).json({
    success: true,
    data: plainData,
    meta: {
      ...meta,
    },
  });
};

// SEND RESPONSE FOR SINGLE ITEM
const jsonOne = function <T>(
  res: Response,
  status: number,
  data: T | Document
): Response<IResponse<T>> {
  const plainData = toPlainObject<T>(data);
  return res.status(status).json({
    success: true,
    data: plainData,
  });
};

//EXPORT
export { jsonAll, jsonOne, toPlainObject };
