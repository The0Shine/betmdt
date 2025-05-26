import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { OrderService } from "../services/order.service";
import Product from "../models/product.model";
import HttpError from "../utils/httpError";
import { jsonOne, jsonAll } from "../utils/general";

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

    jsonOne(res, StatusCodes.CREATED, createdOrder);
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

    jsonOne(res, StatusCodes.OK, order);
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

    jsonOne(res, StatusCodes.OK, updatedOrder);
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

    jsonOne(res, StatusCodes.OK, updatedOrder);
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

    jsonAll(res, StatusCodes.OK, orders);
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
    const { page = 1, limit = 10, status, user } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (user) filter.user = user;

    const options = {
      page: Number(page),
      limit: Number(limit),
      sort: { createdAt: -1 },
    };

    const orders = await OrderService.getOrders(filter, options);

    jsonAll(res, StatusCodes.OK, orders);
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
    const validStatuses = ["pending", "processing", "cancelled", "completed"];
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

    jsonOne(res, StatusCodes.OK, updatedOrder);
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

    jsonOne(res, StatusCodes.OK, updatedOrder);
  } catch (error) {
    next(error);
  }
};

// Legacy function - kept for backward compatibility
// @desc    Cập nhật đơn hàng đã giao (alias for complete)
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin

export const updateOrderToDelivered = updateOrderToCompleted;
