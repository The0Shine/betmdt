import express from "express";
import {
  getStockVouchers,
  createStockVoucher,
  getStockVoucherById,
  updateStockVoucher,
  deleteStockVoucher,
  approveStockVoucher,
  rejectStockVoucher,
  cancelStockVoucher,
  getStockHistory,
} from "../controllers/stock.controller";
import { auth } from "../middlewares/auth.middleware";

const router = express.Router();

// IMPORTANT: Specific routes MUST come before parameterized routes
// Stock History Routes - MUST be before /:id routes
router.use(auth);
router.route("/history").get(getStockHistory);

// Stock Vouchers Routes
router.route("/").get(getStockVouchers).post(createStockVoucher);

// Stock Voucher Actions - specific routes before /:id
router.route("/:id/approve").patch(approveStockVoucher);
router.route("/:id/reject").patch(rejectStockVoucher);
router.route("/:id/cancel").patch(cancelStockVoucher);
router.route("/from-order").post(approveStockVoucher);
// Stock Voucher CRUD - parameterized route MUST be last
router
  .route("/:id")
  .get(getStockVoucherById)
  .put(updateStockVoucher)
  .delete(deleteStockVoucher);

export default router;
