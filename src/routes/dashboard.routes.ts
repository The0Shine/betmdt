import express from "express";
import { auth } from "../middlewares/auth.middleware";
import {
  loadUser,
  requirePermission,
} from "../middlewares/permission.middleware";
import {
  getDashboardOverview,
  getRevenueChart,
  getProductStats,
  getInventoryStats,
} from "../controllers/dashboard.controller";

const router = express.Router();

// Protected routes
router.get(
  "/overview",
  auth,
  loadUser,
  requirePermission("admin.all"),
  getDashboardOverview
);

router.get(
  "/revenue-chart",
  auth,
  loadUser,
  requirePermission("admin.all"),
  getRevenueChart
);

router.get(
  "/product-stats",
  auth,
  loadUser,
  requirePermission("admin.all"),
  getProductStats
);

router.get(
  "/inventory-stats",
  auth,
  loadUser,
  requirePermission("admin.all"),
  getInventoryStats
);

export default router;
