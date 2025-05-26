import express from "express";
import {
  updateOrderToPaid,
  updateOrderToDelivered,
  getMyOrders,
  getOrders,
  updateOrderStatus,
  getOrderById,
} from "../controllers/order.controller";
import { auth } from "../middlewares/auth.middleware";

const router = express.Router();

router.route("/").get(auth, getOrders);

router.route("/myorders").get(auth, getMyOrders);

router.route("/:id/pay").put(auth, updateOrderToPaid);

router.route("/:id/deliver").put(auth, updateOrderToDelivered);

router.route("/:id/status").put(auth, updateOrderStatus);
router.route("/:id").get(auth, getOrderById);
export default router;
