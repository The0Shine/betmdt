import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import HttpError from "../utils/httpError";

/**
 * Middleware xác thực VNPay IPN
 */
export const validateVNPayIPN = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const requiredFields = [
      "vnp_TmnCode",
      "vnp_TxnRef",
      "vnp_Amount",
      "vnp_OrderInfo",
      "vnp_ResponseCode",
      "vnp_TransactionNo",
      "vnp_PayDate",
      "vnp_SecureHash",
    ];

    const missingFields = requiredFields.filter((field) => !req.query[field]);

    if (missingFields.length > 0) {
      throw new HttpError({
        title: "missing_vnpay_fields",
        detail: `Thiếu các trường bắt buộc: ${missingFields.join(", ")}`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware xác thực VNPay Return URL
 */
export const validateVNPayReturn = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const requiredFields = [
      "vnp_TmnCode",
      "vnp_TxnRef",
      "vnp_Amount",
      "vnp_ResponseCode",
      "vnp_SecureHash",
    ];

    const missingFields = requiredFields.filter((field) => !req.query[field]);

    if (missingFields.length > 0) {
      console.error("Missing VNPay return fields:", missingFields);
      // Không throw error ở đây, để controller xử lý redirect
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware rate limiting cho payment endpoints
 */
export const paymentRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Implement rate limiting logic here
  // Có thể sử dụng express-rate-limit hoặc Redis
  next();
};
