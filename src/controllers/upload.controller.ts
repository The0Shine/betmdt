import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../middlewares/async.middleware";
import { ErrorResponse } from "../utils/errorResponse";
import { jsonOne, jsonAll } from "../utils/general";
import { cloudinary } from "../config/cloudinary";

// @desc    Tải lên một hình ảnh
// @route   POST /api/upload
// @access  Private
export const uploadImage = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next(
        new ErrorResponse(
          "Vui lòng tải lên một tệp hình ảnh",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Khi sử dụng multer-storage-cloudinary, thông tin về file đã upload
    // sẽ được lưu trong req.file
    const file = req.file as any;

    const result = {
      url: file.path, // URL của ảnh trên Cloudinary
      secure_url: file.secure_url || file.path,
      public_id: file.filename, // public_id trên Cloudinary
      format: file.format,
      width: file.width,
      height: file.height,
      original_filename: file.originalname,
      resource_type: file.resource_type,
    };

    return jsonOne(res, StatusCodes.OK, result);
  }
);

// @desc    Tải lên nhiều hình ảnh
// @route   POST /api/upload/multiple
// @access  Private
export const uploadMultipleImages = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return next(
        new ErrorResponse(
          "Vui lòng tải lên ít nhất một tệp hình ảnh",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Kết quả là một mảng các file đã upload
    const files = req.files as any[];
    const results = files.map((file) => ({
      url: file.path,
      secure_url: file.secure_url || file.path,
      public_id: file.filename,
      format: file.format,
      width: file.width,
      height: file.height,
      original_filename: file.originalname,
      resource_type: file.resource_type,
    }));

    return jsonAll(res, StatusCodes.OK, results);
  }
);

// @desc    Tải lên hình ảnh từ base64
// @route   POST /api/upload/base64
// @access  Private
export const uploadBase64Image = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body.image) {
      return next(
        new ErrorResponse(
          "Vui lòng cung cấp dữ liệu hình ảnh base64",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    try {
      // Tải lên Cloudinary trực tiếp từ base64
      const result = await cloudinary.uploader.upload(req.body.image, {
        folder: req.body.folder || "products",
      });

      return jsonOne(res, StatusCodes.OK, {
        url: result.url,
        secure_url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        resource_type: result.resource_type,
      });
    } catch (error) {
      return next(
        new ErrorResponse(
          "Lỗi khi tải lên hình ảnh base64",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

// @desc    Xóa một hình ảnh
// @route   DELETE /api/upload
// @access  Private
export const deleteImage = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body.public_id) {
      return next(
        new ErrorResponse(
          "Vui lòng cung cấp public_id của hình ảnh",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    try {
      // Xóa hình ảnh từ Cloudinary
      const result = await cloudinary.uploader.destroy(req.body.public_id);

      if (result.result !== "ok") {
        return next(
          new ErrorResponse(
            "Không thể xóa hình ảnh",
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        );
      }

      return jsonOne(res, StatusCodes.OK, { success: true, result });
    } catch (error) {
      return next(
        new ErrorResponse(
          "Lỗi khi xóa hình ảnh",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

// @desc    Lấy thông tin hình ảnh
// @route   GET /api/upload/:public_id
// @access  Private
export const getImageInfo = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.params.public_id) {
      return next(
        new ErrorResponse(
          "Vui lòng cung cấp public_id của hình ảnh",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    try {
      // Lấy thông tin hình ảnh từ Cloudinary
      const result = await cloudinary.api.resource(req.params.public_id);

      return jsonOne(res, StatusCodes.OK, result);
    } catch (error) {
      return next(
        new ErrorResponse(
          "Lỗi khi lấy thông tin hình ảnh",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);

// @desc    Lấy danh sách hình ảnh
// @route   GET /api/upload
// @access  Private
export const listImages = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const folder = (req.query.folder as string) || "products";
      const maxResults = parseInt(req.query.limit as string) || 10;
      const nextCursor = req.query.next_cursor as string;

      // Lấy danh sách hình ảnh từ Cloudinary
      const result = await cloudinary.search
        .expression(`folder:${folder}`)
        .sort_by("created_at", "desc")
        .max_results(maxResults)
        .next_cursor(nextCursor)
        .execute();

      // Tạo metadata cho phân trang
      const meta = {
        total: result.total_count,
        limit: maxResults,
        next_cursor: result.next_cursor,
      };

      return jsonAll(res, StatusCodes.OK, result.resources, meta);
    } catch (error) {
      return next(
        new ErrorResponse(
          "Lỗi khi lấy danh sách hình ảnh",
          StatusCodes.INTERNAL_SERVER_ERROR
        )
      );
    }
  }
);
