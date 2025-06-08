import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import HttpError from "../utils/httpError";
import { jsonOne } from "../utils/general";
import { PaymentService } from "../services/payment.service";
import { VNPayUtil } from "../utils/vnpay";
import orderModel from "../models/order.model";

// @desc    Tạo thanh toán
// @route   POST /api/payment/create
// @access  Private
export const createPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderData, paymentMethod } = req.body;
    const userId = req.tokenPayload._id;
    // Validation
    if (!orderData || !paymentMethod) {
      throw new HttpError({
        title: "missing_fields",
        detail: "Thiếu thông tin bắt buộc",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    if (!orderData.totalPrice || orderData.totalPrice <= 0) {
      throw new HttpError({
        title: "invalid_amount",
        detail: "Số tiền không hợp lệ",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    if (!["vnpay", "cod"].includes(paymentMethod)) {
      throw new HttpError({
        title: "invalid_payment_method",
        detail: "Phương thức thanh toán không hợp lệ",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Thêm user ID vào orderData
    orderData.user = userId;

    // Lấy IP address
    const ipAddr = VNPayUtil.getClientIpAddress(req);

    const result = await PaymentService.createPayment({
      orderData,
      paymentMethod,
      ipAddr,
    });

    jsonOne(res, StatusCodes.OK, result);
  } catch (error) {
    next(error);
  }
};

// @desc    Xử lý IPN callback từ VNPay
// @route   GET /api/payment/vnpay-ipn
// @access  Public
export const handleVNPayIPN = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const vnp_Params = req.query as Record<string, string>;
    console.log("VNPay IPN received:", vnp_Params);

    const result = await PaymentService.handleVNPayIPN(vnp_Params);
    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error("Error in VNPay IPN handler:", error);
    res.status(StatusCodes.OK).json({
      RspCode: "99",
      Message: "Unknown error",
    });
  }
};

// @desc    Xử lý return URL từ VNPay
// @route   GET /api/payment/vnpay-return
// @access  Public
export const handleVNPayReturn = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const vnp_Params = req.query as Record<string, string>;
    console.log("VNPay return received:", vnp_Params);

    const result = await PaymentService.handleVNPayReturn(vnp_Params);
    const frontendUrl = process.env.CLIENT_URL || "http://localhost:5173";

    // Redirect với thông tin đầy đủ
    const params = new URLSearchParams({
      success: result.success.toString(),
      message: result.message,
      ...(result.paymentId && { paymentId: result.paymentId }),
      ...(result.orderId && { orderId: result.orderId }),
    });

    const redirectUrl = `${frontendUrl}/payment/vnpay-return?${params.toString()}`;
    console.log("Redirecting to:", redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in VNPay return handler:", error);
    const frontendUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const params = new URLSearchParams({
      success: "false",
      message: "Có lỗi xảy ra khi xử lý thanh toán",
    });
    const errorUrl = `${frontendUrl}/payment/vnpay-return?${params.toString()}`;
    res.redirect(errorUrl);
  }
};

// @desc    Lấy trạng thái thanh toán
// @route   GET /api/payment/status/:orderId
// @access  Private
export const getPaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      throw new HttpError({
        title: "missing_order_id",
        detail: "Order ID là bắt buộc",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Lấy thông tin đơn hàng để kiểm tra trạng thái thanh toán
    const order = await orderModel
      .findById(orderId)
      .select("isPaid paidAt paymentResult status");

    if (!order) {
      throw new HttpError({
        title: "order_not_found",
        detail: "Không tìm thấy đơn hàng",
        code: StatusCodes.NOT_FOUND,
      });
    }

    jsonOne(res, StatusCodes.OK, {
      success: true,
      orderId,
      isPaid: order.isPaid,
      paidAt: order.paidAt,
      paymentResult: order.paymentResult,
      status: order.status,
    });
  } catch (error) {
    next(error);
  }
};
