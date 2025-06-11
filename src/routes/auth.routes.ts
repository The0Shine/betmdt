import express from "express";
import {
  register,
  login,
  // logout,
  getMe,
  updateDetails,
  changePassword,
} from "../controllers/auth.controller";
import { auth } from "../middlewares/auth.middleware";

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
// router.get("/logout", logout);
router.get("/me", auth, getMe);
router.put("/updatedetails", auth, updateDetails);
router.post("/change-password", auth, changePassword);
export default router;
