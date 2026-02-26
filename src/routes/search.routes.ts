import express from "express";
import {
  searchProducts,
  autocomplete,
  reindexProducts,
} from "../controllers/search.controller";
import { auth } from "../middlewares/auth.middleware";
import {
  loadUser,
  requirePermission,
} from "../middlewares/permission.middleware";

const router = express.Router();

// Public routes
router.get("/", searchProducts);
router.get("/autocomplete", autocomplete);

// Admin routes
router.post(
  "/reindex",
  auth,
  loadUser,
  requirePermission("search.reindex"),
  reindexProducts
);

export default router;
