import express from "express";
import {
  createPayment,
  handleVNPayIPN,
  handleVNPayReturn,
  getPaymentStatus,
} from "../controllers/payment.controller";
import { auth } from "../middlewares/auth.middleware";

const router = express.Router();

// Tạo thanh toán
router.post("/create", auth, createPayment);

// VNPay callbacks (public routes)
router.get("/vnpay-ipn", handleVNPayIPN);
router.get("/vnpay-return", handleVNPayReturn);

// Lấy trạng thái thanh toán
router.get("/status/:orderId", auth, getPaymentStatus);

export default router;
