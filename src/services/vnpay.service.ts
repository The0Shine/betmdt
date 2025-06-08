import { vnpayConfig } from "../config/vnpay";
import { VNPayUtil } from "../utils/vnpay";

export interface CreatePaymentParams {
  orderId: string;
  amount: number;
  orderInfo: string;
  ipAddr: string;
  locale?: string;
  currCode?: string;
}

export interface VNPayCallbackData {
  orderId: string;
  amount: number;
  orderInfo: string;
  transactionNo: string;
  responseCode: string;
  payDate: string;
  isSuccess: boolean;
}

export interface VNPayVerificationResult {
  isValid: boolean;
  message: string;
  data?: VNPayCallbackData;
}

export class VNPayService {
  /**
   * Tạo URL thanh toán VNPay
   */
  static createPaymentUrl(params: CreatePaymentParams): string {
    try {
      return VNPayUtil.createPaymentUrl(params);
    } catch (error) {
      console.error("Error creating VNPay payment URL:", error);
      throw new Error("Không thể tạo URL thanh toán VNPay");
    }
  }

  /**
   * Xác thực IPN callback từ VNPay
   */
  static verifyIpnCall(
    vnp_Params: Record<string, string>
  ): VNPayVerificationResult {
    try {
      const secureHash = vnp_Params["vnp_SecureHash"];
      const { vnp_SecureHash, vnp_SecureHashType, ...otherParams } = vnp_Params;

      // Xác thực chữ ký
      const isValidSignature = VNPayUtil.verifySecureHash(
        vnp_Params,
        secureHash,
        vnpayConfig.vnp_HashSecret
      );

      if (!isValidSignature) {
        return {
          isValid: false,
          message: "Chữ ký không hợp lệ",
        };
      }

      // Kiểm tra mã phản hồi
      const responseCode = vnp_Params["vnp_ResponseCode"];
      const isSuccess = responseCode === "00";

      const data: VNPayCallbackData = {
        orderId: vnp_Params["vnp_TxnRef"],
        amount: Number.parseInt(vnp_Params["vnp_Amount"]) / 100, // Chia 100 vì VNPay nhân 100
        orderInfo: vnp_Params["vnp_OrderInfo"],
        transactionNo: vnp_Params["vnp_TransactionNo"],
        responseCode: responseCode,
        payDate: vnp_Params["vnp_PayDate"],
        isSuccess,
      };

      return {
        isValid: true,
        message: isSuccess ? "Giao dịch thành công" : "Giao dịch thất bại",
        data,
      };
    } catch (error) {
      console.error("Error verifying VNPay IPN:", error);
      return {
        isValid: false,
        message: "Lỗi xác thực IPN",
      };
    }
  }

  /**
   * Xác thực return URL từ VNPay
   */
  static verifyReturnUrl(
    vnp_Params: Record<string, string>
  ): VNPayVerificationResult {
    try {
      const secureHash = vnp_Params["vnp_SecureHash"];
      const isValidSignature = VNPayUtil.verifySecureHash(
        vnp_Params,
        secureHash,
        vnpayConfig.vnp_HashSecret
      );

      if (!isValidSignature) {
        return {
          isValid: false,
          message: "Chữ ký không hợp lệ",
        };
      }

      const responseCode = vnp_Params["vnp_ResponseCode"];
      const isSuccess = responseCode === "00";

      const data: VNPayCallbackData = {
        orderId: vnp_Params["vnp_TxnRef"],
        amount: Number.parseInt(vnp_Params["vnp_Amount"]) / 100,
        orderInfo: vnp_Params["vnp_OrderInfo"],
        transactionNo: vnp_Params["vnp_TransactionNo"] || "",
        responseCode: responseCode,
        payDate: vnp_Params["vnp_PayDate"] || "",
        isSuccess,
      };

      return {
        isValid: true,
        message: isSuccess
          ? "Thanh toán thành công"
          : this.getErrorMessage(responseCode),
        data,
      };
    } catch (error) {
      console.error("Error verifying VNPay return URL:", error);
      return {
        isValid: false,
        message: "Lỗi xác thực thanh toán",
      };
    }
  }

  /**
   * Lấy thông điệp lỗi từ mã phản hồi
   */
  private static getErrorMessage(responseCode: string): string {
    const errorMessages: Record<string, string> = {
      "01": "Giao dịch chưa hoàn tất",
      "02": "Giao dịch bị lỗi",
      "04": "Giao dịch đảo (Khách hàng đã bị trừ tiền tại Ngân hàng nhưng GD chưa thành công ở VNPAY)",
      "05": "VNPAY đang xử lý giao dịch này (GD hoàn tiền)",
      "06": "VNPAY đã gửi yêu cầu hoàn tiền sang Ngân hàng (GD hoàn tiền)",
      "07": "Giao dịch bị nghi ngờ gian lận",
      "09": "GD Hoàn trả bị từ chối",
      "10": "Đã giao hàng",
      "11": "Giao dịch không thành công do: Khách hàng nhập sai mật khẩu xác thực giao dịch (OTP)",
      "12": "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa",
      "13": "Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP)",
      "24": "Giao dịch không thành công do: Khách hàng hủy giao dịch",
      "51": "Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch",
      "65": "Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày",
      "75": "Ngân hàng thanh toán đang bảo trì",
      "79": "Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định",
      "99": "Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)",
    };

    return errorMessages[responseCode] || "Giao dịch thất bại";
  }
}
