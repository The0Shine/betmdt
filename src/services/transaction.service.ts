import Transaction from "../models/transaction.model";
import Order from "../models/order.model";
import { Stock } from "../models/stock.model";
import type {
  ITransaction,
  CreateTransactionData,
} from "../interfaces/transaction.interface";
import type { Types } from "mongoose";

export class TransactionService {
  /**
   * 🎯 TẠO GIAO DỊCH TỰ ĐỘNG TỪ ĐỠN HÀNG
   * Được gọi khi đơn hàng chuyển sang trạng thái "paid"
   */
  static async createFromOrderPayment(
    orderId: Types.ObjectId,
    orderAmount: number,
    paymentMethod: string,
    createdBy: Types.ObjectId
  ): Promise<ITransaction> {
    try {
      const order = await Order.findById(orderId).populate(
        "user",
        "firstName lastName email"
      );
      if (!order) {
        throw new Error("Không tìm thấy đơn hàng");
      }

      // Type assertion for populated user
      const populatedUser = order.user as any;
      const customerName = populatedUser
        ? `${populatedUser.firstName || ""} ${
            populatedUser.lastName || ""
          }`.trim()
        : "";

      const transaction = new Transaction({
        type: "income",
        category: "order",
        amount: orderAmount,
        description: `Thu tiền đơn hàng #${orderId.toString().slice(-8)}`,
        paymentMethod,
        relatedOrder: orderId,
        relatedCustomer: order.user,
        createdBy,
        transactionDate: new Date(),
        notes: `Thanh toán đơn hàng từ khách hàng ${customerName}`,
        metadata: {
          orderNumber: orderId.toString().slice(-8),
          customerInfo: customerName,
          autoCreated: true,
        },
      });

      await transaction.save();
      console.log(
        `✅ Đã tạo giao dịch thu từ đơn hàng: ${transaction.transactionNumber}`
      );
      return transaction;
    } catch (error) {
      console.error("❌ Lỗi tạo giao dịch từ đơn hàng:", error);
      throw error;
    }
  }

  /**
   * 🎯 TẠO GIAO DỊCH TỰ ĐỘNG TỪ PHIẾU NHẬP KHO
   * Được gọi khi phiếu nhập kho được duyệt
   */
  static async createFromImportVoucher(
    voucherId: Types.ObjectId,
    totalValue: number,
    createdBy: Types.ObjectId
  ): Promise<ITransaction> {
    try {
      const voucher = await Stock.findById(voucherId);
      if (!voucher) {
        throw new Error("Không tìm thấy phiếu kho");
      }

      const transaction = new Transaction({
        type: "expense", // Chi tiền mua hàng
        category: "stock", // Danh mục kho
        amount: totalValue,
        description: `Chi phí nhập kho - ${voucher.voucherNumber}`,
        paymentMethod: "bank_transfer", // Thường chuyển khoản cho nhà cung cấp
        relatedVoucher: voucherId,
        createdBy,
        transactionDate: new Date(),
        notes: voucher.reason,
        metadata: {
          voucherNumber: voucher.voucherNumber,
          voucherType: "import",
          autoCreated: true,
        },
      });

      await transaction.save();
      console.log(
        `✅ Đã tạo giao dịch chi từ phiếu nhập kho: ${transaction.transactionNumber}`
      );
      return transaction;
    } catch (error) {
      console.error("❌ Lỗi tạo giao dịch từ phiếu nhập kho:", error);
      throw error;
    }
  }

