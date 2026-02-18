import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Role from "../models/role.model";
import User from "../models/user.model";
import { createPageOptions } from "../utils/pagination";
import { jsonAll, jsonOne } from "../utils/general";
import HttpError from "../utils/httpError";

export const getRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filter: any = {};
    const { page, limit, search } = createPageOptions(req);

    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    const skip = (page - 1) * limit;

    let sort: any = { createdAt: -1 };
    if (req.query.sort) {
      const [field, order] = (req.query.sort as string).split(",");
      sort = { [field]: order === "asc" ? 1 : -1 };
    }

    const [roles, total] = await Promise.all([
      Role.find(filter).sort(sort).skip(skip).limit(limit),
      Role.countDocuments(filter),
    ]);

    // Lấy số lượng users cho mỗi role
    const rolesWithUserCount = await Promise.all(
      roles.map(async (role) => {
        const userCount = await User.countDocuments({ role: role._id });
        return {
          ...role.toObject(),
          userCount,
          canDelete: role.name !== "Super Admin" && role.name !== "user", // Super Admin và user không thể xóa
          canEdit: role.name !== "Super Admin" && role.name !== "user", // Super Admin không thể sửa
        };
      })
    );

    const meta = {
      count: roles.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    jsonAll(res, StatusCodes.OK, rolesWithUserCount, meta);
  } catch (error) {
    next(error);
  }
};

export const getRoleById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id);

    if (!role) {
      throw new HttpError({
        title: "role_not_found",
        detail: "Không tìm thấy vai trò",
        code: StatusCodes.NOT_FOUND,
      });
    }

    const userCount = await User.countDocuments({ role: id });
    const roleWithUserCount = {
      ...role.toObject(),
      userCount,
      canDelete: role.name !== "Super Admin" && role.name !== "user",
      canEdit: role.name !== "Super Admin" && role.name !== "user",
    };

    jsonOne(res, StatusCodes.OK, roleWithUserCount);
  } catch (error) {
    next(error);
  }
};

