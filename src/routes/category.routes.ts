import express from "express";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";
import { auth } from "../middlewares/auth.middleware";
import {
  loadUser,
  requirePermission,
} from "../middlewares/permission.middleware";

const router = express.Router();

// Public routes
router.route("/").get(getCategories);
router.route("/:id").get(getCategoryById);

// Protected routes
router.post(
  "/",
  auth,
  loadUser,
  requirePermission("categories.create"),
  createCategory
);
router.put(
  "/:id",
  auth,
  loadUser,
  requirePermission("categories.edit"),
  updateCategory
);
router.delete(
  "/:id",
  auth,
  loadUser,
  requirePermission("categories.delete"),
  deleteCategory
);

export default router;
