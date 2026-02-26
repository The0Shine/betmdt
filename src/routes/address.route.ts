import express from "express";
import {
  getMyAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress,
} from "../controllers/address.controller";
import { auth } from "../middlewares/auth.middleware";

const router = express.Router();

// All routes require authentication
router.use(auth);

// Get user's default address
router.get("/default", getDefaultAddress);

// CRUD routes
router.get("/", getMyAddresses);
router.get("/:id", getAddressById);
router.post("/", createAddress);
router.put("/:id", updateAddress);
router.delete("/:id", deleteAddress);

// Set default
router.put("/:id/default", setDefaultAddress);

export default router;
