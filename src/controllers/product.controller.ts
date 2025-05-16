import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Product from "../models/product.model";
import { asyncHandler } from "../middlewares/async.middleware";
import { ErrorResponse } from "../utils/errorResponse";
import { jsonOne } from "../utils/general";
import { createPageOptions, createSearchCondition } from "../utils/pagination";

// @desc    Lấy tất cả sản phẩm
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    // Các bộ lọc không liên quan đến phân trang
    const filter: any = {};

    if (req.query.category) filter.category = req.query.category;
    if (req.query.subcategory) filter.subcategory = req.query.subcategory;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.featured === "true") filter.featured = true;
    if (req.query.recommended === "true") filter.recommended = true;
    if (req.query.hot === "true") filter.hot = true;
    if (req.query.new === "true") filter.new = true;

    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
    }

    // Lấy các tùy chọn phân trang và tìm kiếm từ helper
    const { page, limit, search } = createPageOptions(req);
    // Tạo điều kiện tìm kiếm (sẽ tìm trong tất cả các trường kiểu String theo cấu trúc model)
    Object.assign(filter, createSearchCondition(search, Product));

    const skip = (page - 1) * limit;

    // Xử lý tùy chọn sắp xếp
    let sort: any = { createdAt: -1 };
    if (req.query.sort) {
      const [field, order] = (req.query.sort as string).split(",");
      const direction = order === "asc" ? 1 : -1;
      sort = { [field]: direction };
    }

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    return res.status(StatusCodes.OK).json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: products,
    });
  }
);

// @desc    Lấy sản phẩm theo ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(
        new ErrorResponse(
          `Không tìm thấy sản phẩm với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    return jsonOne(res, StatusCodes.OK, product);
  }
);

// @desc    Tạo sản phẩm mới
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await Product.create(req.body);
    return jsonOne(res, StatusCodes.CREATED, product);
  }
);

// @desc    Cập nhật sản phẩm
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return next(
        new ErrorResponse(
          `Không tìm thấy sản phẩm với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    return jsonOne(res, StatusCodes.OK, product);
  }
);

// @desc    Xóa sản phẩm
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(
        new ErrorResponse(
          `Không tìm thấy sản phẩm với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    await product.deleteOne();
    return res.status(StatusCodes.OK).json({
      success: true,
      data: {},
    });
  }
);
