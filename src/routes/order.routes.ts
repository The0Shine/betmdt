import express from "express";
import {
  updateOrderToPaid,
  updateOrderToDelivered,
  getMyOrders,
  getOrders,
  updateOrderStatus,
  getOrderById,
  createOrder,
  refundOrder,
  requestRefund,
  approveRefund,
  rejectRefund,
} from "../controllers/order.controller";
import { auth } from "../middlewares/auth.middleware";
import {
  loadUser,
  requirePermission,
} from "../middlewares/permission.middleware";

const router = express.Router();

// Public routes (require auth but not specific permissions)
router.post("/", auth, createOrder);
router.get("/myorders", auth, getMyOrders);
router.get("/:id", auth, getOrderById);
router.post("/:id/request-refund", auth, requestRefund);

// Protected routes
router.get(
  "/",
  auth,
  loadUser,
  requirePermission("orders.view_all"),
  getOrders
);
router.put(
  "/:id/pay",
  auth,
  loadUser,
  requirePermission("orders.update_payment"),
  updateOrderToPaid
);
router.put(
  "/:id/deliver",
  auth,
  loadUser,
  requirePermission("orders.update_delivery"),
  updateOrderToDelivered
);
router.put(
  "/:id/status",
  auth,
  loadUser,
  requirePermission("orders.update_status"),
  updateOrderStatus
);
router.post(
  "/:id/refund",
  auth,
  loadUser,
  requirePermission("orders.update_status"),
  refundOrder
);
router.put(
  "/:id/approve-refund",
  auth,
  loadUser,
  requirePermission("orders.update_status"),
  approveRefund
);
router.put(
  "/:id/reject-refund",
  auth,
  loadUser,
  requirePermission("orders.update_status"),
  rejectRefund
);
export default router;
