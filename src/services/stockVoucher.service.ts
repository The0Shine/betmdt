import Product from "../models/product.model";
import { Stock, StockHistory } from "../models/stock.model";
import { TransactionService } from "./transaction.service";
import type { IStockVoucher, IStockItem } from "../interfaces/stock.interface";
import type { Types } from "mongoose";

export class StockVoucherService {
  /**
   * 🎯 TẠO PHIẾU XUẤT KHO TỰ ĐỘNG TỪ ĐƠN HÀNG
   */
  static async createExportVoucherFromOrder(
    orderId: Types.ObjectId,
    orderItems: Array<{
      product: Types.ObjectId;
      productName: string;
      quantity: number;
      unit: string;
    }>,
    createdBy: Types.ObjectId
  ): Promise<IStockVoucher> {
    try {
      const voucherItems: IStockItem[] = orderItems.map((item) => ({
        product: item.product,
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        costPrice: 0, // Sẽ được cập nhật từ database
        note: `Xuất kho cho đơn hàng #${orderId.toString().slice(-8)}`,
      }));

      // Lấy giá vốn từ database
      for (const item of voucherItems) {
        const product = await Product.findById(item.product);
        if (product) {
          item.costPrice = product.costPrice || 0;
        }
      }

      const voucher = new Stock({
        type: "export",
        status: "pending",
        reason: `Xuất kho tự động cho đơn hàng #${orderId
          .toString()
          .slice(-8)}`,
        items: voucherItems,
        createdBy,
        relatedOrder: orderId,
        notes: "Phiếu xuất kho được tạo tự động khi đơn hàng hoàn thành",
      });

      await voucher.save();
      console.log(`📋 Đã tạo phiếu xuất kho: ${voucher.voucherNumber}`);
      return voucher;
    } catch (error) {
      console.error("❌ Lỗi tạo phiếu xuất kho từ đơn hàng:", error);
      throw error;
    }
  }

  /**
   * 🎯 TẠO PHIẾU NHẬP KHO TỰ ĐỘNG TỪ HOÀN TIỀN
   */
  static async createImportVoucherFromRefund(
    orderId: Types.ObjectId,
    orderItems: Array<{
      product: Types.ObjectId;
      productName: string;
      quantity: number;
      unit: string;
      costPrice: number;
    }>,
    createdBy: Types.ObjectId,
    refundReason: string
  ): Promise<IStockVoucher> {
    try {
      const voucherItems: IStockItem[] = orderItems.map((item) => ({
        product: item.product,
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        costPrice: item.costPrice,
        note: `Nhập kho hoàn trả từ đơn hàng #${orderId.toString().slice(-8)}`,
      }));

      const voucher = new Stock({
        type: "import",
        status: "pending",
        reason: `Nhập kho hoàn trả từ đơn hàng #${orderId
          .toString()
          .slice(-8)} - ${refundReason}`,
        items: voucherItems,
        createdBy,
        relatedOrder: orderId,
        notes: `Phiếu nhập kho được tạo tự động khi hoàn tiền đơn hàng. Lý do hoàn tiền: ${refundReason}`,
      });

      await voucher.save();
      console.log(
        `📋 Đã tạo phiếu nhập kho hoàn trả: ${voucher.voucherNumber}`
      );
      return voucher;
    } catch (error) {
      console.error("❌ Lỗi tạo phiếu nhập kho hoàn trả:", error);
      throw error;
    }
  }

  /**
   * 🎯 PHÊ DUYỆT PHIẾU KHO VÀ TẠO GIAO DỊCH TỰ ĐỘNG
   */
  static async approveVoucher(
    voucherId: Types.ObjectId,
    approvedBy: Types.ObjectId
  ): Promise<IStockVoucher> {
    try {
      const voucher = await Stock.findById(voucherId).populate("items.product");
      if (!voucher) {
        throw new Error("Không tìm thấy phiếu kho");
      }

      if (voucher.status !== "pending") {
        throw new Error("Chỉ có thể phê duyệt phiếu kho đang chờ duyệt");
      }

      console.log(
        `🔍 Phê duyệt phiếu ${voucher.type}: ${voucher.voucherNumber}`
      );

      // Kiểm tra tồn kho cho phiếu xuất
      if (voucher.type === "export") {
        for (const item of voucher.items) {
          const product = await Product.findById(item.product);
          if (!product) {
            throw new Error(`Không tìm thấy sản phẩm ${item.productName}`);
          }
          if (product.quantity < item.quantity) {
            throw new Error(
              `Không đủ tồn kho cho sản phẩm ${item.productName}. Tồn kho: ${product.quantity}, yêu cầu: ${item.quantity}`
            );
          }
        }
      }

      // Cập nhật tồn kho và tạo lịch sử
      for (const item of voucher.items) {
        const product = await Product.findById(item.product);
        if (!product) continue;

        const quantityBefore = product.quantity;
        const quantityChange =
          voucher.type === "import" ? item.quantity : -item.quantity;
        const quantityAfter = quantityBefore + quantityChange;

        // Cập nhật tồn kho
        product.quantity = quantityAfter;
        await product.save();

        // Tạo lịch sử
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
          createdBy: approvedBy,
          notes: item.note,
        });

        console.log(
          `📊 Cập nhật tồn kho ${item.productName}: ${quantityBefore} → ${quantityAfter}`
        );
      }

      // Cập nhật trạng thái phiếu
      voucher.status = "approved";
      voucher.approvedBy = approvedBy;
      voucher.approvedAt = new Date();
      await voucher.save();

      // 💰 TẠO GIAO DỊCH TÀI CHÍNH TỰ ĐỘNG
      try {
        if (voucher.type === "import") {
          console.log(`💸 Tạo giao dịch chi cho phiếu nhập kho...`);
          await TransactionService.createFromImportVoucher(
            voucher._id,
            voucher.totalValue,
            approvedBy
          );
        } else if (voucher.type === "export") {
          console.log(`📈 Tạo giao dịch giá vốn cho phiếu xuất kho...`);
          const totalCostValue = voucher.items.reduce((total, item) => {
            return total + item.costPrice * item.quantity;
          }, 0);

          await TransactionService.createFromExportVoucher(
            voucher._id,
            totalCostValue,
            approvedBy
          );
        }
      } catch (transactionError) {
        console.error(
          "⚠️ Lỗi tạo giao dịch (không ảnh hưởng phê duyệt phiếu):",
          transactionError
        );
      }

      console.log(`✅ Đã phê duyệt phiếu kho: ${voucher.voucherNumber}`);
      return voucher;
    } catch (error) {
      console.error("❌ Lỗi phê duyệt phiếu kho:", error);
      throw error;
    }
  }

  // Các methods khác giữ nguyên...
  static async rejectVoucher(
    voucherId: Types.ObjectId,
    rejectedBy: Types.ObjectId,
    rejectionReason: string
  ): Promise<IStockVoucher> {
    try {
      const voucher = await Stock.findById(voucherId);
      if (!voucher) {
        throw new Error("Không tìm thấy phiếu kho");
      }

      if (voucher.status !== "pending") {
        throw new Error("Chỉ có thể từ chối phiếu kho đang chờ duyệt");
      }

      voucher.status = "rejected";
      voucher.rejectedBy = rejectedBy;
      voucher.rejectedAt = new Date();
      voucher.rejectionReason = rejectionReason;
      await voucher.save();

      return voucher;
    } catch (error) {
      console.error("❌ Lỗi từ chối phiếu kho:", error);
      throw error;
    }
  }
}
