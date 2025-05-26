import type { Request, Response, NextFunction } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { StatusCodes } from "http-status-codes";
import User from "../models/user.model";
import { asyncHandler } from "../middlewares/async.middleware";
import { ErrorResponse } from "../utils/errorResponse";
import { jsonOne } from "../utils/general";
import { jsonAll } from "../utils/general";
import { createPageOptions, createSearchText } from "../utils/pagination";
import { IRefreshReqBody } from "../interfaces/request/users.interface";
import {
  decodeRefreshToken,
  signAccessToken,
  signRefreshToken,
} from "../utils/jwt";
import HttpError from "../utils/httpError";
import { isSuperAdmin } from "../middlewares/permission.middleware";
import Role from "../models/role.model";
// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filter: any = {};
    const { page, limit, search } = createPageOptions(req);

    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, "i") },
        { lastName: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    if (req.query.role) {
      filter.role = req.query.role;
    }

    const skip = (page - 1) * limit;

    let sort: any = { createdAt: -1 };
    if (req.query.sort) {
      const [field, order] = (req.query.sort as string).split(",");
      sort = { [field]: order === "asc" ? 1 : -1 };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate("role", "name permissions")
        .select("-password")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    // Thêm thông tin canDelete và canEdit
    const usersWithPermissions = users.map((user) => {
      const userObj = user.toObject();
      const role = userObj.role as any;

      return {
        ...userObj,
        canDelete: role?.name !== "Super Admin", // Không thể xóa Super Admin
        canEdit: role?.name !== "Super Admin", // Không thể sửa Super Admin
      };
    });

    const meta = {
      count: users.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    jsonAll(res, StatusCodes.OK, usersWithPermissions, meta);
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener un usuario por ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .populate("role", "name permissions")
      .select("-password");

    if (!user) {
      throw new HttpError({
        title: "user_not_found",
        detail: "Không tìm thấy người dùng",
        code: StatusCodes.NOT_FOUND,
      });
    }

    const userObj = user.toObject();
    const role = userObj.role as any;

    const userWithPermissions = {
      ...userObj,
      canDelete: role?.name !== "Super Admin",
      canEdit: role?.name !== "Super Admin",
    };

    jsonOne(res, StatusCodes.OK, userWithPermissions);
  } catch (error) {
    next(error);
  }
};

// @desc    Crear un usuario
// @route   POST /api/users
// @access  Private/Admin
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.create(req.body);

  return jsonOne(res, StatusCodes.CREATED, user);
});

// @desc    Actualizar un usuario
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, address, role } = req.body;

    const user = await User.findById(id).populate("role", "name permissions");
    if (!user) {
      throw new HttpError({
        title: "user_not_found",
        detail: "Không tìm thấy người dùng",
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Không cho phép sửa Super Admin (trừ khi người sửa cũng là Super Admin)
    const userRole = user.role as any;
    if (userRole?.name === "Super Admin") {
      throw new HttpError({
        title: "cannot_edit_super_admin",
        detail: "Không thể chỉnh sửa tài khoản Super Admin",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Kiểm tra email đã tồn tại (ngoại trừ user hiện tại)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        throw new HttpError({
          title: "email_exists",
          detail: "Email đã tồn tại",
          code: StatusCodes.BAD_REQUEST,
        });
      }
    }

    // Kiểm tra role tồn tại
    if (role) {
      const roleExists = await Role.findById(role);
      if (!roleExists) {
        throw new HttpError({
          title: "role_not_found",
          detail: "Vai trò không tồn tại",
          code: StatusCodes.BAD_REQUEST,
        });
      }

      // Không cho phép gán role Super Admin (trừ khi người gán là Super Admin)
      if (roleExists.name === "Super Admin") {
        throw new HttpError({
          title: "cannot_assign_super_admin",
          detail: "Chỉ Super Admin mới có quyền này",
          code: StatusCodes.FORBIDDEN,
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        email: email || user.email,
        phone: phone !== undefined ? phone : user.phone,
        address: address !== undefined ? address : user.address,
        role: role || user.role,
      },
      { new: true, runValidators: true }
    )
      .populate("role", "name permissions")
      .select("-password");

    const userObj = updatedUser!.toObject();
    const updatedRole = userObj.role as any;

    const userWithPermissions = {
      ...userObj,
      canDelete: updatedRole?.name !== "Super Admin",
      canEdit: updatedRole?.name !== "Super Admin",
    };

    jsonOne(res, StatusCodes.OK, userWithPermissions);
  } catch (error) {
    next(error);
  }
};
// @desc    Eliminar un usuario
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(
        new ErrorResponse(
          `Usuario no encontrado con id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    await user.deleteOne();

    return jsonOne(res, StatusCodes.OK, {});
  }
);

export const refreshController = async (
  req: Request<ParamsDictionary, any, IRefreshReqBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const rt = req.body.token;
    if (!rt) {
      throw new HttpError({
        title: "Token",
        detail: "Refresh token is required",
        code: StatusCodes.UNAUTHORIZED,
      });
    }

    const oldRTPayload = await decodeRefreshToken(rt); // Giải mã refresh token

    // Nếu decode thành công thì sinh token mới
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({
        _id: oldRTPayload._id,
        role: oldRTPayload.role,
      }),
      signRefreshToken({
        _id: oldRTPayload._id,
        role: oldRTPayload.role,
      }),
    ]);

    jsonOne(res, StatusCodes.OK, { accessToken, refreshToken });
  } catch (error) {
    next(
      new HttpError({
        title: "Token",
        detail: "Invalid or expired refresh token",
        code: StatusCodes.UNAUTHORIZED,
      })
    );
  }
};
