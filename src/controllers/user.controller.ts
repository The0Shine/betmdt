import type { Request, Response, NextFunction } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { StatusCodes } from "http-status-codes";
import User, { IUser } from "../models/user.model";
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
import Role from "../models/role.model";
import mongoose, { Types } from "mongoose";
import { token } from "morgan";
import { log } from "console";
import { hashPassword } from "../utils/crypto";
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
  const { password, ...rest } = req.body;

  if (!password || password.length < 6) {
    throw new HttpError({
      title: "invalid_password",
      detail: "Mật khẩu phải có ít nhất 6 ký tự",
      code: StatusCodes.BAD_REQUEST,
    });
  }

  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    ...rest,
    password: hashedPassword,
  });

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
    const { firstName, lastName, email, phone, address, role, avatar } =
      req.body;

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
        avatar: avatar || user.avatar,
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
export const getWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload._id;

    const user = await User.findById(userId).populate("wishlist");
    if (!user)
      throw new HttpError({
        title: "User",
        detail: "User not found",
        code: StatusCodes.NOT_FOUND,
      });
    if (!Array.isArray(user.wishlist)) {
      user.wishlist = [];
      await user.save();
    }

    jsonOne(res, StatusCodes.OK, user.wishlist);
  } catch (error) {
    next(error);
  }
};

// POST /wishlist/:productId - Thêm sản phẩm vào wishlist
export const addToWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload._id;
    const productId = req.params.productId;

    // Kiểm tra productId hợp lệ
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new HttpError({
        title: "Product",
        detail: "Invalid product ID",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new HttpError({
        title: "User",
        detail: "User not found",
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Chuyển productId về ObjectId
    const productObjectId = new Types.ObjectId(productId);

    // Kiểm tra trùng lặp
    const alreadyExists = user.wishlist?.some((id) =>
      id.equals(productObjectId)
    );

    if (!alreadyExists) {
      user.wishlist?.push(productObjectId);
      await user.save();
    }

    jsonOne(res, StatusCodes.OK, { message: "Added to wishlist" });
  } catch (error) {
    next(error);
  }
};

// DELETE /wishlist/:productId - Xóa sản phẩm khỏi wishlist
export const removeFromWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload._id;
    const productId = req.params.productId;

    const user = await User.findById(userId);
    if (!user)
      throw new HttpError({
        title: "User",
        detail: "User not found",
        code: StatusCodes.NOT_FOUND,
      });

    user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
    await user.save();

    jsonOne(res, StatusCodes.OK, { message: "Removed from wishlist" });
  } catch (error) {
    next(error);
  }
};

// DELETE /wishlist - Xóa toàn bộ wishlist
// export const clearWishlist = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const userId = req.user._id;

//     const user = await User.findById(userId);
//     if (!user)
//       throw new HttpError({
//         title: "User",
//         detail: "User not found",
//         code: StatusCodes.NOT_FOUND,
//       });

//     user.wishlist = [];
//     await user.save();

//     jsonOne(res, StatusCodes.OK, { message: "Wishlist cleared" });
//   } catch (error) {
//     next(error);
//   }
// };
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const userId = req.tokenPayload._id;
    // Kiểm tra mật khẩu mới và xác nhận mật khẩu

    const user = await User.findById(id);
    if (!user) {
      throw new HttpError({
        title: "user_not_found",
        detail: "Không tìm thấy người dùng",
        code: StatusCodes.NOT_FOUND,
      });
    }
    const userreq = await User.findById(userId);
    const userreqRole = await Role.findById(userreq.role);
    // Kiểm tra quyền: Chỉ Super Admin mới có thể reset mật khẩu của Super Admin khác
    const userRole = await Role.findById(user.role);
    if (
      userRole?.name === "Super Admin" &&
      userreqRole?.name !== "Super Admin"
    ) {
      throw new HttpError({
        title: "permission_denied",
        detail: "Bạn không có quyền đặt lại mật khẩu cho người dùng này",
        code: StatusCodes.FORBIDDEN,
      });
    }
    user.password = await hashPassword(newPassword);

    await user.save();
    jsonOne(res, StatusCodes.OK, { message: "Đặt lại mật khẩu thành công" });
    // Mã hóa mật khẩu mới
  } catch (error) {
    next(error);
  }
};
