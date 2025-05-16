import express from "express";

import {
  getStockAdjustments,
  createStockAdjustment,
  getStockAdjustmentById,
  updateStockAdjustment,
  deleteStockAdjustment,
  updateStockAdjustmentStatus,
} from "../controllers/stock.controller";

const router = express.Router();

router.route("/").get(getStockAdjustments).post(createStockAdjustment);

router
  .route("/:id")
  .get(getStockAdjustmentById)
  .put(updateStockAdjustment)
  .delete(deleteStockAdjustment);

router.route("/:id/status").patch(updateStockAdjustmentStatus);

export default router;
