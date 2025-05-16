import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Category from "../models/category.model";
import { asyncHandler } from "../middlewares/async.middleware";
import { ErrorResponse } from "../utils/errorResponse";
import { jsonOne } from "../utils/general";

// @desc    Lấy tất cả danh mục
// @route   GET /api/categories
// @access  Public
export const getCategories = asyncHandler(
  async (_req: Request, res: Response) => {
    const categories = await Category.find().sort({ name: 1 });

    return res.status(StatusCodes.OK).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  }
);

// @desc    Lấy danh mục theo ID
// @route   GET /api/categories/:id
// @access  Public
export const getCategoryById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return next(
        new ErrorResponse(
          `Không tìm thấy danh mục với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    return jsonOne(res, StatusCodes.OK, category);
  }
);

// @desc    Tạo danh mục mới
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const category = await Category.create(req.body);
    return jsonOne(res, StatusCodes.CREATED, category);
  }
);

// @desc    Cập nhật danh mục
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let category = await Category.findById(req.params.id);

    if (!category) {
      return next(
        new ErrorResponse(
          `Không tìm thấy danh mục với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    return jsonOne(res, StatusCodes.OK, category);
  }
);

// @desc    Xóa danh mục
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return next(
        new ErrorResponse(
          `Không tìm thấy danh mục với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    await category.deleteOne();
    return res.status(StatusCodes.OK).json({
      success: true,
      data: {},
    });
  }
);
