import { Response } from "express";
import { IResponse, IListResponse } from "../interfaces/response/response.interface";

/**
 * Standard response envelope for ALL API responses:
 * {
 *   success: true,
 *   data: <payload>,
 *   meta?: { count, total, pagination, etc. } // only for lists
 * }
 */

// SEND RESPONSE FOR LIST
const jsonAll = function <T>(
  res: Response,
  status: number,
  data: T[],
  meta: Object = {}
): Response<IListResponse<T>> {
  return res.status(status).json({
    success: true,
    data: data,
    meta: {
      ...meta,
    },
  });
};

// SEND RESPONSE FOR SINGLE ITEM
const jsonOne = function <T>(
  res: Response,
  status: number,
  data: T
): Response<IResponse<T>> {
  return res.status(status).json({
    success: true,
    data,
  });
};

//EXPORT
export { jsonAll, jsonOne };
