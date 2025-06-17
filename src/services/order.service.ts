import Order from "../models/order.model";
import Product from "../models/product.model";
import { StockVoucherService } from "./stockVoucher.service";
import { TransactionService } from "./transaction.service";
import type { IOrder, IOrderItem } from "../interfaces/order.interface";
import { Types } from "mongoose";

export class OrderService {
  /**
   * 🎯 TẠO ĐƠN HÀNG MỚI
   */
  static async createOrder(orderData: {
    user: string;
    orderItems: IOrderItem[];
    shippingAddress: { address: string; city: string };
    paymentMethod: string;
    totalPrice: number;
  }): Promise<IOrder> {
    try {
      // Kiểm tra tồn kho trước khi tạo đơn
      for (const item of orderData.orderItems) {
        const product = await Product.findById(item.product);
        if (!product) {
          throw new Error(`Không tìm thấy sản phẩm với ID: ${item.product}`);
        }
        if (product.quantity < item.quantity) {
          throw new Error(
            `Không đủ tồn kho cho sản phẩm ${product.name}. Còn lại: ${product.quantity}`
          );
        }
      }

      const order = await Order.create({
        user: orderData.user,
        orderItems: orderData.orderItems,
        shippingAddress: orderData.shippingAddress,
        paymentMethod: orderData.paymentMethod,
        totalPrice: orderData.totalPrice,
        status: "pending",
        isPaid: false,
      });

      console.log(`📝 Đã tạo đơn hàng: ${order._id}`);
      return order;
    } catch (error) {
      console.error("❌ Lỗi tạo đơn hàng:", error);
      throw error;
    }
  }

  /**
   * 🎯 CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG VÀ XỬ LÝ TỰ ĐỘNG
   */
  static async updateOrderStatus(
    orderId: string,
    status: "pending" | "processing" | "cancelled" | "completed" | "refunded",
    updatedBy: string
  ): Promise<IOrder> {
    try {
      const order = await Order.findById(orderId).populate(
        "orderItems.product"
      );
      if (!order) {
        throw new Error("Không tìm thấy đơn hàng");
      }

      const oldStatus = order.status;
      order.status = status;
      await order.save();

      // 🔄 XỬ LÝ TỰ ĐỘNG THEO TRẠNG THÁI
      await this.handleStatusChange(order, oldStatus, status, updatedBy);

      console.log(
        `🔄 Đã cập nhật trạng thái đơn hàng ${orderId}: ${oldStatus} → ${status}`
      );
      return order;
    } catch (error) {
      console.error("❌ Lỗi cập nhật trạng thái đơn hàng:", error);
      throw error;
    }
  }

  /**
   * 🎯 CẬP NHẬT THANH TOÁN - CHỈ UPDATE PAYMENT INFO, KHÔNG THAY ĐỔI STATUS
   */
  static async updatePayment(
    orderId: string,
    paymentResult: {
      id?: string;
      status?: string;
      update_time?: string;
      email_address?: string;
    },
    updatedBy: string
  ): Promise<IOrder> {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error("Không tìm thấy đơn hàng");
      }

      const wasNotPaid = !order.isPaid;

      // CHỈ CẬP NHẬT THÔNG TIN THANH TOÁN, KHÔNG THAY ĐỔI STATUS
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentResult = {
        id: paymentResult.id || "",
        status: paymentResult.status || "PAID",
        update_time: paymentResult.update_time || new Date().toISOString(),
        email_address: paymentResult.email_address || "",
      };

      await order.save();

      // 💰 TẠO GIAO DỊCH THU TIỀN (chỉ lần đầu thanh toán)
      if (wasNotPaid) {
        try {
          const mongoose = require("mongoose");
          await TransactionService.createFromOrderPayment(
            new mongoose.Types.ObjectId(orderId),
            order.totalPrice,
            order.paymentMethod,
            new mongoose.Types.ObjectId(updatedBy)
          );
          console.log(`💰 Đã tạo giao dịch thu cho đơn hàng: ${orderId}`);
        } catch (transactionError) {
          console.error("⚠️ Lỗi tạo giao dịch:", transactionError);
        }
      }

