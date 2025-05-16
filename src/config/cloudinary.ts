import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dnehzymia",
  api_key: process.env.CLOUDINARY_API_KEY || "188382119114921",
  api_secret:
    process.env.CLOUDINARY_API_SECRET || "TTxq5ocjMsRHExSFXYvzdYZliuQ",
});

// Định nghĩa kiểu dữ liệu mở rộng cho params
interface CloudinaryStorageParams {
  folder: string;
  allowed_formats?: string[];
  transformation?: any[];
  public_id?: (req: Express.Request, file: Express.Multer.File) => string;
}

// Cấu hình storage cho multer với type assertion
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "products",
    allowed_formats: ["jpg", "png", "jpeg", "gif", "webp"],
    transformation: [{ width: 1000, height: 1000, crop: "limit" }],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const filename = file.originalname.split(".")[0];
      return `${filename}-${uniqueSuffix}`;
    },
  } as CloudinaryStorageParams,
});

// Bộ lọc file - chỉ chấp nhận hình ảnh
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file hình ảnh!"));
  }
};

// Giới hạn kích thước file (5MB)
const limits = {
  fileSize: 5 * 1024 * 1024,
};

// Khởi tạo multer với Cloudinary storage
const uploadCloud = multer({
  storage,
  fileFilter,
  limits,
});

export { cloudinary, uploadCloud };
