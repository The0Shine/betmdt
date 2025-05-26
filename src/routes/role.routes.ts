import express from "express";
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
} from "../controllers/role.controller";
import { auth } from "../middlewares/auth.middleware";

const router = express.Router();

// Tất cả routes yêu cầu authentication
router.use(auth);

router.route("/permissions").get(getPermissions);
router.route("/").get(getRoles).post(createRole);
router.route("/:id").get(getRoleById).put(updateRole).delete(deleteRole);

export default router;
