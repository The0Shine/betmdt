import express from "express";
import {
  uploadImage,
  uploadMultipleImages,
  uploadBase64Image,
  deleteImage,
  getImageInfo,
  listImages,
} from "../controllers/upload.controller";
import { uploadCloud } from "../config/cloudinary";

const router = express.Router();

// Middleware bảo vệ route (nếu có)
// router.use(protect);

// Route upload một hình ảnh
router.post("/", uploadCloud.single("file"), uploadImage);

// Route upload nhiều hình ảnh
router.post("/multiple", uploadCloud.array("files", 10), uploadMultipleImages);

// Route upload hình ảnh từ base64
router.post("/base64", uploadBase64Image);

// Route xóa hình ảnh
router.delete("/", deleteImage);

// Route lấy thông tin hình ảnh
router.get("/:public_id", getImageInfo);

// Route lấy danh sách hình ảnh
router.get("/", listImages);

export default router;
