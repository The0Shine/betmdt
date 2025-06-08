import { VNPayService } from "./vnpay.service";
import Order from "../models/order.model";

export interface CreatePaymentRequest {
  orderData: {
    user: string;
    orderItems: any[];
    shippingAddress: any;
    paymentMethod: string;
    totalPrice: number;
    customerInfo?: any;
    note?: string;
  };
  paymentMethod: "vnpay" | "cod";
  ipAddr: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  message: string;
  paymentId?: string;
  orderId?: string;
  paymentMethod: string;
}

// Lưu trữ tạm thời orderData
const pendingOrders = new Map<string, any>();

export class PaymentService {
  /**
   * Tạo thanh toán
   */
  static async createPayment(
    params: CreatePaymentRequest
  ): Promise<PaymentResponse> {
    try {
      const { orderData, paymentMethod, ipAddr } = params;

      if (paymentMethod === "cod") {
        const order = new Order({
          ...orderData,
          isPaid: false,
          status: "pending",
          paymentResult: {
            id: "COD",
            status: "PENDING",
            update_time: new Date().toISOString(),
            email_address: orderData.customerInfo?.email || "",
          },
        });

        await order.save();
        console.log(`📦 COD Order created: ${order._id}`);

        return {
          success: true,
          message: "Đơn hàng COD đã được tạo thành công",
          orderId: order._id.toString(),
          paymentMethod: "cod",
        };
      }

      if (paymentMethod === "vnpay") {
        const paymentId = `VNPAY_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Lưu orderData vào memory
        pendingOrders.set(paymentId, {
          ...orderData,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 phút
        });

        const orderInfo = `Thanh toan don hang ${paymentId}`;

        console.log(`💳 VNPay payment created: ${paymentId}`);
        console.log(`📝 OrderData stored in memory for: ${paymentId}`);
        console.log(`📋 Total pending orders: ${pendingOrders.size}`);

        const paymentUrl = VNPayService.createPaymentUrl({
          orderId: paymentId,
          amount: orderData.totalPrice,
          orderInfo: orderInfo,
          ipAddr,
        });

        return {
          success: true,
          paymentUrl,
          message: "Đã tạo URL thanh toán VNPay thành công",
          paymentId,
          paymentMethod: "vnpay",
        };
      }

      throw new Error("Phương thức thanh toán không được hỗ trợ");
    } catch (error) {
      console.error("❌ Error creating payment:", error);
      throw error;
    }
  }

  /**
   * Xử lý IPN callback từ VNPay - SỬA LẠI
   */
  static async handleVNPayIPN(vnp_Params: Record<string, string>): Promise<{
    RspCode: string;
    Message: string;
  }> {
    try {
      console.log("🔔 VNPay IPN received:", vnp_Params);

      const verification = VNPayService.verifyIpnCall(vnp_Params);

      if (!verification.isValid) {
        console.error(
          "❌ VNPay IPN verification failed:",
          verification.message
        );
        return {
          RspCode: "97",
          Message: "Invalid signature",
        };
      }

      const {
        orderId: paymentId,
        isSuccess,
        transactionNo,
        payDate,
      } = verification.data!;

      console.log(`🔍 Processing IPN for paymentId: ${paymentId}`);
      console.log(`💰 Payment success: ${isSuccess}`);
      console.log(`🏦 Transaction: ${transactionNo}`);

      if (isSuccess) {
        try {
          // Lấy orderData từ memory
          const orderData = pendingOrders.get(paymentId);

          if (!orderData) {
            console.error(`❌ OrderData not found for paymentId: ${paymentId}`);
            console.log(
              `📋 Available paymentIds:`,
              Array.from(pendingOrders.keys())
            );
            return {
              RspCode: "01",
              Message: "Order data not found",
            };
          }
          console.log(111111111);

          console.log(orderData);

          console.log(`✅ Found orderData for: ${paymentId}`);
          console.log(`💵 Order amount: ${orderData.totalPrice}`);

          // Kiểm tra order đã tồn tại chưa
          const existingOrder = await Order.findOne({
            "paymentResult.id": transactionNo,
          });

          if (existingOrder) {
            console.log(
              `⚠️ Order already exists for transaction: ${transactionNo}`
            );
            pendingOrders.delete(paymentId); // Cleanup
            return {
              RspCode: "02",
              Message: "Order already confirmed",
            };
          }

          // TẠO ORDER VỚI isPaid: true
          const order = new Order({
            ...orderData,
            isPaid: true,
            paidAt: new Date(),
            status: "pending",
            paymentResult: {
              id: transactionNo,
              status: "PAID",
              update_time: payDate,
              email_address: orderData.customerInfo?.email || "",
            },
          });

          await order.save();

          // Xóa orderData khỏi memory
          pendingOrders.delete(paymentId);

          console.log(`✅ VNPay Order created successfully: ${order._id}`);
          console.log(`🗑️ Cleaned up paymentId: ${paymentId}`);
          console.log(`📋 Remaining pending orders: ${pendingOrders.size}`);

          return {
            RspCode: "00",
            Message: "Confirm Success",
          };
        } catch (error) {
          console.error("❌ Error creating order from IPN:", error);
          return {
            RspCode: "99",
            Message: "Error creating order",
          };
        }
      } else {
        // Thanh toán thất bại
        pendingOrders.delete(paymentId);
        console.log(`❌ VNPay payment failed (PaymentId: ${paymentId})`);
        return {
          RspCode: "00",
          Message: "Confirm Success",
        };
      }
    } catch (error) {
      console.error("❌ Error handling VNPay IPN:", error);
      return {
        RspCode: "99",
        Message: "Unknown error",
      };
    }
  }

  /**
   * Xử lý return URL từ VNPay
   */
  static async handleVNPayReturn(vnp_Params: Record<string, string>): Promise<{
    success: boolean;
    message: string;
    paymentId?: string;
    orderId?: string;
    redirectUrl: string;
  }> {
    try {
      console.log("🔄 VNPay return received:", vnp_Params);

      const verification = VNPayService.verifyReturnUrl(vnp_Params);

      if (!verification.isValid) {
        return {
          success: false,
          message: verification.message,
          redirectUrl: "/checkout/failed",
        };
      }

      const {
        orderId: paymentId,
        isSuccess,
        transactionNo,
        payDate,
      } = verification.data!;

      console.log(`🔍 Processing return for paymentId: ${paymentId}`);
      console.log(`💰 Payment success: ${isSuccess}`);

      if (isSuccess) {
        // Đợi một chút để IPN xử lý trước
        console.log("⏳ Waiting for IPN to process...");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Kiểm tra order đã được tạo từ IPN chưa
        let order = await Order.findOne({
          "paymentResult.id": transactionNo,
        });

        if (order) {
          console.log(`📦 Order found from IPN: ${order._id}`);
          return {
            success: true,
            message: "Thanh toán thành công",
            paymentId,
            orderId: order._id.toString(),
            redirectUrl: `/checkout/success?orderId=${order._id}`,
          };
        }

        // Nếu IPN chưa xử lý, tạo order từ return URL
        console.log(`🔄 IPN chưa xử lý, tạo order từ return URL`);

        const orderData = pendingOrders.get(paymentId);
        if (orderData) {
          order = new Order({
            ...orderData,
            isPaid: true,
            paidAt: new Date(),
            status: "pending",
            paymentResult: {
              id: transactionNo,
              status: "PAID",
              update_time: payDate,
              email_address: orderData.customerInfo?.email || "",
            },
          });

          await order.save();
          pendingOrders.delete(paymentId);

          console.log(`✅ Order created from return URL: ${order._id}`);

          return {
            success: true,
            message: "Thanh toán thành công",
            paymentId,
            orderId: order._id.toString(),
            redirectUrl: `/checkout/success?orderId=${order._id}`,
          };
        } else {
          console.error(`❌ OrderData not found for paymentId: ${paymentId}`);
          return {
            success: false,
            message: "Không tìm thấy thông tin đơn hàng",
            paymentId,
            redirectUrl: "/checkout/failed",
          };
        }
      } else {
        return {
          success: false,
          message: verification.message || "Thanh toán thất bại",
          paymentId,
          redirectUrl: `/checkout/failed?paymentId=${paymentId}`,
        };
      }
    } catch (error) {
      console.error("❌ Error handling VNPay return:", error);
      return {
        success: false,
        message: "Có lỗi xảy ra khi xử lý kết quả thanh toán",
        redirectUrl: "/checkout/failed",
      };
    }
  }

  /**
   * Lấy order theo paymentId
   */
  static async getOrderByPaymentId(paymentId: string): Promise<any> {
    try {
      // Thử tìm order đã được tạo
      const order = await Order.findOne({
        $or: [
          { "paymentResult.id": { $regex: paymentId } },
          { "paymentResult.id": paymentId },
        ],
      });

      if (order) {
        return {
          success: true,
          orderId: order._id.toString(),
          order,
        };
      }

      // Nếu chưa có order, kiểm tra orderData trong memory
      const orderData = pendingOrders.get(paymentId);
      if (orderData) {
        return {
          success: false,
          message: "Đang xử lý thanh toán...",
          orderData,
        };
      }

      return {
        success: false,
        message: "Không tìm thấy thông tin thanh toán",
      };
    } catch (error) {
      console.error("❌ Error getting order by paymentId:", error);
      throw error;
    }
  }

  /**
   * Debug: Xem pending orders
   */
  static getPendingOrders() {
    console.log("📋 Current pending orders:");
    for (const [paymentId, orderData] of pendingOrders.entries()) {
      console.log(
        `  - ${paymentId}: ${orderData.totalPrice} VND (expires: ${orderData.expiresAt})`
      );
    }
    return Array.from(pendingOrders.keys());
  }

  /**
   * Cleanup expired orders
   */
  static cleanupExpiredOrders() {
    const now = new Date();
    let cleaned = 0;

    for (const [paymentId, orderData] of pendingOrders.entries()) {
      if (orderData.expiresAt < now) {
        pendingOrders.delete(paymentId);
        cleaned++;
        console.log(`🗑️ Cleaned up expired order: ${paymentId}`);
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired orders`);
    }
  }
}

// Cleanup mỗi 5 phút
setInterval(() => {
  PaymentService.cleanupExpiredOrders();
}, 5 * 60 * 1000);
