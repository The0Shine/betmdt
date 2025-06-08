// src/helpers/paginationHelper.ts
import { Request } from "express";
import mongoose from "mongoose";

// Hàm tạo tùy chọn phân trang
export const createPageOptions = (
  req: Request
): { page: number; limit: number; search: string } => {
  const page = Number(req.query.page) || 1;
  const rawLimit = req.query.limit as string;

  let limit: number;
  if (!rawLimit) {
    limit = 0; // Không giới hạn
  } else {
    limit = Number(rawLimit) || 10;
  }

  const search = req.query.search ? String(req.query.search) : "";

  return { page, limit, search };
};

// Hàm thoát ký tự đặc biệt trong regex
const escapeRegex = (text: string): string => {
  return text.replace(/[-\/\\^$.*+?()[\]{}|]/g, "\\$&");
};

// Hàm tạo điều kiện tìm kiếm theo văn bản đầy đủ (nếu có chỉ mục $text)
export const createSearchText = (search: string) => {
  const escapedSearch = escapeRegex(search);
  return escapedSearch
    ? {
        $text: { $search: escapedSearch },
      }
    : undefined;
};

// Hàm tạo điều kiện tìm kiếm thủ công trên các trường kiểu String
export const createSearchCondition = (
  search: string,
  model: mongoose.Model<any>
) => {
  const escapedSearch = escapeRegex(search);
  const schema = model.schema;

  // Lọc ra các field kiểu String, trừ các field ẩn (_id, __v, password...)
  const fields = Object.keys(schema.paths).filter((field) => {
    const path = schema.paths[field];
    return (
      path.instance === "String" &&
      !field.startsWith("_") &&
      !["__v", "password"].includes(field)
    );
  });

  return escapedSearch
    ? {
        $or: fields.map((field) => ({
          [field]: { $regex: escapedSearch, $options: "i" },
        })),
      }
    : {};
};
