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
  createStockVoucherFromOrder,
} from "../controllers/stock.controller";
import { auth } from "../middlewares/auth.middleware";
import {
  loadUser,
  requirePermission,
} from "../middlewares/permission.middleware";

const router = express.Router();

// Stock History Routes - MUST be before /:id routes
router
  .route("/history")
  .get(auth, loadUser, requirePermission("stock.view"), getStockHistory);

// Stock Vouchers Routes
router
  .route("/")
  .get(auth, loadUser, requirePermission("stock.view"), getStockVouchers)
  .post(auth, loadUser, requirePermission("stock.create"), createStockVoucher);

// Stock Voucher Actions - specific routes before /:id
router
  .route("/:id/approve")
  .patch(
    auth,
    loadUser,
    requirePermission("stock.approve"),
    approveStockVoucher
  );

router
  .route("/:id/reject")
  .patch(auth, loadUser, requirePermission("stock.reject"), rejectStockVoucher);

router
  .route("/:id/cancel")
  .patch(auth, loadUser, requirePermission("stock.cancel"), cancelStockVoucher);

router
  .route("/from-order/:id")
  .post(
    auth,
    loadUser,
    requirePermission("stock.create"),
    createStockVoucherFromOrder
  );

// Stock Voucher CRUD - parameterized route MUST be last
router
  .route("/:id")
  .get(auth, loadUser, requirePermission("stock.view"), getStockVoucherById)
  .put(auth, loadUser, requirePermission("stock.edit"), updateStockVoucher)
  .delete(
    auth,
    loadUser,
    requirePermission("stock.delete"),
    deleteStockVoucher
  );

export default router;
