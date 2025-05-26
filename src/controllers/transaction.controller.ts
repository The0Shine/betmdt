import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Transaction from "../models/transaction.model";
import { TransactionService } from "../services/transaction.service";
import HttpError from "../utils/httpError";
import { jsonOne } from "../utils/general";
import { createPageOptions } from "../utils/pagination";
import mongoose from "mongoose";

// @desc    Lấy danh sách giao dịch (CHỈ XEM - KHÔNG TẠO THỦ CÔNG)
// @route   GET /api/transactions
// @access  Private
export const getTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filter: any = {};

    // Lọc theo loại giao dịch
    if (req.query.type) filter.type = req.query.type;

    // Lọc theo danh mục
    if (req.query.category) filter.category = req.query.category;

    // Lọc theo phương thức thanh toán
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

    // Lọc theo người tạo
    if (req.query.createdBy) filter.createdBy = req.query.createdBy;

    // Lọc theo giao dịch tự động/thủ công
    if (req.query.autoCreated !== undefined) {
      filter["metadata.autoCreated"] = req.query.autoCreated === "true";
    }

    // Lọc theo số tiền
    if (req.query.minAmount || req.query.maxAmount) {
      filter.amount = {};
      if (req.query.minAmount) filter.amount.$gte = Number(req.query.minAmount);
      if (req.query.maxAmount) filter.amount.$lte = Number(req.query.maxAmount);
    }

    // Lọc theo ngày
    if (req.query.startDate || req.query.endDate) {
      filter.transactionDate = {};
      if (req.query.startDate)
        filter.transactionDate.$gte = new Date(req.query.startDate as string);
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate as string);
        endDate.setHours(23, 59, 59, 999);
        filter.transactionDate.$lte = endDate;
      }
    }

    const { page, limit, search } = createPageOptions(req);

    // Tìm kiếm theo mã giao dịch hoặc mô tả
    if (search) {
      filter.$or = [
        { transactionNumber: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    const skip = (page - 1) * limit;

    let sort: any = { transactionDate: -1, createdAt: -1 };
    if (req.query.sort) {
      const [field, order] = (req.query.sort as string).split(",");
      sort = { [field]: order === "asc" ? 1 : -1 };
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email")
        .populate("relatedOrder", "orderNumber totalAmount")
        .populate("relatedVoucher", "voucherNumber type")
        .populate("relatedCustomer", "name email phone"),
      Transaction.countDocuments(filter),
    ]);

    // Tính tổng kết cho khoảng thời gian được lọc
    const summary = await TransactionService.getTransactionSummary(
      req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      req.query.endDate ? new Date(req.query.endDate as string) : undefined
    );

    res.status(StatusCodes.OK).json({
      success: true,
      count: transactions.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy chi tiết giao dịch
// @route   GET /api/transactions/:id
// @access  Private
export const getTransactionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError({
        title: "invalid_id",
        detail: `Invalid transaction ID: ${id}`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const transaction = await Transaction.findById(id)
      .populate("createdBy", "name email")
      .populate(
        "relatedOrder",
        "orderNumber totalAmount customer shippingAddress"
      )
      .populate("relatedVoucher", "voucherNumber type reason items")
      .populate("relatedCustomer", "name email phone address");

    if (!transaction) {
      throw new HttpError({
        title: "transaction_not_found",
        detail: `Transaction not found with id of ${id}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    jsonOne(res, StatusCodes.OK, transaction);
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy thống kê giao dịch
// @route   GET /api/transactions/stats
// @access  Private
export const getTransactionStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay()
    );
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);

    const [
      todayStats,
      weekStats,
      monthStats,
      yearStats,
      recentTransactions,
      categoryBreakdown,
    ] = await Promise.all([
      TransactionService.getTransactionSummary(today),
      TransactionService.getTransactionSummary(thisWeek),
      TransactionService.getTransactionSummary(thisMonth),
      TransactionService.getTransactionSummary(thisYear),
      Transaction.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("createdBy", "name")
        .populate("relatedOrder", "orderNumber")
        .populate("relatedVoucher", "voucherNumber"),
      TransactionService.getCategoryBreakdown(thisMonth),
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        today: todayStats,
        thisWeek: weekStats,
        thisMonth: monthStats,
        thisYear: yearStats,
        recentTransactions,
        categoryBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ⚠️ BỎ CÁC ENDPOINT TẠO/SỬA/XÓA GIAO DỊCH THỦ CÔNG
// Tất cả giao dịch đều được tạo tự động từ order và stock voucher
