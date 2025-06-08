import express from "express";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  // getCategoryTree,
} from "../controllers/category.controller";
import { auth } from "../middlewares/auth.middleware";

const router = express.Router();

router.route("/").get(getCategories).post(auth, createCategory);

router
  .route("/:id")
  .get(getCategoryById)
  .put(auth, updateCategory)
  .delete(auth, deleteCategory);
export default router;
