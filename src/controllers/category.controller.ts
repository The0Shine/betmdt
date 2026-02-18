import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Category from "../models/category.model";
import { asyncHandler } from "../middlewares/async.middleware";
import { ErrorResponse } from "../utils/errorResponse";
import { jsonOne, jsonAll } from "../utils/general";
import { ICategoryResponse } from "../interfaces/response/category.interface";
import { createPageOptions, createSearchCondition } from "../utils/pagination";
import { log } from "console";

// @desc    Lấy tất cả danh mục
// @route   GET /api/categories
// @access  Public

export const getCategories = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const filter: any = {};

    // Xử lý parent filter một cách an toàn
    const parentValue = req.query.parent as string;
    if (parentValue && parentValue !== "null" && parentValue !== "undefined") {
      filter.parent = parentValue;
    } else if (req.query.parentOnly === "true") {
      filter.parent = { $exists: false };
    }

    // Lấy các tùy chọn phân trang và tìm kiếm
    const { page, limit, search } = createPageOptions(req);
    Object.assign(filter, createSearchCondition(search, Category));

    const skip = (page - 1) * limit;

    // Xử lý sắp xếp (mặc định theo name tăng dần)
    let sort: any = { name: 1 };
    if (req.query.sort) {
      const [field, order] = (req.query.sort as string).split(",");
      sort = { [field]: order === "asc" ? 1 : -1 };
    }

    // Tạo query chính
    const query = Category.find(filter).populate("parent", "name").sort(sort);
    if (limit > 0) {
      query.skip(skip).limit(limit);
    }

    const [categories, total] = await Promise.all([
      query.exec(),
      Category.countDocuments(filter),
    ]);

    const meta = {
      count: categories.length,
      total,
      pagination:
        limit > 0
          ? {
              page,
              limit,
              totalPages: Math.ceil(total / limit),
            }
          : null,
    };

    return jsonAll<ICategoryResponse>(res, StatusCodes.OK, categories as any, meta);
  }
);

// @desc    Lấy cây danh mục
// @route   GET /api/categories/tree
// @access  Public
// export const getCategoryTree = asyncHandler(
//   async (_req: Request, res: Response) => {
//     const categories = await Category.find().sort({ name: 1 });

//     // Tạo map để dễ dàng lookup
//     const categoryMap = new Map();
//     categories.forEach((cat) => {
//       categoryMap.set(cat._id.toString(), {
//         _id: cat._id,
//         name: cat.name,
//         slug: cat.slug,
//         description: cat.description,
//         icon: cat.icon,
//         parent: cat.parent,
//         children: [],
//       });
//     });

//     // Xây dựng cây
//     const tree: any[] = [];
//     categoryMap.forEach((category) => {
//       if (category.parent) {
//         const parent = categoryMap.get(category.parent.toString());
//         if (parent) {
//           parent.children.push(category);
//         }
//       } else {
//         tree.push(category);
//       }
//     });

//     return res.status(StatusCodes.OK).json({
//       success: true,
//       data: tree,
//     });
//   }
// );

// @desc    Lấy danh mục theo ID
// @route   GET /api/categories/:id
// @access  Public
export const getCategoryById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const category = await Category.findById(req.params.id).populate(
      "parent",
      "name"
    );

    if (!category) {
      return next(
        new ErrorResponse(
          `Không tìm thấy danh mục với id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    return jsonOne<ICategoryResponse>(res, StatusCodes.OK, category as any);
  }
);

// @desc    Tạo danh mục mới
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, icon, parent } = req.body;

    // Tạo slug từ name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();

    // Kiểm tra slug đã tồn tại chưa
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return next(
        new ErrorResponse(
          `Danh mục với tên "${name}" đã tồn tại`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Kiểm tra parent có tồn tại không
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return next(
          new ErrorResponse(
            `Không tìm thấy danh mục cha`,
            StatusCodes.BAD_REQUEST
          )
        );
      }
    }

    const category = await Category.create({
      name,
      slug,
      description,
      icon,
      parent: parent || null,
    });

    const populatedCategory = await Category.findById(category._id).populate(
      "parent",
      "name"
    );
    return jsonOne<ICategoryResponse>(res, StatusCodes.CREATED, populatedCategory as any);
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

    const { name, description, icon, parent } = req.body;

    // Tạo slug mới nếu name thay đổi
    let slug = category.slug;
    if (name && name !== category.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim();

      // Kiểm tra slug mới đã tồn tại chưa
      const existingCategory = await Category.findOne({
        slug,
        _id: { $ne: req.params.id },
      });
      if (existingCategory) {
        return next(
          new ErrorResponse(
            `Danh mục với tên "${name}" đã tồn tại`,
            StatusCodes.BAD_REQUEST
          )
        );
      }
    }

    // Kiểm tra parent
    if (parent && parent !== category.parent?.toString()) {
      if (parent === req.params.id) {
        return next(
          new ErrorResponse(
            "Không thể đặt danh mục làm cha của chính nó",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return next(
          new ErrorResponse(
            `Không tìm thấy danh mục cha`,
            StatusCodes.BAD_REQUEST
          )
        );
      }
    }

    category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name: name || category.name,
        slug,
        description,
        icon,
        parent: parent || null,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("parent", "name");

    return jsonOne<ICategoryResponse>(res, StatusCodes.OK, category as any);
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

    // Kiểm tra có danh mục con không
    const childCategories = await Category.find({ parent: req.params.id });
    if (childCategories.length > 0) {
      return next(
        new ErrorResponse(
          "Không thể xóa danh mục có danh mục con",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    await category.deleteOne();

    return jsonOne(res, StatusCodes.OK, { message: "Đã xóa danh mục" });
  }
);
