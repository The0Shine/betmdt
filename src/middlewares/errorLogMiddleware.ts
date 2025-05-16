import { Request, Response, NextFunction } from "express";
import Logging from "../library/Logging";
import { errorLog } from "../utils/logger copy";
export const errorLogMiddleware = (err: any, req: Request, res: Response) => {
  const { method, url, ip, headers } = req;

  // Tạo dữ liệu log lỗi
  const errorLogData = {
    method,
    url,
    ip,
    userAgent: headers["user-agent"],
    timestamp: new Date().toISOString(),
    message: err.message,
    stack: err.stack,
  };
  try {
    errorLog.error(errorLogData); // Ghi log
  } catch (error) {
    Logging.error(error);
  }
};
