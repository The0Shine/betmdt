import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Product from "../models/product.model";
import { Stock, StockHistory } from "../models/stock.model";
import { TransactionService } from "../services/transaction.service";
import HttpError from "../utils/httpError";
import { jsonOne } from "../utils/general";
import { createPageOptions } from "../utils/pagination";
import mongoose, { Types } from "mongoose";
import orderModel from "../models/order.model";

// @desc    Lấy tất cả phiếu kho
// @route   GET /api/stock
// @access  Public
export const getStockVouchers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filter: any = {};

    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.createdBy) filter.createdBy = req.query.createdBy;

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate)
        filter.createdAt.$gte = new Date(req.query.startDate as string);
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate as string);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    const { page, limit, search } = createPageOptions(req);

    if (search) {
      filter.$or = [
        { voucherNumber: new RegExp(search, "i") },
        { reason: new RegExp(search, "i") },
      ];
    }

    const skip = (page - 1) * limit;

    let sort: any = { createdAt: -1 };
    if (req.query.sort) {
      const [field, order] = (req.query.sort as string).split(",");
      sort = { [field]: order === "asc" ? 1 : -1 };
    }

    const [vouchers, total] = await Promise.all([
      Stock.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "lastName email")
        .populate("approvedBy", "lastName email")
        .populate("rejectedBy", "lastName email")
        .populate("items.product", "name image")
        .populate("relatedOrder"),
      Stock.countDocuments(filter),
    ]);

    // KHÔNG return, chỉ gọi res.json
    res.status(StatusCodes.OK).json({
      success: true,
      count: vouchers.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: vouchers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy phiếu kho theo ID
// @route   GET /api/stock/:id
// @access  Public
export const getStockVoucherById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError({
        title: "invalid_id",
        detail: `ID không hợp lệ: ${id}`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const voucher = await Stock.findById(id)
      .populate("createdBy", "lastName email")
      .populate("approvedBy", "lastName email")
      .populate("rejectedBy", "lastName email")
      .populate("items.product", "name image")
      .populate("relatedOrder");

    if (!voucher) {
      throw new HttpError({
        title: "voucher_not_found",
        detail: `Không tìm thấy phiếu kho với id ${id}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    jsonOne(res, StatusCodes.OK, voucher);
  } catch (error) {
    next(error);
  }
};

// @desc    Tạo phiếu kho mới
// @route   POST /api/stock
// @access  Public
export const createStockVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type, reason, items, notes, relatedOrder } = req.body;
    const userId = req.tokenPayload?._id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new HttpError({
        title: "missing_items",
        detail: "Vui lòng thêm ít nhất một sản phẩm",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.product || !item.quantity || Number(item.quantity) <= 0) {
        throw new HttpError({
          title: "invalid_item",
          detail: "Thông tin sản phẩm không hợp lệ",
          code: StatusCodes.BAD_REQUEST,
        });
      }

      if (!mongoose.Types.ObjectId.isValid(item.product)) {
        throw new HttpError({
          title: "invalid_product_id",
          detail: `ID sản phẩm không hợp lệ: ${item.product}`,
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

      // For export vouchers, check stock availability
      if (type === "export" && product.quantity < item.quantity) {
        throw new HttpError({
          title: "insufficient_stock",
          detail: `Không đủ tồn kho cho sản phẩm ${product.name}. Tồn kho hiện tại: ${product.quantity}, yêu cầu: ${item.quantity}`,
          code: StatusCodes.BAD_REQUEST,
        });
      }
    }

    const voucher = await Stock.create({
      type,
      reason,
      items,
      notes,
      relatedOrder,
      createdBy: userId,
    });

    await voucher.populate("createdBy", "lastName email");
    await voucher.populate("items.product", "name");

    console.log(`📋 Đã tạo phiếu kho: ${voucher.voucherNumber}`);
    jsonOne(res, StatusCodes.CREATED, voucher);
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật phiếu kho
// @route   PUT /api/stock/:id
// @access  Public
export const updateStockVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError({
        title: "invalid_id",
        detail: `ID không hợp lệ: ${id}`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const voucher = await Stock.findById(id);

    if (!voucher) {
      throw new HttpError({
        title: "voucher_not_found",
        detail: `Không tìm thấy phiếu kho với id ${id}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    if (voucher.status !== "pending") {
      throw new HttpError({
        title: "cannot_edit",
        detail: "Chỉ có thể chỉnh sửa phiếu kho đang chờ duyệt",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const updated = await Stock.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("createdBy", "lastName email")
      .populate("items.product", "name");

    jsonOne(res, StatusCodes.OK, updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa phiếu kho
// @route   DELETE /api/stock/:id
// @access  Public
export const deleteStockVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError({
        title: "invalid_id",
        detail: `ID không hợp lệ: ${id}`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const voucher = await Stock.findById(id);

    if (!voucher) {
      throw new HttpError({
        title: "voucher_not_found",
        detail: `Không tìm thấy phiếu kho với id ${id}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    if (voucher.status !== "pending") {
      throw new HttpError({
        title: "cannot_delete",
        detail: "Chỉ có thể xóa phiếu kho đang chờ duyệt",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    await voucher.deleteOne();
    res.status(StatusCodes.OK).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Phê duyệt phiếu kho
// @route   PATCH /api/stock/:id/approve
// @access  Public
export const approveStockVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.tokenPayload?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError({
        title: "invalid_id",
        detail: `ID không hợp lệ: ${id}`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const voucher = await Stock.findById(id).populate("items.product");

    if (!voucher) {
      throw new HttpError({
        title: "voucher_not_found",
        detail: `Không tìm thấy phiếu kho với id ${id}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    if (voucher.status !== "pending") {
      throw new HttpError({
        title: "cannot_approve",
        detail: "Chỉ có thể phê duyệt phiếu kho đang chờ duyệt",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    console.log(`🔍 Phê duyệt phiếu ${voucher.type}: ${voucher.voucherNumber}`);

    // CHỈ kiểm tra tồn kho cho phiếu XUẤT kho
    if (voucher.type === "export") {
      console.log("🔍 Kiểm tra tồn kho cho phiếu xuất kho...");

      for (const item of voucher.items) {
        const product = await Product.findById(item.product);

        if (!product) {
          return next(
            new HttpError({
              title: "product_not_found",
              detail: `Không tìm thấy sản phẩm với tên "${item.productName}" (ID: ${item.product})`,
              code: StatusCodes.NOT_FOUND,
            })
          );
        }

        if (product.quantity < item.quantity) {
          return next(
            new HttpError({
              title: "insufficient_stock",
              detail: `Không đủ tồn kho cho sản phẩm "${item.productName}". Tồn kho hiện tại: ${product.quantity}, yêu cầu: ${item.quantity}`,
              code: StatusCodes.BAD_REQUEST,
            })
          );
        }
      }
    } else if (voucher.type === "import") {
      console.log("📦 Phê duyệt phiếu nhập kho - không cần kiểm tra tồn kho");
    }

    // Cập nhật tồn kho và tạo lịch sử
    for (const item of voucher.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        console.warn(`⚠️ Không tìm thấy sản phẩm ${item.product}, bỏ qua...`);
        continue;
      }

      const quantityBefore = product.quantity;
      const quantityChange =
        voucher.type === "import" ? item.quantity : -item.quantity;
      const quantityAfter = quantityBefore + quantityChange;

      // Đảm bảo tồn kho không âm (double check cho phiếu xuất)
      if (quantityAfter < 0) {
        return next(
          new HttpError({
            title: "negative_stock",
            detail: `Tồn kho sản phẩm "${item.productName}" sẽ bị âm sau khi xuất: ${quantityAfter}`,
            code: StatusCodes.BAD_REQUEST,
          })
        );
      }

      // Cập nhật tồn kho
      product.quantity = quantityAfter;
      await product.save();

      // Tạo lịch sử stock
      await StockHistory.create({
        product: item.product,
        productName: item.productName,
        type: voucher.type,
        quantityBefore,
        quantityChange,
        quantityAfter,
        reason: voucher.reason,
        relatedVoucher: voucher._id,
        voucherNumber: voucher.voucherNumber,
        relatedOrder: voucher.relatedOrder,
        createdBy: userId,
        notes: item.note,
      });

      console.log(
        `📊 Cập nhật tồn kho ${
          item.productName
        }: ${quantityBefore} → ${quantityAfter} (${
          quantityChange > 0 ? "+" : ""
        }${quantityChange})`
      );
    }

    // Cập nhật trạng thái phiếu
    voucher.status = "approved";
    voucher.approvedBy = new Types.ObjectId(userId);
    voucher.approvedAt = new Date();
    await voucher.save();

    // 🎯 TỰ ĐỘNG TẠO GIAO DỊCH TÀI CHÍNH
    try {
      if (voucher.type === "import") {
        console.log(`💸 Tạo giao dịch chi cho phiếu nhập kho...`);
        await TransactionService.createFromImportVoucher(
          voucher._id,
          voucher.totalValue || 0,
          new Types.ObjectId(userId)
        );
      } else if (voucher.type === "export") {
        console.log(`📈 Tạo giao dịch giá vốn cho phiếu xuất kho...`);
        const totalCostValue = voucher.items.reduce((total, item) => {
          return total + (item.costPrice || 0) * item.quantity;
        }, 0);

        await TransactionService.createFromExportVoucher(
          voucher._id,
          totalCostValue,
          new Types.ObjectId(userId)
        );
      }
    } catch (transactionError) {
      console.error(
        "⚠️ Lỗi tạo giao dịch (không ảnh hưởng phê duyệt phiếu):",
        transactionError
      );
    }

    console.log(
      `✅ Đã phê duyệt phiếu ${voucher.type} kho: ${voucher.voucherNumber}`
    );
    jsonOne(res, StatusCodes.OK, voucher);
  } catch (error) {
    next(error);
  }
};

// @desc    Từ chối phiếu kho
// @route   PATCH /api/stock/:id/reject
// @access  Public
export const rejectStockVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const userId = req.tokenPayload?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError({
        title: "invalid_id",
        detail: `ID không hợp lệ: ${id}`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const voucher = await Stock.findById(id);

    if (!voucher) {
      throw new HttpError({
        title: "voucher_not_found",
        detail: `Không tìm thấy phiếu kho với id ${id}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    if (voucher.status !== "pending") {
      throw new HttpError({
        title: "cannot_reject",
        detail: "Chỉ có thể từ chối phiếu kho đang chờ duyệt",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    voucher.status = "rejected";
    voucher.rejectedBy = new Types.ObjectId(userId);
    voucher.rejectedAt = new Date();
    voucher.rejectionReason = rejectionReason;
    await voucher.save();

    console.log(`❌ Đã từ chối phiếu kho: ${voucher.voucherNumber}`);
    jsonOne(res, StatusCodes.OK, voucher);
  } catch (error) {
    next(error);
  }
};

// @desc    Hủy phiếu kho
// @route   PATCH /api/stock/:id/cancel
// @access  Public
export const cancelStockVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError({
        title: "invalid_id",
        detail: `ID không hợp lệ: ${id}`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const voucher = await Stock.findById(id);

    if (!voucher) {
      throw new HttpError({
        title: "voucher_not_found",
        detail: `Không tìm thấy phiếu kho với id ${id}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    if (voucher.status === "approved") {
      throw new HttpError({
        title: "cannot_cancel",
        detail: "Không thể hủy phiếu kho đã được phê duyệt",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    voucher.status = "cancelled";
    await voucher.save();

    console.log(`🚫 Đã hủy phiếu kho: ${voucher.voucherNumber}`);
    jsonOne(res, StatusCodes.OK, voucher);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy lịch sử kho
// @route   GET /api/stock/history
// @access  Public
export const getStockHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filter: any = {};

    if (req.query.type) filter.type = req.query.type;

    if (req.query.productId) {
      const productId = req.query.productId as string;
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        jsonOne(res, StatusCodes.BAD_REQUEST, {
          success: false,
          message: `ID sản phẩm không hợp lệ: ${productId}`,
        });
      }
      filter.product = productId;
    }

    if (req.query.voucherNumber) {
      filter.voucherNumber = new RegExp(req.query.voucherNumber as string, "i");
    }

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate as string);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    const { page, limit, search } = createPageOptions(req);

    if (search) {
      filter.$or = [
        { productName: new RegExp(search, "i") },
        { voucherNumber: new RegExp(search, "i") },
      ];
    }

    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      StockHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("product", "name image")
        .populate("createdBy", "name email")
        .populate("relatedVoucher", "voucherNumber type status")
        .populate("relatedOrder", "_id"),
      StockHistory.countDocuments(filter),
    ]);

    jsonOne(res, StatusCodes.OK, {
      success: true,
      count: history.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: history,
    });
  } catch (error) {
    next(error);
  }
};
export const createStockVoucherFromOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = req.params.id;
    const userId = req.tokenPayload?._id;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      throw new HttpError({
        title: "invalid_order_id",
        detail: "ID đơn hàng không hợp lệ hoặc không được cung cấp",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Lấy đơn hàng kèm thông tin sản phẩm
    const order = await orderModel
      .findById(orderId)
      .populate("orderItems.product");
    if (!order) {
      throw new HttpError({
        title: "order_not_found",
        detail: `Không tìm thấy đơn hàng với id ${orderId}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Kiểm tra trạng thái đơn hàng (ví dụ chỉ tạo phiếu kho khi đã thanh toán hoặc hoàn thành)
    if (!["completed"].includes(order.status)) {
      throw new HttpError({
        title: "invalid_order_status",
        detail:
          "Chỉ có thể tạo phiếu kho cho đơn hàng đã thanh toán hoặc hoàn thành",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Chuẩn bị danh sách items cho phiếu kho, kiểm tra tồn kho từng sản phẩm
    const items = [];

    for (const orderItem of order.orderItems) {
      const product = await Product.findById(orderItem.product);
      if (!product) {
        throw new HttpError({
          title: "product_not_found",
          detail: `Sản phẩm trong đơn hàng không tồn tại, id: ${orderItem.product}`,
          code: StatusCodes.NOT_FOUND,
        });
      }

      if (product.quantity < orderItem.quantity) {
        throw new HttpError({
          title: "insufficient_stock",
          detail: `Sản phẩm ${product.name} không đủ tồn kho. Tồn kho: ${product.quantity}, Yêu cầu: ${orderItem.quantity}`,
          code: StatusCodes.BAD_REQUEST,
        });
      }

      items.push({
        product: product._id,
        quantity: orderItem.quantity,
      });
    }

    if (items.length === 0) {
      throw new HttpError({
        title: "empty_items",
        detail: "Đơn hàng không có sản phẩm để tạo phiếu kho",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Tạo phiếu kho xuất từ đơn hàng (type export)
    const voucher = await Stock.create({
      type: "export", // giả sử mặc định là phiếu xuất kho khi tạo từ đơn hàng
      reason: `Xuất kho từ đơn hàng ${order._id}`,
      items,
      notes: `Phiếu kho tạo tự động từ đơn hàng ${order._id}`,
      relatedOrder: order._id,
      createdBy: userId,
    });

    // Populate các trường cần thiết để trả về client
    await voucher.populate("createdBy", "lastName email");
    await voucher.populate("items.product", "name");

    console.log(
      `📋 Đã tạo phiếu kho từ đơn hàng: ${voucher.voucherNumber || voucher._id}`
    );

    jsonOne(res, StatusCodes.CREATED, voucher);
  } catch (error) {
    next(error);
  }
};
