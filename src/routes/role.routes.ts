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
import {
  loadUser,
  requirePermission,
} from "../middlewares/permission.middleware";

const router = express.Router();

// Protected routes
router
  .route("/permissions")
  .get(auth, loadUser, requirePermission("roles.view"), getPermissions);

router
  .route("/")
  .get(auth, loadUser, requirePermission("roles.view"), getRoles)
  .post(auth, loadUser, requirePermission("roles.create"), createRole);

router
  .route("/:id")
  .get(auth, loadUser, requirePermission("roles.view"), getRoleById)
  .put(auth, loadUser, requirePermission("roles.edit"), updateRole)
  .delete(auth, loadUser, requirePermission("roles.delete"), deleteRole);

export default router;
