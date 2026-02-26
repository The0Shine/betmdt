import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Category from "../models/category.model";
import { asyncHandler } from "../middlewares/async.middleware";
import { ErrorResponse } from "../utils/errorResponse";
import { jsonOne, jsonAll } from "../utils/general";
import { ICategoryResponse } from "../interfaces/response/category.interface";
import { createPageOptions, createSearchCondition } from "../utils/pagination";
import { cache, TTL } from "../utils/memCache";

// @desc    Láº¥y táº¥t cáº£ danh má»¥c
// @route   GET /api/categories
// @access  Public

export const getCategories = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const filter: any = {};

    // Xá»­ lÃ½ parent filter má»™t cÃ¡ch an toÃ n
    const parentValue = req.query.parent as string;
    if (parentValue && parentValue !== "null" && parentValue !== "undefined") {
      filter.parent = parentValue;
    } else if (req.query.parentOnly === "true") {
      filter.parent = { $exists: false };
    }

    // Láº¥y cÃ¡c tÃ¹y chá»n phÃ¢n trang vÃ  tÃ¬m kiáº¿m
    const { page, limit, search } = createPageOptions(req);
    Object.assign(filter, createSearchCondition(search, Category));

    const skip = (page - 1) * limit;

    // Xá»­ lÃ½ sáº¯p xáº¿p (máº·c Ä‘á»‹nh theo name tÄƒng dáº§n)
    let sort: any = { name: 1 };
    if (req.query.sort) {
      const [field, order] = (req.query.sort as string).split(",");
      sort = { [field]: order === "asc" ? 1 : -1 };
    }

    // Cache key encodes full query string (includes parentOnly, sort etc.)
    const cacheKey = `categories:${req.url}`;
    const cachedResult = cache.get<{ categories: any[]; total: number }>(cacheKey);

    let categories: any[];
    let total: number;

    if (cachedResult) {
      ({ categories, total } = cachedResult);
    } else {
      const query = Category.find(filter).populate("parent", "name").sort(sort);
      if (limit > 0) {
        query.skip(skip).limit(limit);
      }

      [categories, total] = await Promise.all([
        query.exec(),
        Category.countDocuments(filter),
      ]);
      cache.set(cacheKey, { categories, total }, TTL.CATEGORIES);
    }

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

    return jsonAll<ICategoryResponse>(res, StatusCodes.OK, categories, meta);
  }
);

// @desc    Láº¥y cÃ¢y danh má»¥c
// @route   GET /api/categories/tree
// @access  Public
// export const getCategoryTree = asyncHandler(
//   async (_req: Request, res: Response) => {
//     const categories = await Category.find().sort({ name: 1 });

//     // Táº¡o map Ä‘á»ƒ dá»… dÃ ng lookup
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

//     // XÃ¢y dá»±ng cÃ¢y
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

// @desc    Láº¥y danh má»¥c theo ID
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
          `KhÃ´ng tÃ¬m tháº¥y danh má»¥c vá»›i id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    return jsonOne<ICategoryResponse>(res, StatusCodes.OK, category);
  }
);

// @desc    Táº¡o danh má»¥c má»›i
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, icon, parent } = req.body;

    // Táº¡o slug tá»« name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();

    // Kiá»ƒm tra slug Ä‘Ã£ tá»“n táº¡i chÆ°a
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return next(
        new ErrorResponse(
          `Danh má»¥c vá»›i tÃªn "${name}" Ä‘Ã£ tá»“n táº¡i`,
          StatusCodes.BAD_REQUEST
        )
      );
    }

    // Kiá»ƒm tra parent cÃ³ tá»“n táº¡i khÃ´ng
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return next(
          new ErrorResponse(
            `KhÃ´ng tÃ¬m tháº¥y danh má»¥c cha`,
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
    return jsonOne<ICategoryResponse>(res, StatusCodes.CREATED, populatedCategory);
  }
);

// @desc    Cáº­p nháº­t danh má»¥c
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let category = await Category.findById(req.params.id);

    if (!category) {
      return next(
        new ErrorResponse(
          `KhÃ´ng tÃ¬m tháº¥y danh má»¥c vá»›i id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    const { name, description, icon, parent } = req.body;

    // Táº¡o slug má»›i náº¿u name thay Ä‘á»•i
    let slug = category.slug;
    if (name && name !== category.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim();

      // Kiá»ƒm tra slug má»›i Ä‘Ã£ tá»“n táº¡i chÆ°a
      const existingCategory = await Category.findOne({
        slug,
        _id: { $ne: req.params.id },
      });
      if (existingCategory) {
        return next(
          new ErrorResponse(
            `Danh má»¥c vá»›i tÃªn "${name}" Ä‘Ã£ tá»“n táº¡i`,
            StatusCodes.BAD_REQUEST
          )
        );
      }
    }

    // Kiá»ƒm tra parent
    if (parent && parent !== category.parent?.toString()) {
      if (parent === req.params.id) {
        return next(
          new ErrorResponse(
            "KhÃ´ng thá»ƒ Ä‘áº·t danh má»¥c lÃ m cha cá»§a chÃ­nh nÃ³",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return next(
          new ErrorResponse(
            `KhÃ´ng tÃ¬m tháº¥y danh má»¥c cha`,
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

    return jsonOne<ICategoryResponse>(res, StatusCodes.OK, category);
  }
);

// @desc    XÃ³a danh má»¥c
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return next(
        new ErrorResponse(
          `KhÃ´ng tÃ¬m tháº¥y danh má»¥c vá»›i id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    // Kiá»ƒm tra cÃ³ danh má»¥c con khÃ´ng
    const childCategories = await Category.find({ parent: req.params.id });
    if (childCategories.length > 0) {
      return next(
        new ErrorResponse(
          "KhÃ´ng thá»ƒ xÃ³a danh má»¥c cÃ³ danh má»¥c con",
          StatusCodes.BAD_REQUEST
        )
      );
    }

    await category.deleteOne();

    return jsonOne(res, StatusCodes.OK, { message: "ÄÃ£ xÃ³a danh má»¥c" });
  }
);
