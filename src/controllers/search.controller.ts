import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { SearchService } from "../services/search.service";
import { jsonOne } from "../utils/general";
import HttpError from "../utils/httpError";

// @desc    Tìm kiếm sản phẩm (full-text + filters)
// @route   GET /api/search?q=iphone&category=...&minPrice=...&maxPrice=...
// @access  Public
export const searchProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      q = "",
      categories,
      tags,
      minPrice,
      maxPrice,
      status,
      rating,
      page = "1",
      limit = "12",
      sort = "_score",
      order = "desc",
    } = req.query;

    const filters = {
      categories: categories ? (categories as string).split(",").filter(Boolean) : undefined,
      tags: tags ? (tags as string).split(",") : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      status: status as string | undefined,
      rating: rating ? Number(rating) : undefined,
    };

    const options = {
      page: Number(page),
      limit: Math.min(Number(limit), 50), // Cap at 50
      sort: sort as string,
      order: order as "asc" | "desc",
    };

    const result = await SearchService.searchProducts(
      q as string,
      filters,
      options
    );

    jsonOne(res, StatusCodes.OK, result);
  } catch (error) {
    next(error);
  }
};

// @desc    Gợi ý tìm kiếm (autocomplete)
// @route   GET /api/search/autocomplete?q=ip
// @access  Public
export const autocomplete = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { q = "", limit = "5" } = req.query;

    const suggestions = await SearchService.autocomplete(
      q as string,
      Math.min(Number(limit), 10)
    );

    jsonOne(res, StatusCodes.OK, suggestions);
  } catch (error) {
    next(error);
  }
};

// @desc    Đồng bộ lại toàn bộ sản phẩm vào Elasticsearch
// @route   POST /api/search/reindex
// @access  Private/Admin (search.reindex permission)
export const reindexProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await SearchService.reindexAll();

    jsonOne(res, StatusCodes.OK, {
      message: `Reindex hoàn tất: ${result.indexed} sản phẩm đã được index, ${result.errors} lỗi`,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
