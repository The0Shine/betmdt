import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  updateDetails,
} from "../controllers/auth.controller";
import { auth } from "../middlewares/auth.middleware";

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/me", auth, getMe);
router.put("/updatedetails", auth, updateDetails);

export default router;
