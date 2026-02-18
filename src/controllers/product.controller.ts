import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Product from "../models/product.model";
import { asyncHandler } from "../middlewares/async.middleware";
import { ErrorResponse } from "../utils/errorResponse";
import { jsonOne, jsonAll } from "../utils/general";
import { IProductPublicResponse, IProductAdminResponse } from "../interfaces/response/product.interface";
import { createPageOptions, createSearchCondition } from "../utils/pagination";
import categoryModel from "../models/category.model";

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
    // Filter by tags (replaces boolean flags)
    if (req.query.tag) {
      filter.tags = { $in: [req.query.tag] };
    }
    if (req.query.published === "true") filter.published = true;

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
      Product.find(filter).select("-costPrice").populate("category", "_id name").sort(sort).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    const meta = {
      count: products.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return jsonAll<IProductPublicResponse>(res, StatusCodes.OK, products as any, meta);
  }
);
export const getProductsAdmin = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    // Các bộ lọc không liên quan đến phân trang
    const filter: any = {};

    if (req.query.category) filter.category = req.query.category;
    if (req.query.subcategory) filter.subcategory = req.query.subcategory;
    if (req.query.status) filter.status = req.query.status;
    // Filter by tags (replaces boolean flags)
    if (req.query.tag) {
      filter.tags = { $in: [req.query.tag] };
    }
    if (req.query.published === "true") filter.published = true;

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
      Product.find(filter).populate("category", "_id name").sort(sort).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    const meta = {
      count: products.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return jsonAll<IProductAdminResponse>(res, StatusCodes.OK, products as any, meta);
  }
);

// @desc    Lấy sản phẩm theo ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const product = await Product.findById(req.params.id).select("-costPrice").populate("category", "_id name");

    if (!product) {
      return next(
        new ErrorResponse(
          `Không tìm thấy sản phẩm với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    return jsonOne<IProductPublicResponse>(res, StatusCodes.OK, product as any);
  }
);

// @desc    Tạo sản phẩm mới
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      name,
      category,
      unit,
      price,
      quantity,
      status,
      image,
      description,
      barcode,
      costPrice,
    } = req.body;

    const categoryExists = await categoryModel.findById(category);
    if (!categoryExists) {
      return jsonOne(res, StatusCodes.BAD_REQUEST, { message: "Invalid category ID" });
    }
    const product = await Product.create({
      name,
      category: categoryExists._id,
      unit,
      price,
      quantity,
      status,
      image,
      description,
      barcode,
      costPrice,
    });
    const populatedProduct = await Product.findById(product._id).populate("category", "_id name");
    return jsonOne<IProductAdminResponse>(res, StatusCodes.CREATED, populatedProduct as any);
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

    // Auto-set oldPrice when price changes
    if (req.body.price !== undefined && req.body.price !== product.price) {
      req.body.oldPrice = product.price;
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    const populatedProduct = await Product.findById(product?._id).populate("category", "_id name");
    return jsonOne<IProductAdminResponse>(res, StatusCodes.OK, populatedProduct as any);
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
    return jsonOne(res, StatusCodes.OK, { message: "Đã xóa sản phẩm" });
  }
);
