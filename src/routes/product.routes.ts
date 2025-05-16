import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { auth } from "../middlewares/auth.middleware";

const router = express.Router();

router.route("/").get(getProducts).post(auth, createProduct);

router
  .route("/:id")
  .get(getProductById)
  .put(auth, updateProduct)
  .delete(auth, deleteProduct);

export default router;
