import crypto from "crypto";
import type { Request } from "express";
import { vnpayConfig } from "../config/vnpay";

export interface CreatePaymentParams {
  orderId: string;
  amount: number;
  orderInfo: string;
  ipAddr: string;
  locale?: string;
  currCode?: string;
}

export class VNPayUtil {
  /**
   * Tạo URL thanh toán VNPay
   */
  static createPaymentUrl(params: CreatePaymentParams): string {
    const date = new Date();
    const createDate = this.formatDate(date);
    const expireDate = this.formatDate(
      new Date(date.getTime() + 15 * 60 * 1000)
    ); // 15 phút

    let vnp_Params: Record<string, string> = {
      vnp_Version: vnpayConfig.vnp_Version,
      vnp_Command: vnpayConfig.vnp_Command,
      vnp_TmnCode: vnpayConfig.vnp_TmnCode,
      vnp_Locale: params.locale || vnpayConfig.vnp_Locale,
      vnp_CurrCode: params.currCode || vnpayConfig.vnp_CurrCode,
      vnp_TxnRef: params.orderId,
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: "other",
      vnp_Amount: (params.amount * 100).toString(), // VNPay yêu cầu amount * 100
      vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
      vnp_IpAddr: params.ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    // Sắp xếp tham số theo thứ tự alphabet
    vnp_Params = this.sortObject(vnp_Params);

    // Tạo query string
    const signData = new URLSearchParams(vnp_Params).toString();

    // Tạo secure hash
    const hmac = crypto.createHmac("sha512", vnpayConfig.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    vnp_Params["vnp_SecureHash"] = signed;

    // Tạo URL cuối cùng
    return (
      vnpayConfig.vnp_Url + "?" + new URLSearchParams(vnp_Params).toString()
    );
  }

  /**
   * Xác thực secure hash
   */
  static verifySecureHash(
    vnp_Params: Record<string, string>,
    secureHash: string,
    hashSecret: string
  ): boolean {
    try {
      // Loại bỏ secure hash khỏi params
      const { vnp_SecureHash, vnp_SecureHashType, ...otherParams } = vnp_Params;

      // Sắp xếp params
      const sortedParams = this.sortObject(otherParams);

      // Tạo sign data
      const signData = new URLSearchParams(sortedParams).toString();

      // Tạo hash
      const hmac = crypto.createHmac("sha512", hashSecret);
      const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

      return secureHash === signed;
    } catch (error) {
      console.error("Error verifying secure hash:", error);
      return false;
    }
  }

  /**
   * Sắp xếp object theo key
   */
  static sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort();

    keys.forEach((key) => {
      sorted[key] = obj[key];
    });

    return sorted;
  }

  /**
   * Format date theo định dạng VNPay yêu cầu
   */
  static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Lấy IP address của client
   */
  static getClientIpAddress(req: Request): string {
    return (
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      "127.0.0.1"
    );
  }
}
