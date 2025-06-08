import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  refreshController,
} from "../controllers/user.controller";
import { auth } from "../middlewares/auth.middleware";

const router = express.Router();

// Todas las rutas requieren autenticación y rol de admin
router.route("/refresh").post(refreshController);

router.route("/").get(getUsers).post(createUser);

router.route("/:id").get(getUserById).put(updateUser).delete(deleteUser);

export default router;