export const createRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      throw new HttpError({
        title: "missing_fields",
        detail: "Tên vai trò là bắt buộc",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Không cho phép tạo role Super Admin
    if (name === "Super Admin") {
      throw new HttpError({
        title: "forbidden_role_name",
        detail: "Không thể tạo vai trò Super Admin",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Không cho phép tạo role user (mặc định)
    if (name.toLowerCase() === "user") {
      throw new HttpError({
        title: "forbidden_role_name",
        detail: "Không thể tạo vai trò user (đã tồn tại mặc định)",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Không cho phép tạo role với permission super.admin
    if (permissions && permissions.includes("super.admin")) {
      throw new HttpError({
        title: "forbidden_permission",
        detail: "Không thể tạo vai trò với quyền Super Admin",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Kiểm tra tên vai trò đã tồn tại
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      throw new HttpError({
        title: "role_exists",
        detail: "Tên vai trò đã tồn tại",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const role = new Role({
      name,
      description,
      permissions: permissions || [],
    });

    await role.save();

    const roleWithUserCount = {
      ...role.toObject(),
      userCount: 0,
      canDelete: true,
      canEdit: true,
    };

    jsonOne(res, StatusCodes.CREATED, roleWithUserCount);
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      throw new HttpError({
        title: "role_not_found",
        detail: "Không tìm thấy vai trò",
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Không cho phép sửa Super Admin
    if (role.name === "Super Admin") {
      throw new HttpError({
        title: "cannot_edit_super_admin",
        detail: "Không thể chỉnh sửa vai trò Super Admin",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Không cho phép sửa role user (mặc định)
    if (role.name === "user") {
      throw new HttpError({
        title: "cannot_edit_default_role",
        detail: "Không thể chỉnh sửa vai trò mặc định (user)",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Không cho phép đổi tên thành Super Admin
    if (name === "Super Admin") {
      throw new HttpError({
        title: "forbidden_role_name",
        detail: "Không thể đổi tên thành Super Admin",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Không cho phép đổi tên thành user
    if (name && name.toLowerCase() === "user") {
      throw new HttpError({
        title: "forbidden_role_name",
        detail: "Không thể đổi tên thành user (đã tồn tại mặc định)",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Không cho phép thêm permission super.admin
    if (permissions && permissions.includes("super.admin")) {
      throw new HttpError({
        title: "forbidden_permission",
        detail: "Không thể thêm quyền Super Admin",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Kiểm tra tên vai trò đã tồn tại (ngoại trừ vai trò hiện tại)
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ name, _id: { $ne: id } });
      if (existingRole) {
        throw new HttpError({
          title: "role_exists",
          detail: "Tên vai trò đã tồn tại",
          code: StatusCodes.BAD_REQUEST,
        });
      }
    }

    const updatedRole = await Role.findByIdAndUpdate(
      id,
      {
        name: name || role.name,
        description: description !== undefined ? description : role.description,
        permissions: permissions || role.permissions,
      },
      { new: true, runValidators: true }
    );

    const userCount = await User.countDocuments({ role: id });
    const roleWithUserCount = {
      ...updatedRole!.toObject(),
      userCount,
      canDelete: true,
      canEdit: true,
    };

    jsonOne(res, StatusCodes.OK, roleWithUserCount);
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id);
    if (!role) {
      throw new HttpError({
        title: "role_not_found",
        detail: "Không tìm thấy vai trò",
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Không cho phép xóa Super Admin
    if (role.name === "Super Admin") {
      throw new HttpError({
        title: "cannot_delete_super_admin",
        detail: "Không thể xóa vai trò Super Admin",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Không cho phép xóa role user (mặc định)
    if (role.name === "user") {
      throw new HttpError({
        title: "cannot_delete_default_role",
        detail: "Không thể xóa vai trò mặc định (user)",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Kiểm tra xem có user nào đang sử dụng role này không
    const usersWithRole = await User.countDocuments({ role: id });
    if (usersWithRole > 0) {
      throw new HttpError({
        title: "role_in_use",
        detail: `Không thể xóa vai trò này vì có ${usersWithRole} người dùng đang sử dụng`,
        code: StatusCodes.BAD_REQUEST,
      });
    }

    await Role.findByIdAndDelete(id);

    jsonOne(res, StatusCodes.OK, { message: "Xóa vai trò thành công" });
  } catch (error) {
    next(error);
  }
};

export const getPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Permissions dựa trên routes thực tế
    const allPermissions = [
      // Products
      "products.create",
      "products.edit",
      "products.delete",

      // Categories
      "categories.create",
      "categories.edit",
      "categories.delete",

      // Orders
      "orders.view_all",
      "orders.update_payment",
      // "orders.update_delivery",
      "orders.update_status",

      // Stock/Inventory
      "stock.view",
      "stock.create",
      // "stock.edit",
      "stock.delete",
      "stock.approve",
      "stock.reject",
      "stock.cancel",

      // Transactions
      "transactions.view",
      // "transactions.stats",

      // Users
      "users.view",
      "users.create",
      "users.edit",
      "users.delete",

      // Roles
      "roles.view",
      "roles.create",
      "roles.edit",
      "roles.delete",

      // Admin
      // "admin.all",
    ];

    // Lọc bỏ super.admin permission khỏi danh sách
    const availablePermissions = allPermissions;

    // Nhóm permissions theo module
    const groupedPermissions = {
      products: {
        name: "Quản lý sản phẩm",
        permissions: availablePermissions.filter((p) =>
          p.startsWith("products.")
        ),
      },
      categories: {
        name: "Quản lý danh mục",
        permissions: availablePermissions.filter((p) =>
          p.startsWith("categories.")
        ),
      },
      orders: {
        name: "Quản lý đơn hàng",
        permissions: availablePermissions.filter((p) =>
          p.startsWith("orders.")
        ),
      },
      stock: {
        name: "Quản lý kho",
        permissions: availablePermissions.filter((p) => p.startsWith("stock.")),
      },
      transactions: {
        name: "Giao dịch",
        permissions: availablePermissions.filter((p) =>
          p.startsWith("transactions.")
        ),
      },
      users: {
        name: "Quản lý người dùng",
        permissions: availablePermissions.filter((p) => p.startsWith("users.")),
      },
      roles: {
        name: "Quản lý quyền",
        permissions: availablePermissions.filter((p) => p.startsWith("roles.")),
      },
      // admin: {
      //   name: "Quản trị hệ thống",
      //   permissions: availablePermissions.filter((p) => p.startsWith("admin.")),
      // },
    };

    const permissionsData = {
      all: availablePermissions,
      grouped: groupedPermissions,
    };

    jsonOne(res, StatusCodes.OK, permissionsData);
  } catch (error) {
    next(error);
  }
};
