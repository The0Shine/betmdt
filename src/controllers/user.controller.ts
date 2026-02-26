import type { Request, Response, NextFunction } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { StatusCodes } from "http-status-codes";
import User from "../models/user.model";
import { IUser } from "../interfaces/user.interface";
import { asyncHandler } from "../middlewares/async.middleware";
import { ErrorResponse } from "../utils/errorResponse";
import { jsonOne } from "../utils/general";
import { jsonAll } from "../utils/general";
import { createPageOptions, createSearchText } from "../utils/pagination";
import { IUserResponse } from "../interfaces/response/user.interface";
import { ITokenResponse } from "../interfaces/response/auth.interface";
import { IMessageResponse } from "../interfaces/response/response.interface";
import {
  decodeRefreshToken,
  signAccessToken,
  signRefreshToken,
} from "../utils/jwt";
import HttpError from "../utils/httpError";
import Role from "../models/role.model";
import mongoose, { Types } from "mongoose";
import { token } from "morgan";
import { hashPassword } from "../utils/crypto";
import { IRefreshReqBody } from "../interfaces/request/users.interface";
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

    // ThÃªm thÃ´ng tin canDelete vÃ  canEdit
    const usersWithPermissions = users.map((user) => {
      const userObj = user.toObject();
      const role = userObj.role as any;

      return {
        ...userObj,
        canDelete: role?.name !== "Super Admin", // KhÃ´ng thá»ƒ xÃ³a Super Admin
        canEdit: role?.name !== "Super Admin", // KhÃ´ng thá»ƒ sá»­a Super Admin
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

    jsonAll<IUserResponse>(res, StatusCodes.OK, usersWithPermissions as any, meta);
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
        detail: "KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng",
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

    jsonOne<IUserResponse>(res, StatusCodes.OK, userWithPermissions as any);
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
      detail: "Máº­t kháº©u pháº£i cÃ³ Ã­t nháº¥t 6 kÃ½ tá»±",
      code: StatusCodes.BAD_REQUEST,
    });
  }

  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    ...rest,
    password: hashedPassword,
  });

  // Note: newUser.save() returns the document, simpler than pulling from DB again but might miss virtuals if not careful
  // Here we return simpler object or re-fetch if needed. For now casting.
  const userObj = user.toObject();
  delete userObj.role;
  return jsonOne<IUserResponse>(res, StatusCodes.CREATED, userObj);
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
        detail: "KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng",
        code: StatusCodes.NOT_FOUND,
      });
    }

    // KhÃ´ng cho phÃ©p sá»­a Super Admin (trá»« khi ngÆ°á»i sá»­a cÅ©ng lÃ  Super Admin)
    const userRole = user.role as any;
    if (userRole?.name === "Super Admin") {
      throw new HttpError({
        title: "cannot_edit_super_admin",
        detail: "KhÃ´ng thá»ƒ chá»‰nh sá»­a tÃ i khoáº£n Super Admin",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Kiá»ƒm tra email Ä‘Ã£ tá»“n táº¡i (ngoáº¡i trá»« user hiá»‡n táº¡i)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        throw new HttpError({
          title: "email_exists",
          detail: "Email Ä‘Ã£ tá»“n táº¡i",
          code: StatusCodes.BAD_REQUEST,
        });
      }
    }

    // Kiá»ƒm tra role tá»“n táº¡i
    if (role) {
      const roleExists = await Role.findById(role);
      if (!roleExists) {
        throw new HttpError({
          title: "role_not_found",
          detail: "Vai trÃ² khÃ´ng tá»“n táº¡i",
          code: StatusCodes.BAD_REQUEST,
        });
      }

      // KhÃ´ng cho phÃ©p gÃ¡n role Super Admin (trá»« khi ngÆ°á»i gÃ¡n lÃ  Super Admin)
      if (roleExists.name === "Super Admin") {
        throw new HttpError({
          title: "cannot_assign_super_admin",
          detail: "Chá»‰ Super Admin má»›i cÃ³ quyá»n nÃ y",
          code: StatusCodes.FORBIDDEN,
        });
      }
    }

    // Build update object based on fields present in req.body
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (role !== undefined) updateData.role = role;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
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

    jsonOne<IUserResponse>(res, StatusCodes.OK, userWithPermissions as any);
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

    const oldRTPayload = await decodeRefreshToken(rt); // Giáº£i mÃ£ refresh token

    // Náº¿u decode thÃ nh cÃ´ng thÃ¬ sinh token má»›i
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

    jsonOne<ITokenResponse>(res, StatusCodes.OK, { accessToken, refreshToken });
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

    jsonOne<Types.ObjectId[]>(res, StatusCodes.OK, user.wishlist);
  } catch (error) {
    next(error);
  }
};

// POST /wishlist/:productId - ThÃªm sáº£n pháº©m vÃ o wishlist
export const addToWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload._id;
    const productId = req.params.productId;

    // Kiá»ƒm tra productId há»£p lá»‡
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

    // Chuyá»ƒn productId vá» ObjectId
    const productObjectId = new Types.ObjectId(productId);

    // Kiá»ƒm tra trÃ¹ng láº·p
    const alreadyExists = user.wishlist?.some((id) =>
      id.equals(productObjectId)
    );

    if (!alreadyExists) {
      user.wishlist?.push(productObjectId);
      await user.save();
    }

    jsonOne<IMessageResponse>(res, StatusCodes.OK, { message: "Added to wishlist" });
  } catch (error) {
    next(error);
  }
};

// DELETE /wishlist/:productId - XÃ³a sáº£n pháº©m khá»i wishlist
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

    jsonOne<IMessageResponse>(res, StatusCodes.OK, { message: "Removed from wishlist" });
  } catch (error) {
    next(error);
  }
};

// DELETE /wishlist - XÃ³a toÃ n bá»™ wishlist
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
    // Kiá»ƒm tra máº­t kháº©u má»›i vÃ  xÃ¡c nháº­n máº­t kháº©u

    const user = await User.findById(id);
    if (!user) {
      throw new HttpError({
        title: "user_not_found",
        detail: "KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng",
        code: StatusCodes.NOT_FOUND,
      });
    }
    const userreq = await User.findById(userId);
    const userreqRole = await Role.findById(userreq.role);
    // Kiá»ƒm tra quyá»n: Chá»‰ Super Admin má»›i cÃ³ thá»ƒ reset máº­t kháº©u cá»§a Super Admin khÃ¡c
    const userRole = await Role.findById(user.role);
    if (
      userRole?.name === "Super Admin" &&
      userreqRole?.name !== "Super Admin"
    ) {
      throw new HttpError({
        title: "permission_denied",
        detail: "Báº¡n khÃ´ng cÃ³ quyá»n Ä‘áº·t láº¡i máº­t kháº©u cho ngÆ°á»i dÃ¹ng nÃ y",
        code: StatusCodes.FORBIDDEN,
      });
    }
    user.password = await hashPassword(newPassword);

    await user.save();
    jsonOne<IMessageResponse>(res, StatusCodes.OK, { message: "Äáº·t láº¡i máº­t kháº©u thÃ nh cÃ´ng" });
    // MÃ£ hÃ³a máº­t kháº©u má»›i
  } catch (error) {
    next(error);
  }
};
