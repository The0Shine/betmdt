import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { OrderService } from "../services/order.service";
import Product from "../models/product.model";
import HttpError from "../utils/httpError";
import { jsonOne, jsonAll } from "../utils/general";
import Order from "../models/order.model";
import { IOrderResponse, IRefundResponse } from "../interfaces/response/order.interface";
import { ORDER_STATUS, ORDER_STATUS_VALUES } from "../constants";
import { hasPermission, isAdmin } from "../middlewares/permission.middleware";

// @desc    Táº¡o Ä‘Æ¡n hÃ ng má»›i
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

    // Kiá»ƒm tra cÃ¡c trÆ°á»ng báº¯t buá»™c
    if (!orderItems || orderItems.length === 0) {
      throw new HttpError({
        title: "missing_items",
        detail: "KhÃ´ng cÃ³ sáº£n pháº©m nÃ o trong Ä‘Æ¡n hÃ ng",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    if (!shippingAddress || !shippingAddress.address || !shippingAddress.city) {
      throw new HttpError({
        title: "missing_shipping",
        detail: "ThÃ´ng tin Ä‘á»‹a chá»‰ giao hÃ ng khÃ´ng Ä‘áº§y Ä‘á»§",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    if (!paymentMethod) {
      throw new HttpError({
        title: "missing_payment",
        detail: "PhÆ°Æ¡ng thá»©c thanh toÃ¡n lÃ  báº¯t buá»™c",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    if (!totalPrice || totalPrice <= 0) {
      throw new HttpError({
        title: "invalid_total",
        detail: "Tá»•ng tiá»n khÃ´ng há»£p lá»‡",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Batch load all products to avoid N+1 queries
    const productIds = orderItems.map((item: { product: string }) => item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Validate vÃ  enrich orderItems
    const enrichedOrderItems = [];
    for (const item of orderItems) {
      if (!item.product || !item.quantity || item.quantity <= 0) {
        throw new HttpError({
          title: "invalid_item",
          detail: "ThÃ´ng tin sáº£n pháº©m khÃ´ng há»£p lá»‡",
          code: StatusCodes.BAD_REQUEST,
        });
      }

      const product = productMap.get(item.product);
      if (!product) {
        throw new HttpError({
          title: "product_not_found",
          detail: `KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m vá»›i id ${item.product}`,
          code: StatusCodes.NOT_FOUND,
        });
      }

      enrichedOrderItems.push({
        product: item.product,
        name: product.name,
        quantity: item.quantity,
        // SECURITY: Always use server price, never trust client
        price: product.price,
      });
    }

    // Táº¡o Ä‘Æ¡n hÃ ng qua service
    const order = await OrderService.createOrder({
      user: userId,
      orderItems: enrichedOrderItems,
      shippingAddress,
      paymentMethod,
      totalPrice,
    });

    // Láº¥y Ä‘Æ¡n hÃ ng vá»›i Ä‘áº§y Ä‘á»§ thÃ´ng tin
    const createdOrder = await OrderService.getOrderById(order._id.toString());

    jsonOne<IOrderResponse>(res, StatusCodes.CREATED, createdOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Láº¥y Ä‘Æ¡n hÃ ng theo ID
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
        detail: `KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng vá»›i id ${orderId}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    // SECURITY: Check ownership - user can only view their own orders
    // OR user has orders.view_all permission (admin)
    const userId = req.tokenPayload._id as string;
    const orderUserId = typeof order.user === 'object' && order.user._id 
      ? order.user._id.toString() 
      : order.user.toString();
    
    const hasViewAllPermission = req.populatedUser && hasPermission(req.populatedUser, 'orders.view_all');
    
    if (orderUserId !== userId && !hasViewAllPermission) {
      throw new HttpError({
        title: "forbidden",
        detail: "Bạn không có quyền xem đơn hàng này",
        code: StatusCodes.FORBIDDEN,
      });
    }

    jsonOne<IOrderResponse>(res, StatusCodes.OK, order);
  } catch (error) {
    next(error);
  }
};

// @desc    Cáº­p nháº­t Ä‘Æ¡n hÃ ng Ä‘Ã£ thanh toÃ¡n
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

    jsonOne<IOrderResponse>(res, StatusCodes.OK, updatedOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Cáº­p nháº­t Ä‘Æ¡n hÃ ng hoÃ n thÃ nh
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
      ORDER_STATUS.COMPLETED,
      userId
    );

    jsonOne<IOrderResponse>(res, StatusCodes.OK, updatedOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    Láº¥y Ä‘Æ¡n hÃ ng cá»§a ngÆ°á»i dÃ¹ng hiá»‡n táº¡i
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

    jsonAll<IOrderResponse>(res, StatusCodes.OK, orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Láº¥y táº¥t cáº£ Ä‘Æ¡n hÃ ng
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

    jsonAll<IOrderResponse>(res, StatusCodes.OK, orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Cáº­p nháº­t tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng
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
        detail: "Tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng lÃ  báº¯t buá»™c",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Kiá»ƒm tra status há»£p lá»‡ - using centralized constants
    const validStatuses = ORDER_STATUS_VALUES;
    if (!validStatuses.includes(status)) {
      throw new HttpError({
        title: "invalid_status",
        detail: `Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡. Chá»‰ cháº¥p nháº­n: ${validStatuses.join(
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

    jsonOne<IOrderResponse>(res, StatusCodes.OK, updatedOrder);
  } catch (error) {
    next(error);
  }
};

// ThÃªm hai endpoint má»›i sau updateOrderStatus

// @desc    YÃªu cáº§u hoÃ n tiá»n Ä‘Æ¡n hÃ ng
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
        detail: "LÃ½ do hoÃ n tiá»n lÃ  báº¯t buá»™c",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new HttpError({
        title: "order_not_found",
        detail: `KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng vá»›i id ${orderId}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Kiá»ƒm tra Ä‘Æ¡n hÃ ng thuá»™c vá» ngÆ°á»i dÃ¹ng hiá»‡n táº¡i
    if (order.user.toString() !== userId) {
      throw new HttpError({
        title: "unauthorized",
        detail: "Báº¡n khÃ´ng cÃ³ quyá»n yÃªu cáº§u hoÃ n tiá»n Ä‘Æ¡n hÃ ng nÃ y",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Kiá»ƒm tra tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng
    if (order.status === "cancelled") {
      throw new HttpError({
        title: "invalid_order_status",
        detail: "KhÃ´ng thá»ƒ yÃªu cáº§u hoÃ n tiá»n Ä‘Æ¡n hÃ ng Ä‘Ã£ há»§y",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    if (order.status === ORDER_STATUS.REFUND_REQUESTED || order.status === ORDER_STATUS.REFUNDED) {
      throw new HttpError({
        title: "invalid_order_status",
        detail: "ÄÆ¡n hÃ ng Ä‘Ã£ cÃ³ yÃªu cáº§u hoÃ n tiá»n hoáº·c Ä‘Ã£ Ä‘Æ°á»£c hoÃ n tiá»n",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Cáº­p nháº­t tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng vÃ  thÃ´ng tin hoÃ n tiá»n
    order.status = ORDER_STATUS.REFUND_REQUESTED;
    order.refundInfo = {
      refundReason,
      refundDate: undefined,
      refundTransactionId: undefined,
      notes: `YÃªu cáº§u hoÃ n tiá»n bá»Ÿi khÃ¡ch hÃ ng vÃ o ${new Date().toISOString()}`,
    };

    await order.save();

    jsonOne<IRefundResponse>(res, StatusCodes.OK, {
      success: true,
      message: "YÃªu cáº§u hoÃ n tiá»n Ä‘Ã£ Ä‘Æ°á»£c gá»­i",
      order: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Duyá»‡t yÃªu cáº§u hoÃ n tiá»n
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
        detail: `KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng vá»›i id ${orderId}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Kiá»ƒm tra tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng
    if (order.status !== ORDER_STATUS.REFUND_REQUESTED) {
      throw new HttpError({
        title: "invalid_order_status",
        detail: "Chá»‰ cÃ³ thá»ƒ duyá»‡t Ä‘Æ¡n hÃ ng cÃ³ tráº¡ng thÃ¡i yÃªu cáº§u hoÃ n tiá»n",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    if (!order.isPaid) {
      throw new HttpError({
        title: "order_not_paid",
        detail: "KhÃ´ng thá»ƒ hoÃ n tiá»n Ä‘Æ¡n hÃ ng chÆ°a thanh toÃ¡n",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Thá»±c hiá»‡n hoÃ n tiá»n
    const refundedOrder = await OrderService.refundOrder(orderId, {
      refundReason: order.refundInfo?.refundReason || "HoÃ n tiá»n theo yÃªu cáº§u",
      notes: notes || "YÃªu cáº§u hoÃ n tiá»n Ä‘Æ°á»£c duyá»‡t bá»Ÿi admin",
      createImportVoucher,
    });

    jsonOne<IRefundResponse>(res, StatusCodes.OK, {
      success: true,
      message: "ÄÃ£ duyá»‡t yÃªu cáº§u hoÃ n tiá»n",
      order: refundedOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Há»§y Ä‘Æ¡n hÃ ng
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = req.params.id;
    const userId = req.tokenPayload._id as string;

    // SECURITY: Check ownership - user can only cancel their own orders
    const order = await Order.findById(orderId);
    if (!order) {
      throw new HttpError({
        title: "order_not_found",
        detail: "Không tìm thấy đơn hàng",
        code: StatusCodes.NOT_FOUND,
      });
    }

    const orderUserId = order.user.toString();
    const hasAdminPermission = req.populatedUser && isAdmin(req.populatedUser);

    if (orderUserId !== userId && !hasAdminPermission) {
      throw new HttpError({
        title: "forbidden",
        detail: "Bạn không có quyền hủy đơn hàng này",
        code: StatusCodes.FORBIDDEN,
      });
    }

    const updatedOrder = await OrderService.cancelOrder(orderId);

    jsonOne<IOrderResponse>(res, StatusCodes.OK, updatedOrder);
  } catch (error) {
    next(error);
  }
};

// @desc    HoÃ n tiá»n Ä‘Æ¡n hÃ ng
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

    // Kiá»ƒm tra cÃ¡c trÆ°á»ng báº¯t buá»™c

    if (!refundReason) {
      throw new HttpError({
        title: "missing_refund_reason",
        detail: "LÃ½ do hoÃ n tiá»n lÃ  báº¯t buá»™c",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const refundedOrder = await OrderService.refundOrder(orderId, {
      refundReason,
      notes,
      createImportVoucher,
    });

    jsonOne<IOrderResponse>(res, StatusCodes.OK, refundedOrder);
  } catch (error) {
    next(error);
  }
};

// Legacy function - kept for backward compatibility
// @desc    Cáº­p nháº­t Ä‘Æ¡n hÃ ng Ä‘Ã£ giao (alias for complete)
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
        detail: `KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng vá»›i id ${orderId}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Kiá»ƒm tra tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng
    if (order.status !== ORDER_STATUS.REFUND_REQUESTED) {
      throw new HttpError({
        title: "invalid_order_status",
        detail: "Chá»‰ cÃ³ thá»ƒ tá»« chá»‘i Ä‘Æ¡n hÃ ng cÃ³ tráº¡ng thÃ¡i yÃªu cáº§u hoÃ n tiá»n",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Cáº­p nháº­t tráº¡ng thÃ¡i vá» "processing" hoáº·c tráº¡ng thÃ¡i trÆ°á»›c Ä‘Ã³ tÃ¹y vÃ o logic há»‡ thá»‘ng
    order.status = "completed"; // Hoáº·c "processing" náº¿u cáº§n
    order.refundInfo = {
      ...order.refundInfo,
    };

    await order.save();

    jsonOne<IRefundResponse>(res, StatusCodes.OK, {
      success: true,
      message: "ÄÃ£ tá»« chá»‘i yÃªu cáº§u hoÃ n tiá»n",
      order: order,
    });
  } catch (error) {
    next(error);
  }
};
export const updateOrderToDelivered = updateOrderToCompleted;