      console.log(
        `💳 Đã cập nhật thanh toán cho đơn hàng: ${orderId}, Status giữ nguyên: ${order.status}`
      );
      return order;
    } catch (error) {
      console.error("❌ Lỗi cập nhật thanh toán:", error);
      throw error;
    }
  }

  /**
   * 🎯 HOÀN TIỀN ĐƠN HÀNG
   */
  static async refundOrder(
    orderId: string,
    refundData: {
      refundReason: string;
      notes?: string;
      createImportVoucher?: boolean;
    }
  ): Promise<IOrder> {
    try {
      const order = await Order.findById(orderId).populate(
        "orderItems.product"
      );
      if (!order) {
        throw new Error("Không tìm thấy đơn hàng");
      }

      // Kiểm tra điều kiện hoàn tiền
      if (order.status === "refunded") {
        throw new Error("Đơn hàng đã được hoàn tiền trước đó");
      }

      if (order.status === "cancelled") {
        throw new Error("Không thể hoàn tiền đơn hàng đã hủy");
      }

      if (!order.isPaid) {
        throw new Error("Không thể hoàn tiền đơn hàng chưa thanh toán");
      }

      const mongoose = require("mongoose");

      // Cập nhật thông tin hoàn tiền
      order.status = "refunded";
      order.refundInfo = {
        refundReason: refundData.refundReason,
        refundDate: new Date(),
        notes: refundData.notes,
      };

      await order.save();

      // 💰 TẠO GIAO DỊCH HOÀN TIỀN
      try {
        const transaction = await TransactionService.createFromOrderRefund(
          new mongoose.Types.ObjectId(orderId),
          new mongoose.Types.ObjectId(order.user), // Pass the user as createdBy
          refundData.refundReason
        );

        // Cập nhật refundTransactionId trong order
        order.refundInfo.refundTransactionId = transaction._id.toString();
        await order.save();

        console.log(`💸 Đã tạo giao dịch hoàn tiền cho đơn hàng: ${orderId}`);
      } catch (transactionError) {
        console.error("⚠️ Lỗi tạo giao dịch hoàn tiền:", transactionError);
      }

      // 📦 TẠO PHIẾU NHẬP KHO (nếu được yêu cầu)
      if (refundData.createImportVoucher && order.orderItems.length > 0) {
        try {
          const importItems = order.orderItems.map((item: any) => ({
            product: item.product._id || item.product,
            productName: item.product.name || item.name,
            quantity: item.quantity,
            unit: item.product.unit || "cái",
            costPrice: item.product.costPrice || item.price,
          }));

          await StockVoucherService.createImportVoucherFromRefund(
            new mongoose.Types.ObjectId(orderId),
            importItems,
            new mongoose.Types.ObjectId(order.user), // Assuming order.user is the creator
            refundData.refundReason
          );
          console.log(
            `📦 Đã tạo phiếu nhập kho hoàn trả cho đơn hàng: ${orderId}`
          );
        } catch (stockError) {
          console.error("⚠️ Lỗi tạo phiếu nhập kho hoàn trả:", stockError);
        }
      }

      console.log(`💸 Đã hoàn tiền đơn hàng: ${orderId}`);
      return order;
    } catch (error) {
      console.error("❌ Lỗi hoàn tiền đơn hàng:", error);
      throw error;
    }
  }

  /**
   * 🎯 XỬ LÝ THAY ĐỔI TRẠNG THÁI TỰ ĐỘNG
   */
  private static async handleStatusChange(
    order: IOrder,
    oldStatus: string,
    newStatus: string,
    updatedBy: string
  ): Promise<void> {
    try {
      // Khi chuyển sang PROCESSING và đã thanh toán
      if (
        newStatus === "processing" &&
        oldStatus !== "processing" &&
        order.isPaid
      ) {
        await TransactionService.createFromOrderPayment(
          new Types.ObjectId(order._id as string),
          order.totalPrice,
          order.paymentMethod,
          new Types.ObjectId(updatedBy)
        );
        console.log(`💰 Đã tạo giao dịch thu cho đơn hàng: ${order._id}`);
      }

      // Khi chuyển sang COMPLETED
      if (newStatus === "completed" && oldStatus !== "completed") {
        const orderItems = order.orderItems.map((item: any) => ({
          product: item.product._id || item.product,
          productName: item.product.name || item.name,
          quantity: item.quantity,
          unit: item.product.unit || "cái",
        }));

        // Ensure order._id and updatedBy are ObjectId
        const mongoose = require("mongoose");
        const orderObjectId =
          typeof order._id === "string"
            ? new mongoose.Types.ObjectId(order._id)
            : order._id;
        const updatedByObjectId =
          typeof updatedBy === "string"
            ? new mongoose.Types.ObjectId(updatedBy)
            : updatedBy;
        await StockVoucherService.createExportVoucherFromOrder(
          orderObjectId,
          orderItems,
          updatedByObjectId
        );
        console.log(`📦 Đã tạo phiếu xuất kho cho đơn hàng: ${order._id}`);
      }
    } catch (error) {
      console.error("⚠️ Lỗi xử lý tự động:", error);
      // Không throw error để không ảnh hưởng đến việc cập nhật trạng thái chính
    }
  }

  /**
   * 🎯 HỦY ĐƠN HÀNG
   */
  static async cancelOrder(orderId: string): Promise<IOrder> {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error("Không tìm thấy đơn hàng");
      }

      if (order.status === "completed") {
        throw new Error("Không thể hủy đơn hàng đã hoàn thành");
      }

      if (order.status === "refunded") {
        throw new Error("Không thể hủy đơn hàng đã hoàn tiền");
      }

      order.status = "cancelled";
      await order.save();

      console.log(`❌ Đã hủy đơn hàng: ${orderId}`);
      return order;
    } catch (error) {
      console.error("❌ Lỗi hủy đơn hàng:", error);
      throw error;
    }
  }

  /**
   * 🎯 LẤY ĐƠN HÀNG THEO ID
   */
  static async getOrderById(orderId: string): Promise<IOrder | null> {
    try {
      const order = await Order.findById(orderId)
        .populate("user", "email lastName")
        .populate("orderItems.product", "name price image")
        .populate({
          path: "user",
          select: "firstName lastName email",
        });

      return order;
    } catch (error) {
      console.error("❌ Lỗi lấy đơn hàng:", error);
      throw error;
    }
  }

  /**
   * 🎯 LẤY DANH SÁCH ĐƠN HÀNG
   */
  static async getOrders(
    filter: any = {},
    options: any = {}
  ): Promise<IOrder[]> {
    try {
      const { page = 1, sort = { createdAt: -1 } } = options;

      const orders = await Order.find(filter)
        .populate("user", "email lastName")
        .populate("orderItems.product", "name price image")
        .populate({
          path: "user",
          select: "firstName lastName email",
        })
        .sort(sort);

      return orders;
    } catch (error) {
      console.error("❌ Lỗi lấy danh sách đơn hàng:", error);
      throw error;
    }
  }

  /**
   * 🎯 LẤY ĐƠN HÀNG CỦA USER
   */
  static async getUserOrders(userId: string): Promise<IOrder[]> {
    try {
      const orders = await Order.find({ user: userId })
        .populate("orderItems.product", "name price image")
        .populate({
          path: "user",
          select: "firstName lastName email",
        })
        .sort({ createdAt: -1 });

      return orders;
    } catch (error) {
      console.error("❌ Lỗi lấy đơn hàng của user:", error);
      throw error;
    }
  }
}
