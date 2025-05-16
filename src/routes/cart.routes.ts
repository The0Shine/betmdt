import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/cart.controller";

const router = express.Router();

// Áp dụng middleware bảo vệ cho tất cả các route

// Các route giỏ hàng
router.route("/").get(getCart).post(addToCart).delete(clearCart);

router.route("/:itemId").put(updateCartItem).delete(removeCartItem);

export default router;
