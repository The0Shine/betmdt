import { Router } from "express";
import {
  getCart,
  addItemToCart,
  updateCartItemQuantity,
  deleteCartItem,
  clearCart,
} from "../controllers/cart.controller";
import { auth } from "../middlewares/auth.middleware";

const router = Router();

// Tất cả các routes đều yêu cầu xác thực
router.use(auth);

router.route("/").get(getCart).post(addItemToCart).delete(clearCart);

router.route("/:itemId").put(updateCartItemQuantity).delete(deleteCartItem);

export default router;
