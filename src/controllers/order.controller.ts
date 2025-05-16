import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Order from "../models/order.model";
import Product from "../models/product.model";
import { asyncHandler } from "../middlewares/async.middleware";
import { ErrorResponse } from "../utils/errorResponse";
import { jsonOne } from "../utils/general";

// @desc    Tạo đơn hàng mới
// @route   POST /api/orders
// @access  Private
export const createOrder = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      totalPrice,
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return next(
        new ErrorResponse(
          "Không có sản phẩm nào trong đơn hàng",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Kiểm tra tồn kho
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        return next(
          new ErrorResponse(
            `Không tìm thấy sản phẩm với id ${item.product}`,
            StatusCodes.NOT_FOUND
          )
        );
      }

      if (product.stock < item.quantity) {
        return next(
          new ErrorResponse(
            `Không đủ số lượng tồn kho cho sản phẩm ${product.name}. Còn lại: ${product.stock}`,
            StatusCodes.BAD_REQUEST
          )
        );
      }
    }

    // @ts-ignore
    const order = await Order.create({
      orderItems,
      user: req.user.id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      totalPrice,
    });

    // Cập nhật tồn kho sau khi tạo đơn hàng
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock -= item.quantity;
        await product.save();
      }
    }

    return jsonOne(res, StatusCodes.CREATED, order);
  }
);

// @desc    Lấy đơn hàng theo ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email"
    );

    if (!order) {
      return next(
        new ErrorResponse(
          `Không tìm thấy đơn hàng với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    // if (
    //   (order.user as { _id: string })._id.toString() !== req.user.id &&
    //   req.user.role.toString() !== "admin"
    // ) {
    //   return next(
    //     new ErrorResponse(
    //       "Bạn không có quyền xem đơn hàng này",
    //       StatusCodes.UNAUTHORIZED
    //     )
    //   );
    // }

    return jsonOne(res, StatusCodes.OK, order);
  }
);

// @desc    Cập nhật đơn hàng đã thanh toán
// @route   PUT /api/orders/:id/pay
// @access  Private
export const updateOrderToPaid = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(
        new ErrorResponse(
          `Không tìm thấy đơn hàng với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    const updatedOrder = await order.save();
    return jsonOne(res, StatusCodes.OK, updatedOrder);
  }
);

// @desc    Cập nhật đơn hàng đã giao
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
export const updateOrderToDelivered = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(
        new ErrorResponse(
          `Không tìm thấy đơn hàng với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    order.isDelivered = true;
    order.deliveredAt = new Date();
    order.status = "delivered";

    const updatedOrder = await order.save();
    return jsonOne(res, StatusCodes.OK, updatedOrder);
  }
);

// @desc    Lấy đơn hàng của người dùng hiện tại
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore
  const orders = await Order.find({ user: req.user.id });

  res.status(StatusCodes.OK).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

// @desc    Lấy tất cả đơn hàng
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await Order.find({}).populate("user", "id name");

  res.status(StatusCodes.OK).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

// @desc    Cập nhật trạng thái đơn hàng
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(
        new ErrorResponse(
          `Không tìm thấy đơn hàng với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    order.status = req.body.status;

    if (req.body.status === "delivered") {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    }

    const updatedOrder = await order.save();
    return jsonOne(res, StatusCodes.OK, updatedOrder);
  }
);
