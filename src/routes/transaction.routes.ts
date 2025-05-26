import { Router } from "express";
import {
  getTransactions,
  getTransactionById,
  getTransactionStats,
} from "../controllers/transaction.controller";
import { auth } from "../middlewares/auth.middleware";

const router = Router();

// Tất cả routes đều cần authentication
router.use(auth);

// @route   GET /api/transactions/stats
// @desc    Lấy thống kê giao dịch
// @access  Private
router.get("/stats", getTransactionStats);

// @route   GET /api/transactions
// @desc    Lấy danh sách giao dịch (CHỈ XEM)
// @access  Private
router.get("/", getTransactions);

// @route   GET /api/transactions/:id
// @desc    Lấy chi tiết giao dịch
// @access  Private
router.get("/:id", getTransactionById);

// ⚠️ KHÔNG CÓ ENDPOINT TẠO/SỬA/XÓA GIAO DỊCH THỦ CÔNG
// Tất cả giao dịch đều tự động

export default router;