  /**
   * 🎯 TẠO GIAO DỊCH TỰ ĐỘNG TỪ PHIẾU XUẤT KHO
   * Được gọi khi phiếu xuất kho được duyệt (ghi nhận giá vốn)
   */
  static async createFromExportVoucher(
    voucherId: Types.ObjectId,
    totalCostValue: number,
    createdBy: Types.ObjectId
  ): Promise<ITransaction> {
    try {
      const voucher = await Stock.findById(voucherId);
      if (!voucher) {
        throw new Error("Không tìm thấy phiếu kho");
      }

      const transaction = new Transaction({
        type: "expense", // Chi phí giá vốn hàng bán
        category: "stock", // Danh mục kho
        amount: totalCostValue,
        description: `Giá vốn hàng bán - ${voucher.voucherNumber}`,
        paymentMethod: "other", // Không phải thanh toán thực tế
        relatedVoucher: voucherId,
        relatedOrder: voucher.relatedOrder,
        createdBy,
        transactionDate: new Date(),
        notes: `Ghi nhận giá vốn khi xuất kho: ${voucher.reason}`,
        metadata: {
          voucherNumber: voucher.voucherNumber,
          voucherType: "export",
          autoCreated: true,
        },
      });

      await transaction.save();
      console.log(
        `✅ Đã tạo giao dịch giá vốn từ phiếu xuất kho: ${transaction.transactionNumber}`
      );
      return transaction;
    } catch (error) {
      console.error("❌ Lỗi tạo giao dịch từ phiếu xuất kho:", error);
      throw error;
    }
  }

  /**
   * 🎯 TẠO GIAO DỊCH THỦ CÔNG
   * Cho phép admin tạo giao dịch thủ công
   */
  static async createManualTransaction(
    data: CreateTransactionData,
    createdBy: Types.ObjectId
  ): Promise<ITransaction> {
    try {
      const transaction = new Transaction({
        ...data,
        createdBy,
        transactionDate: data.transactionDate || new Date(),
        metadata: {
          ...data.metadata,
          autoCreated: false, // Đánh dấu tạo thủ công
        },
      });

      await transaction.save();
      console.log(
        `✅ Đã tạo giao dịch thủ công: ${transaction.transactionNumber}`
      );
      return transaction;
    } catch (error) {
      console.error("❌ Lỗi tạo giao dịch thủ công:", error);
      throw error;
    }
  }

  /**
   * 🎯 TÍNH THỐNG KÊ GIAO DỊCH
   */
  static async getTransactionSummary(startDate?: Date, endDate?: Date) {
    try {
      const matchCondition: any = {};

      if (startDate || endDate) {
        matchCondition.transactionDate = {};
        if (startDate) matchCondition.transactionDate.$gte = startDate;
        if (endDate) matchCondition.transactionDate.$lte = endDate;
      }

      const summary = await Transaction.aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: null,
            totalIncome: {
              $sum: {
                $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
              },
            },
            totalExpense: {
              $sum: {
                $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
              },
            },
            orderIncome: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$type", "income"] },
                      { $eq: ["$category", "order"] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
            stockExpense: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$type", "expense"] },
                      { $eq: ["$category", "stock"] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
            transactionCount: { $sum: 1 },
            incomeCount: {
              $sum: {
                $cond: [{ $eq: ["$type", "income"] }, 1, 0],
              },
            },
            expenseCount: {
              $sum: {
                $cond: [{ $eq: ["$type", "expense"] }, 1, 0],
              },
            },
          },
        },
      ]);

      const result = summary[0] || {
        totalIncome: 0,
        totalExpense: 0,
        orderIncome: 0,
        stockExpense: 0,
        transactionCount: 0,
        incomeCount: 0,
        expenseCount: 0,
      };

      return {
        ...result,
        netAmount: result.totalIncome - result.totalExpense,
        averageTransaction:
          result.transactionCount > 0
            ? (result.totalIncome + result.totalExpense) /
              result.transactionCount
            : 0,
      };
    } catch (error) {
      console.error("❌ Lỗi tính thống kê giao dịch:", error);
      throw error;
    }
  }

  /**
   * 🎯 PHÂN TÍCH THEO DANH MỤC
   */
  static async getCategoryBreakdown(startDate?: Date, endDate?: Date) {
    try {
      const matchCondition: any = {};

      if (startDate || endDate) {
        matchCondition.transactionDate = {};
        if (startDate) matchCondition.transactionDate.$gte = startDate;
        if (endDate) matchCondition.transactionDate.$lte = endDate;
      }

      const breakdown = await Transaction.aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: "$category",
            income: {
              $sum: {
                $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
              },
            },
            expense: {
              $sum: {
                $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            category: "$_id",
            income: 1,
            expense: 1,
            count: 1,
            _id: 0,
          },
        },
        { $sort: { income: -1 } },
      ]);

      return breakdown;
    } catch (error) {
      console.error("❌ Lỗi phân tích danh mục:", error);
      throw error;
    }
  }
}
