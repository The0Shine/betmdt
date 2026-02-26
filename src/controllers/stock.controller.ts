import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Product from "../models/product.model";
import { Stock, StockHistory } from "../models/stock.model";
import { TransactionService } from "../services/transaction.service";
import HttpError from "../utils/httpError";
import { jsonOne, jsonAll } from "../utils/general";
import { createPageOptions } from "../utils/pagination";
import mongoose, { Types } from "mongoose";
import orderModel from "../models/order.model";
import { IStockVoucherResponse, IStockHistoryResponse } from "../interfaces/response/stock.interface";

// @desc    Láº¥y táº¥t cáº£ phiáº¿u kho
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

    // KHÃ”NG return, chá»‰ gá»i res.json
    const meta = {
      count: vouchers.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    jsonAll<IStockVoucherResponse>(res, StatusCodes.OK, vouchers, meta);
  } catch (error) {
    next(error);
  }
};

// @desc    Láº¥y phiáº¿u kho theo ID
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
        detail: `ID khÃ´ng há»£p lá»‡: ${id}`,
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
        detail: `KhÃ´ng tÃ¬m tháº¥y phiáº¿u kho vá»›i id ${id}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    jsonOne<IStockVoucherResponse>(res, StatusCodes.OK, voucher);
  } catch (error) {
    next(error);
  }
};

// @desc    Táº¡o phiáº¿u kho má»›i
// @route   POST /api/stock
// @access  Public
export const createStockVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type, reason, items, notes, status, relatedOrder } = req.body;
    const userId = req.tokenPayload?._id;
    console.log(status);

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new HttpError({
        title: "missing_items",
        detail: "Vui lÃ²ng thÃªm Ã­t nháº¥t má»™t sáº£n pháº©m",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.product || !item.quantity || Number(item.quantity) <= 0) {
        throw new HttpError({
          title: "invalid_item",
          detail: "ThÃ´ng tin sáº£n pháº©m khÃ´ng há»£p lá»‡",
          code: StatusCodes.BAD_REQUEST,
        });
      }

      if (!mongoose.Types.ObjectId.isValid(item.product)) {
        throw new HttpError({
          title: "invalid_product_id",
          detail: `ID sáº£n pháº©m khÃ´ng há»£p lá»‡: ${item.product}`,
          code: StatusCodes.BAD_REQUEST,
        });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        throw new HttpError({
          title: "product_not_found",
          detail: `KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m vá»›i id ${item.product}`,
          code: StatusCodes.NOT_FOUND,
        });
      }

      // For export vouchers, check stock availability
      if (type === "export" && product.quantity < item.quantity) {
        throw new HttpError({
          title: "insufficient_stock",
          detail: `KhÃ´ng Ä‘á»§ tá»“n kho cho sáº£n pháº©m ${product.name}. Tá»“n kho hiá»‡n táº¡i: ${product.quantity}, yÃªu cáº§u: ${item.quantity}`,
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
      status, // Máº·c Ä‘á»‹nh lÃ  pending
      createdBy: userId,
    });

    await voucher.populate("createdBy", "lastName email");
    await voucher.populate("items.product", "name");

    console.log(`ðŸ“‹ ÄÃ£ táº¡o phiáº¿u kho: ${voucher.voucherNumber}`);
    jsonOne<IStockVoucherResponse>(res, StatusCodes.CREATED, voucher);
  } catch (error) {
    next(error);
  }
};

// @desc    Cáº­p nháº­t phiáº¿u kho
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
        detail: `ID khÃ´ng há»£p lá»‡: ${id}`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const voucher = await Stock.findById(id);

    if (!voucher) {
      throw new HttpError({
        title: "voucher_not_found",
        detail: `KhÃ´ng tÃ¬m tháº¥y phiáº¿u kho vá»›i id ${id}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    if (voucher.status !== "pending") {
      throw new HttpError({
        title: "cannot_edit",
        detail: "Chá»‰ cÃ³ thá»ƒ chá»‰nh sá»­a phiáº¿u kho Ä‘ang chá» duyá»‡t",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const updated = await Stock.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("createdBy", "lastName email")
      .populate("items.product", "name");

    jsonOne<IStockVoucherResponse>(res, StatusCodes.OK, updated);
  } catch (error) {
    next(error);
  }
};

// @desc    XÃ³a phiáº¿u kho
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
        detail: `ID khÃ´ng há»£p lá»‡: ${id}`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const voucher = await Stock.findById(id);

    if (!voucher) {
      throw new HttpError({
        title: "voucher_not_found",
        detail: `KhÃ´ng tÃ¬m tháº¥y phiáº¿u kho vá»›i id ${id}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    if (voucher.status !== "pending") {
      throw new HttpError({
        title: "cannot_delete",
        detail: "Chá»‰ cÃ³ thá»ƒ xÃ³a phiáº¿u kho Ä‘ang chá» duyá»‡t",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    await voucher.deleteOne();
    jsonOne(res, StatusCodes.OK, { message: "ÄÃ£ xÃ³a phiáº¿u kho" });
  } catch (error) {
    next(error);
  }
};

// @desc    PhÃª duyá»‡t phiáº¿u kho
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
        detail: `ID khÃ´ng há»£p lá»‡: ${id}`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const voucher = await Stock.findById(id).populate("items.product");

    if (!voucher) {
      throw new HttpError({
        title: "voucher_not_found",
        detail: `KhÃ´ng tÃ¬m tháº¥y phiáº¿u kho vá»›i id ${id}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    if (voucher.status !== "pending") {
      throw new HttpError({
        title: "cannot_approve",
        detail: "Chá»‰ cÃ³ thá»ƒ phÃª duyá»‡t phiáº¿u kho Ä‘ang chá» duyá»‡t",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    console.log(`ðŸ” PhÃª duyá»‡t phiáº¿u ${voucher.type}: ${voucher.voucherNumber}`);

    // CHá»ˆ kiá»ƒm tra tá»“n kho cho phiáº¿u XUáº¤T kho
    if (voucher.type === "export") {
      console.log("ðŸ” Kiá»ƒm tra tá»“n kho cho phiáº¿u xuáº¥t kho...");

      for (const item of voucher.items) {
        const product = await Product.findById(item.product);

        if (!product) {
          return next(
            new HttpError({
              title: "product_not_found",
              detail: `KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m vá»›i tÃªn "${item.productName}" (ID: ${item.product})`,
              code: StatusCodes.NOT_FOUND,
            })
          );
        }

        if (product.quantity < item.quantity) {
          return next(
            new HttpError({
              title: "insufficient_stock",
              detail: `KhÃ´ng Ä‘á»§ tá»“n kho cho sáº£n pháº©m "${item.productName}". Tá»“n kho hiá»‡n táº¡i: ${product.quantity}, yÃªu cáº§u: ${item.quantity}`,
              code: StatusCodes.BAD_REQUEST,
            })
          );
        }
      }
    } else if (voucher.type === "import") {
      console.log("ðŸ“¦ PhÃª duyá»‡t phiáº¿u nháº­p kho");
    }

    // Cáº­p nháº­t tá»“n kho vÃ  táº¡o lá»‹ch sá»­
    for (const item of voucher.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        console.warn(`âš ï¸ KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m ${item.product}, bá» qua...`);
        continue;
      }

      const quantityBefore = product.quantity;
      const quantityChange =
        voucher.type === "import" ? item.quantity : -item.quantity;
      const quantityAfter = quantityBefore + quantityChange;

      // Äáº£m báº£o tá»“n kho khÃ´ng Ã¢m (double check cho phiáº¿u xuáº¥t)
      if (quantityAfter < 0) {
        return next(
          new HttpError({
            title: "negative_stock",
            detail: `Tá»“n kho sáº£n pháº©m "${item.productName}" sáº½ bá»‹ Ã¢m sau khi xuáº¥t: ${quantityAfter}`,
            code: StatusCodes.BAD_REQUEST,
          })
        );
      }

      // Cáº­p nháº­t tá»“n kho
      product.quantity = quantityAfter;
      await product.save();

      // Táº¡o lá»‹ch sá»­ stock
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
        `ðŸ“Š Cáº­p nháº­t tá»“n kho ${
          item.productName
        }: ${quantityBefore} â†’ ${quantityAfter} (${
          quantityChange > 0 ? "+" : ""
        }${quantityChange})`
      );
    }

    // Cáº­p nháº­t tráº¡ng thÃ¡i phiáº¿u
    voucher.status = "approved";
    voucher.approvedBy = new Types.ObjectId(userId);
    voucher.approvedAt = new Date();
    await voucher.save();

    // ðŸŽ¯ Tá»° Äá»˜NG Táº O GIAO Dá»ŠCH TÃ€I CHÃNH
    try {
      if (voucher.type === "import") {
        console.log(`ðŸ’¸ Táº¡o giao dá»‹ch chi cho phiáº¿u nháº­p kho...`);
        await TransactionService.createFromImportVoucher(
          voucher._id,
          voucher.totalValue || 0,
          new Types.ObjectId(userId)
        );
      } else if (voucher.type === "export") {
        console.log(`ðŸ“ˆ Táº¡o giao dá»‹ch giÃ¡ vá»‘n cho phiáº¿u xuáº¥t kho...`);
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
        "âš ï¸ Lá»—i táº¡o giao dá»‹ch (khÃ´ng áº£nh hÆ°á»Ÿng phÃª duyá»‡t phiáº¿u):",
        transactionError
      );
    }

    console.log(
      `âœ… ÄÃ£ phÃª duyá»‡t phiáº¿u ${voucher.type} kho: ${voucher.voucherNumber}`
    );
    jsonOne<IStockVoucherResponse>(res, StatusCodes.OK, voucher);
  } catch (error) {
    next(error);
  }
};

// @desc    Tá»« chá»‘i phiáº¿u kho
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
        detail: `ID khÃ´ng há»£p lá»‡: ${id}`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const voucher = await Stock.findById(id);

    if (!voucher) {
      throw new HttpError({
        title: "voucher_not_found",
        detail: `KhÃ´ng tÃ¬m tháº¥y phiáº¿u kho vá»›i id ${id}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    if (voucher.status !== "pending") {
      throw new HttpError({
        title: "cannot_reject",
        detail: "Chá»‰ cÃ³ thá»ƒ tá»« chá»‘i phiáº¿u kho Ä‘ang chá» duyá»‡t",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    voucher.status = "rejected";
    voucher.rejectedBy = new Types.ObjectId(userId);
    voucher.rejectedAt = new Date();
    voucher.rejectionReason = rejectionReason;
    await voucher.save();

    console.log(`âŒ ÄÃ£ tá»« chá»‘i phiáº¿u kho: ${voucher.voucherNumber}`);
    jsonOne<IStockVoucherResponse>(res, StatusCodes.OK, voucher);
  } catch (error) {
    next(error);
  }
};

// @desc    Há»§y phiáº¿u kho
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
        detail: `ID khÃ´ng há»£p lá»‡: ${id}`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const voucher = await Stock.findById(id);

    if (!voucher) {
      throw new HttpError({
        title: "voucher_not_found",
        detail: `KhÃ´ng tÃ¬m tháº¥y phiáº¿u kho vá»›i id ${id}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    if (voucher.status === "approved") {
      throw new HttpError({
        title: "cannot_cancel",
        detail: "KhÃ´ng thá»ƒ há»§y phiáº¿u kho Ä‘Ã£ Ä‘Æ°á»£c phÃª duyá»‡t",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    voucher.status = "cancelled";
    await voucher.save();

    console.log(`ðŸš« ÄÃ£ há»§y phiáº¿u kho: ${voucher.voucherNumber}`);
    jsonOne<IStockVoucherResponse>(res, StatusCodes.OK, voucher);
  } catch (error) {
    next(error);
  }
};

// @desc    Láº¥y lá»‹ch sá»­ kho
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
          message: `ID sáº£n pháº©m khÃ´ng há»£p lá»‡: ${productId}`,
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

    const meta = {
      count: history.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    jsonAll<IStockHistoryResponse>(res, StatusCodes.OK, history, meta);
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
        detail: "ID Ä‘Æ¡n hÃ ng khÃ´ng há»£p lá»‡ hoáº·c khÃ´ng Ä‘Æ°á»£c cung cáº¥p",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Láº¥y Ä‘Æ¡n hÃ ng kÃ¨m thÃ´ng tin sáº£n pháº©m
    const order = await orderModel
      .findById(orderId)
      .populate("orderItems.product");
    if (!order) {
      throw new HttpError({
        title: "order_not_found",
        detail: `KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng vá»›i id ${orderId}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Kiá»ƒm tra tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng (vÃ­ dá»¥ chá»‰ táº¡o phiáº¿u kho khi Ä‘Ã£ thanh toÃ¡n hoáº·c hoÃ n thÃ nh)
    if (!["completed"].includes(order.status)) {
      throw new HttpError({
        title: "invalid_order_status",
        detail:
          "Chá»‰ cÃ³ thá»ƒ táº¡o phiáº¿u kho cho Ä‘Æ¡n hÃ ng Ä‘Ã£ thanh toÃ¡n hoáº·c hoÃ n thÃ nh",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Chuáº©n bá»‹ danh sÃ¡ch items cho phiáº¿u kho, kiá»ƒm tra tá»“n kho tá»«ng sáº£n pháº©m
    const items = [];

    for (const orderItem of order.orderItems) {
      const product = await Product.findById(orderItem.product);
      if (!product) {
        throw new HttpError({
          title: "product_not_found",
          detail: `Sáº£n pháº©m trong Ä‘Æ¡n hÃ ng khÃ´ng tá»“n táº¡i, id: ${orderItem.product}`,
          code: StatusCodes.NOT_FOUND,
        });
      }

      if (product.quantity < orderItem.quantity) {
        throw new HttpError({
          title: "insufficient_stock",
          detail: `Sáº£n pháº©m ${product.name} khÃ´ng Ä‘á»§ tá»“n kho. Tá»“n kho: ${product.quantity}, YÃªu cáº§u: ${orderItem.quantity}`,
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
        detail: "ÄÆ¡n hÃ ng khÃ´ng cÃ³ sáº£n pháº©m Ä‘á»ƒ táº¡o phiáº¿u kho",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Táº¡o phiáº¿u kho xuáº¥t tá»« Ä‘Æ¡n hÃ ng (type export)
    const voucher = await Stock.create({
      type: "export", // giáº£ sá»­ máº·c Ä‘á»‹nh lÃ  phiáº¿u xuáº¥t kho khi táº¡o tá»« Ä‘Æ¡n hÃ ng
      reason: `Xuáº¥t kho tá»« Ä‘Æ¡n hÃ ng ${order._id}`,
      items,
      notes: `Phiáº¿u kho táº¡o tá»± Ä‘á»™ng tá»« Ä‘Æ¡n hÃ ng ${order._id}`,
      relatedOrder: order._id,
      createdBy: userId,
    });

    // Populate cÃ¡c trÆ°á»ng cáº§n thiáº¿t Ä‘á»ƒ tráº£ vá» client
    await voucher.populate("createdBy", "lastName email");
    await voucher.populate("items.product", "name");

    console.log(
      `ðŸ“‹ ÄÃ£ táº¡o phiáº¿u kho tá»« Ä‘Æ¡n hÃ ng: ${voucher.voucherNumber || voucher._id}`
    );

    jsonOne<IStockVoucherResponse>(res, StatusCodes.CREATED, voucher);
  } catch (error) {
    next(error);
  }
};
