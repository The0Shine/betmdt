import { Router } from "express";
import {
  getTransactions,
  getTransactionById,
  getTransactionStats,
} from "../controllers/transaction.controller";
import { auth } from "../middlewares/auth.middleware";
import {
  loadUser,
  requirePermission,
} from "../middlewares/permission.middleware";

const router = Router();

// Protected routes
router.get(
  "/stats",
  auth,
  loadUser,
  requirePermission("transactions.stats"),
  getTransactionStats
);

router.get(
  "/",
  auth,
  loadUser,
  requirePermission("transactions.view"),
  getTransactions
);

router.get(
  "/:id",
  auth,
  loadUser,
  requirePermission("transactions.view"),
  getTransactionById
);

export default router;
