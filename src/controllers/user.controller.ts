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
// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const pageOptions = createPageOptions(req);
  const searchCondition = createSearchText(pageOptions.search);
  let query: any = {
    ...searchCondition,
  };
  const count = await User.countDocuments(query);
  const users = await User.find(query, {
    password: false,
  })
    .populate("role")
    .limit(pageOptions.limit)
    .skip((pageOptions.page - 1) * pageOptions.limit)
    .sort({ createdAt: -1 });
  const result = {
    users,
  };
  // Tạo phân trang
  const meta = {
    total: count,
    limit: pageOptions.limit,
    totalPages: Math.ceil(count / pageOptions.limit),
    currentPage: pageOptions.page,
  };

  // Gửi response
  return jsonAll(res, StatusCodes.OK, result.users, meta);
});

// @desc    Obtener un usuario por ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = asyncHandler(
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

    return jsonOne(res, StatusCodes.OK, user);
  }
);

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
export const updateUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let user = await User.findById(req.params.id);

    if (!user) {
      return next(
        new ErrorResponse(
          `Usuario no encontrado con id ${req.params.id}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    return jsonOne(res, StatusCodes.OK, user!);
  }
);

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
