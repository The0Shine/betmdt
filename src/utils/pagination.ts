// src/helpers/paginationHelper.ts
import { Request } from 'express';
import mongoose from 'mongoose';

// Hàm tạo tùy chọn phân trang
export const createPageOptions = (
    req: Request
): { page: number; limit: number; search: string } => {
    return {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        search: req.query.search ? String(req.query.search) : '',
    };
};

// Hàm thoát ký tự đặc biệt
const escapeRegex = (text: string): string => {
    return text.replace(/[-\/\\^$.*+?()[\]{}|]/g, '\\$&'); // Thoát ký tự đặc biệt
};


export const createSearchText = (search: string) => {
    const escapedSearch = escapeRegex(search); //
    return escapedSearch
        ? {
              $text: { $search: escapedSearch },
          }
        : undefined;
}
// Hàm tạo điều kiện tìm kiếm
export const createSearchCondition = (
    search: string,
    model: mongoose.Model<any>
) => {
    const escapedSearch = escapeRegex(search);
    const schema = model.schema;
    const fields = Object.keys(schema.paths).filter((field) => {
        return schema.paths[field].instance === 'String'; // Lọc các trường có kiểu String
    });
    return escapedSearch
        ? {
              $or: fields.map((field) => ({
                  [field]: { $regex: escapedSearch, $options: 'i' }, // Tìm kiếm theo các trường
              })),
          }
        : {};
};