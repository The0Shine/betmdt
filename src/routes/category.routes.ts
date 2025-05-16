import express from "express";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";
import { auth, authorize } from "../middlewares/auth.middleware";

const router = express.Router();

router
  .route("/")
  .get(getCategories)
  .post(auth,  createCategory);

router
  .route("/:id")
  .get(getCategoryById)
  .put(auth,  updateCategory)
  .delete(auth,  deleteCategory);

export default router;
