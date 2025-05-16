import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Product from "../models/product.model";
import { asyncHandler } from "../middlewares/async.middleware";
import { ErrorResponse } from "../utils/errorResponse";
import { jsonOne } from "../utils/general";
import { createPageOptions, createSearchCondition } from "../utils/pagination";
import StockAdjustment from "../models/stock.model";

// @desc    Lấy tất cả điều chỉnh kho
// @route   GET /api/stock-adjustments
// @access  Private/Admin
export const getStockAdjustments = asyncHandler(
  async (req: Request, res: Response) => {
    const filter: any = {};

    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate)
        filter.date.$gte = new Date(req.query.startDate as string);
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate as string);
        endDate.setHours(23, 59, 59, 999);
        filter.date.$lte = endDate;
      }
    }

    const { page, limit, search } = createPageOptions(req);
    Object.assign(filter, createSearchCondition(search, StockAdjustment));
    const skip = (page - 1) * limit;

    let sort: any = { createdAt: -1 };
    if (req.query.sort) {
      const [field, order] = (req.query.sort as string).split(",");
      sort = { [field]: order === "asc" ? 1 : -1 };
    }

    const [adjustments, total] = await Promise.all([
      StockAdjustment.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name"),
      StockAdjustment.countDocuments(filter),
    ]);

    return res.status(StatusCodes.OK).json({
      success: true,
      count: adjustments.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: adjustments,
    });
  }
);

// @desc    Lấy điều chỉnh kho theo ID
// @route   GET /api/stock-adjustments/:id
// @access  Private/Admin
export const getStockAdjustmentById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const adjustment = await StockAdjustment.findById(req.params.id).populate(
      "createdBy",
      "name"
    );

    if (!adjustment) {
      return next(
        new ErrorResponse(
          `Không tìm thấy điều chỉnh kho với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    return jsonOne(res, StatusCodes.OK, adjustment);
  }
);

// @desc    Tạo điều chỉnh kho mới
// @route   POST /api/stock-adjustments
// @access  Private/Admin
export const createStockAdjustment = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { type, reason, products, status } = req.body;

    const [adjustment] = await StockAdjustment.create([
      {
        type,
        reason,
        products,
        status,
        createdBy: req.user?._id,
      },
    ]);

    if (status === "completed") {
      await updateProductStock(products, type);
    }

    return jsonOne(res, StatusCodes.CREATED, adjustment);
  }
);

// @desc    Cập nhật điều chỉnh kho
// @route   PUT /api/stock-adjustments/:id
// @access  Private/Admin
export const updateStockAdjustment = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const adjustment = await StockAdjustment.findById(req.params.id);

    if (!adjustment) {
      return next(
        new ErrorResponse(
          `Không tìm thấy điều chỉnh kho với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    const oldStatus = adjustment.status;
    const newStatus = req.body.status;

    const updated = await StockAdjustment.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (oldStatus === "draft" && newStatus === "completed") {
      await updateProductStock(req.body.products, req.body.type);
    }

    return jsonOne(res, StatusCodes.OK, updated);
  }
);

// @desc    Xóa điều chỉnh kho
// @route   DELETE /api/stock-adjustments/:id
// @access  Private/Admin
export const deleteStockAdjustment = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const adjustment = await StockAdjustment.findById(req.params.id);

    if (!adjustment) {
      return next(
        new ErrorResponse(
          `Không tìm thấy điều chỉnh kho với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    if (adjustment.status === "completed") {
      return next(
        new ErrorResponse(
          `Không thể xóa điều chỉnh kho đã hoàn thành`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    await adjustment.deleteOne();
    return res.status(StatusCodes.OK).json({ success: true, data: {} });
  }
);

// @desc    Cập nhật trạng thái điều chỉnh kho
// @route   PATCH /api/stock-adjustments/:id/status
// @access  Private/Admin
export const updateStockAdjustmentStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status } = req.body;

    if (!status || !["draft", "completed"].includes(status)) {
      return next(
        new ErrorResponse(`Trạng thái không hợp lệ`, StatusCodes.BAD_REQUEST)
      );
    }

    const adjustment = await StockAdjustment.findById(req.params.id);

    if (!adjustment) {
      return next(
        new ErrorResponse(
          `Không tìm thấy điều chỉnh kho với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    const oldStatus = adjustment.status;
    adjustment.status = status;
    await adjustment.save();

    if (oldStatus === "draft" && status === "completed") {
      await updateProductStock(adjustment.products, adjustment.type);
    }

    return jsonOne(res, StatusCodes.OK, adjustment);
  }
);

// ❗ Hỗ trợ cập nhật tồn kho sản phẩm (phiên bản không dùng session)
async function updateProductStock(products: any[], type: string) {
  for (const item of products) {
    const product = await Product.findById(item.productId);

    if (!product) {
      throw new ErrorResponse(
        `Không tìm thấy sản phẩm với id ${item.productId}`,
        StatusCodes.NOT_FOUND
      );
    }

    let newStock = product.stock;

    if (type === "import") {
      newStock += item.quantity;
    } else if (type === "export") {
      newStock = Math.max(0, newStock - item.quantity);
    } else if (type === "adjustment") {
      newStock = Math.max(0, newStock + item.quantity);
    }

    product.stock = newStock;
    await product.save();
  }
}
