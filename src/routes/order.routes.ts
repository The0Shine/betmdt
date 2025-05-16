import express from "express";
import {
  updateOrderToPaid,
  updateOrderToDelivered,
  getMyOrders,
  getOrders,
  updateOrderStatus,
} from "../controllers/order.controller";
import { auth, authorize } from "../middlewares/auth.middleware";

const router = express.Router();

router.route("/").get(auth, authorize("admin"), getOrders);

router.route("/myorders").get(auth, getMyOrders);

router.route("/:id/pay").put(auth, updateOrderToPaid);

router
  .route("/:id/deliver")
  .put(auth, authorize("admin"), updateOrderToDelivered);

router.route("/:id/status").put(auth, authorize("admin"), updateOrderStatus);

export default router;
