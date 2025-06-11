import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  refreshController,
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "../controllers/user.controller";
import { auth } from "../middlewares/auth.middleware";

const router = express.Router();

// Todas las rutas requieren autenticación y rol de admin
router.route("/refresh").post(refreshController);

router.route("/").get(getUsers).post(createUser);

router.route("/wishlist").get(auth, getWishlist); // Lấy danh sách wishlist của user
router
  .route("/wishlist/:productId")
  .post(auth, addToWishlist) // Thêm sản phẩm vào wishlist
  .delete(auth, removeFromWishlist); // Xóa sản phẩm khỏi wishlist
router.route("/:id").get(getUserById).put(updateUser).delete(deleteUser);
export default router;
