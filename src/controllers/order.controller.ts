import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { OrderService } from "../services/order.service";
import Product from "../models/product.model";
import HttpError from "../utils/httpError";
import { jsonOne, jsonAll } from "../utils/general";
import Order from "../models/order.model";
import { IOrderResponse, IRefundResponse } from "../interfaces/response/order.interface";

// @desc    Tạo đơn hàng mới
// @route   POST /api/orders
// @access  Private
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload._id as string;
    const { orderItems, shippingAddress, paymentMethod, totalPrice } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!orderItems || orderItems.length === 0) {
      throw new HttpError({
        title: "missing_items",
        detail: "Không có sản phẩm nào trong đơn hàng",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    if (!shippingAddress || !shippingAddress.address || !shippingAddress.city) {
      throw new HttpError({
        title: "missing_shipping",
        detail: "Thông tin địa chỉ giao hàng không đầy đủ",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    if (!paymentMethod) {
      throw new HttpError({
        title: "missing_payment",
        detail: "Phương thức thanh toán là bắt buộc",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    if (!totalPrice || totalPrice <= 0) {
      throw new HttpError({
        title: "invalid_total",
        detail: "Tổng tiền không hợp lệ",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Validate và enrich orderItems
    const enrichedOrderItems = [];
    for (const item of orderItems) {
      if (!item.product || !item.quantity || item.quantity <= 0) {
        throw new HttpError({
          title: "invalid_item",
          detail: "Thông tin sản phẩm không hợp lệ",
          code: StatusCodes.BAD_REQUEST,
        });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        throw new HttpError({
          title: "product_not_found",
          detail: `Không tìm thấy sản phẩm với id ${item.product}`,
          code: StatusCodes.NOT_FOUND,
        });
      }

      enrichedOrderItems.push({
        product: item.product,
        name: product.name,
        quantity: item.quantity,
        price: item.price || product.price,
      });
    }

    // Tạo đơn hàng qua service
    const order = await OrderService.createOrder({
      user: userId,
      orderItems: enrichedOrderItems,
      shippingAddress,
      paymentMethod,
      totalPrice,
    });

    // Lấy đơn hàng với đầy đủ thông tin
    const createdOrder = await OrderService.getOrderById(order._id.toString());

    jsonOne<IOrderResponse>(res, StatusCodes.CREATED, createdOrder as any);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy đơn hàng theo ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tokenPayload || !req.tokenPayload._id) {
      throw new HttpError({
        title: "unauthorized",
        detail: "User not authenticated",
        code: StatusCodes.UNAUTHORIZED,
      });
    }

    const orderId = req.params.id;

    const order = await OrderService.getOrderById(orderId);

    if (!order) {
      throw new HttpError({
        title: "order_not_found",
        detail: `Không tìm thấy đơn hàng với id ${orderId}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    jsonOne<IOrderResponse>(res, StatusCodes.OK, order as any);
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật đơn hàng đã thanh toán
// @route   PUT /api/orders/:id/pay
// @access  Private
export const updateOrderToPaid = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tokenPayload || !req.tokenPayload._id) {
      throw new HttpError({
        title: "unauthorized",
        detail: "User not authenticated",
        code: StatusCodes.UNAUTHORIZED,
      });
    }

    const orderId = req.params.id;
    const userId = req.tokenPayload._id as string;

    const paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    const updatedOrder = await OrderService.updatePayment(
      orderId,
      paymentResult,
      userId
    );

    jsonOne<IOrderResponse>(res, StatusCodes.OK, updatedOrder as any);
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật đơn hàng hoàn thành
// @route   PUT /api/orders/:id/complete
// @access  Private/Admin
export const updateOrderToCompleted = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = req.params.id;
    const userId = req.tokenPayload._id as string;

    const updatedOrder = await OrderService.updateOrderStatus(
      orderId,
      "completed",
      userId
    );

    jsonOne<IOrderResponse>(res, StatusCodes.OK, updatedOrder as any);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy đơn hàng của người dùng hiện tại
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload._id as string;

    const orders = await OrderService.getUserOrders(userId);

    jsonAll<IOrderResponse>(res, StatusCodes.OK, orders as any);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy tất cả đơn hàng
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, status, user } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (user) filter.user = user;

    const options = {
      page: Number(page),
      sort: { createdAt: -1 },
    };

    const orders = await OrderService.getOrders(filter, options);

    jsonAll<IOrderResponse>(res, StatusCodes.OK, orders as any);
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật trạng thái đơn hàng
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    const userId = req.tokenPayload._id as string;

    if (!status) {
      throw new HttpError({
        title: "missing_fields",
        detail: "Trạng thái đơn hàng là bắt buộc",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Kiểm tra status hợp lệ
    const validStatuses = [
      "pending",
      "processing",
      "cancelled",
      "completed",
      "refunded",
    ];
    if (!validStatuses.includes(status)) {
      throw new HttpError({
        title: "invalid_status",
        detail: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${validStatuses.join(
          ", "
        )}`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const updatedOrder = await OrderService.updateOrderStatus(
      orderId,
      status,
      userId
    );

    jsonOne<IOrderResponse>(res, StatusCodes.OK, updatedOrder as any);
  } catch (error) {
    next(error);
  }
};

// Thêm hai endpoint mới sau updateOrderStatus

// @desc    Yêu cầu hoàn tiền đơn hàng
// @route   POST /api/orders/:id/request-refund
// @access  Private
export const requestRefund = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = req.params.id;
    const userId = req.tokenPayload._id as string;
    const { refundReason } = req.body;

    if (!refundReason) {
      throw new HttpError({
        title: "missing_refund_reason",
        detail: "Lý do hoàn tiền là bắt buộc",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new HttpError({
        title: "order_not_found",
        detail: `Không tìm thấy đơn hàng với id ${orderId}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Kiểm tra đơn hàng thuộc về người dùng hiện tại
    if (order.user.toString() !== userId) {
      throw new HttpError({
        title: "unauthorized",
        detail: "Bạn không có quyền yêu cầu hoàn tiền đơn hàng này",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Kiểm tra trạng thái đơn hàng
    if (order.status === "cancelled") {
      throw new HttpError({
        title: "invalid_order_status",
        detail: "Không thể yêu cầu hoàn tiền đơn hàng đã hủy",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    if (order.status === "refund_requested" || order.status === "refunded") {
      throw new HttpError({
        title: "invalid_order_status",
        detail: "Đơn hàng đã có yêu cầu hoàn tiền hoặc đã được hoàn tiền",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Cập nhật trạng thái đơn hàng và thông tin hoàn tiền
    order.status = "refund_requested";
    order.refundInfo = {
      refundReason,
      refundDate: undefined,
      refundTransactionId: undefined,
      notes: `Yêu cầu hoàn tiền bởi khách hàng vào ${new Date().toISOString()}`,
    };

    await order.save();

    jsonOne<IRefundResponse>(res, StatusCodes.OK, {
      success: true,
      message: "Yêu cầu hoàn tiền đã được gửi",
      order: order as any,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Duyệt yêu cầu hoàn tiền
// @route   PUT /api/orders/:id/approve-refund
// @access  Private/Admin
export const approveRefund = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = req.params.id;
    const userId = req.tokenPayload._id as string;
    const { notes, createImportVoucher = true } = req.body;

    const order = await Order.findById(orderId).populate("orderItems.product");
    if (!order) {
      throw new HttpError({
        title: "order_not_found",
        detail: `Không tìm thấy đơn hàng với id ${orderId}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Kiểm tra trạng thái đơn hàng
    if (order.status !== "refund_requested") {
      throw new HttpError({
        title: "invalid_order_status",
        detail: "Chỉ có thể duyệt đơn hàng có trạng thái yêu cầu hoàn tiền",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    if (!order.isPaid) {
      throw new HttpError({
        title: "order_not_paid",
        detail: "Không thể hoàn tiền đơn hàng chưa thanh toán",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Thực hiện hoàn tiền
    const refundedOrder = await OrderService.refundOrder(orderId, {
      refundReason: order.refundInfo?.refundReason || "Hoàn tiền theo yêu cầu",
      notes: notes || "Yêu cầu hoàn tiền được duyệt bởi admin",
      createImportVoucher,
    });

    jsonOne<IRefundResponse>(res, StatusCodes.OK, {
      success: true,
      message: "Đã duyệt yêu cầu hoàn tiền",
      order: refundedOrder as any,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Hủy đơn hàng
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = req.params.id;

    const updatedOrder = await OrderService.cancelOrder(orderId);

    jsonOne<IOrderResponse>(res, StatusCodes.OK, updatedOrder as any);
  } catch (error) {
    next(error);
  }
};

// @desc    Hoàn tiền đơn hàng
// @route   POST /api/orders/:id/refund
// @access  Private/Admin
export const refundOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = req.params.id;
    const userId = req.tokenPayload._id as string;
    const { refundReason, notes, createImportVoucher = true } = req.body;

    // Kiểm tra các trường bắt buộc

    if (!refundReason) {
      throw new HttpError({
        title: "missing_refund_reason",
        detail: "Lý do hoàn tiền là bắt buộc",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const refundedOrder = await OrderService.refundOrder(orderId, {
      refundReason,
      notes,
      createImportVoucher,
    });

    jsonOne<IOrderResponse>(res, StatusCodes.OK, refundedOrder as any);
  } catch (error) {
    next(error);
  }
};

// Legacy function - kept for backward compatibility
// @desc    Cập nhật đơn hàng đã giao (alias for complete)
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
export const rejectRefund = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = req.params.id;
    const userId = req.tokenPayload._id as string;
    const { notes } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      throw new HttpError({
        title: "order_not_found",
        detail: `Không tìm thấy đơn hàng với id ${orderId}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Kiểm tra trạng thái đơn hàng
    if (order.status !== "refund_requested") {
      throw new HttpError({
        title: "invalid_order_status",
        detail: "Chỉ có thể từ chối đơn hàng có trạng thái yêu cầu hoàn tiền",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Cập nhật trạng thái về "processing" hoặc trạng thái trước đó tùy vào logic hệ thống
    order.status = "completed"; // Hoặc "processing" nếu cần
    order.refundInfo = {
      ...order.refundInfo,
    };

    await order.save();

    jsonOne<IRefundResponse>(res, StatusCodes.OK, {
      success: true,
      message: "Đã từ chối yêu cầu hoàn tiền",
      order: order as any,
    });
  } catch (error) {
    next(error);
  }
};
export const updateOrderToDelivered = updateOrderToCompleted;
