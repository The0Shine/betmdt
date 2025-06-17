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
  resetPassword,
} from "../controllers/user.controller";
import { auth } from "../middlewares/auth.middleware";
import {
  loadUser,
  requirePermission,
} from "../middlewares/permission.middleware";

const router = express.Router();

// Todas las rutas requieren autenticación y rol de admin
router.route("/refresh").post(refreshController);

router
  .route("/")
  .get(auth, loadUser, requirePermission("users.view"), getUsers)
  .post(auth, loadUser, requirePermission("users.create"), createUser);

router.route("/wishlist").get(auth, getWishlist); // Lấy danh sách wishlist của user
router
  .route("/wishlist/:productId")
  .post(auth, addToWishlist) // Thêm sản phẩm vào wishlist
  .delete(auth, removeFromWishlist); // Xóa sản phẩm khỏi wishlist
router
  .route("/:id")
  .get(auth, loadUser, requirePermission("users.view"), getUserById)
  .put(auth, updateUser)
  .delete(auth, loadUser, requirePermission("users.delete"), deleteUser);
router
  .route("/:id/reset-password")
  .post(auth, loadUser, requirePermission("users.edit"), resetPassword);
export default router;
