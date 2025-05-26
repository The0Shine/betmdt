import express from "express";

import { auth } from "../middlewares/auth.middleware";
import { loadUser, requireAdmin } from "../middlewares/permission.middleware";
import {
  getDashboardOverview,
  getRevenueChart,
  getProductStats,
  getInventoryStats,
} from "../controllers/dashboard.controller";

const router = express.Router();

// Tất cả routes yêu cầu authentication và admin permission
router.use(auth);

// Dashboard routes
router.get("/overview", getDashboardOverview);
router.get("/revenue-chart", getRevenueChart);
router.get("/product-stats", getProductStats);
router.get("/inventory-stats", getInventoryStats);

export default router;
