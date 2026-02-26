import type { Request, Response, NextFunction } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import crypto from "crypto";
import User from "../models/user.model";
import { asyncHandler } from "../middlewares/async.middleware";
import Role from "../models/role.model";
import { ErrorResponse } from "../utils/errorResponse";
import env from "../config/env";
import { StatusCodes } from "http-status-codes";
import { comparePassword, hashPassword } from "../utils/crypto";
import { jsonOne } from "../utils/general";
import HttpError from "../utils/httpError";
import {
  signAccessToken,
  signRefreshToken,
  decodeRefreshToken,
} from "../utils/jwt";
import { IAuthUserReqBody } from "../interfaces/request/admin.interface";
import { ILoginResponse, IRegisterResponse } from "../interfaces/response/auth.interface";
import { IUserResponse } from "../interfaces/response/user.interface";

// @desc    Registrar usuario
// @route   POST /api/auth/register
// @access  Public
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firstName, lastName, username: email, password } = req.body;
    // Kiểm tra các trường bắt buộc
    if (!firstName || !lastName || !email || !password) {
      throw new HttpError({
        title: "missing_fields",
        detail: "First name, last name, email, password",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new HttpError({
        title: "user_already_exists",
        detail: "Email is already registered",
        code: StatusCodes.CONFLICT,
      });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await hashPassword(password);

    // Lấy role mặc định từ collection Role
    const defaultRole = await Role.findOne({ name: "user" });
    if (!defaultRole) {
      throw new HttpError({
        title: "role_not_found",
        detail: "Default role 'user' not found",
        code: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    // Lưu người dùng vào DB
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: defaultRole._id,
    });

    await newUser.save();

    jsonOne<IRegisterResponse>(res, StatusCodes.CREATED, {
      message: "User registered successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Iniciar sesión
// @route   POST /api/auth/login
// @access  Public
export const login = async (
  req: Request<ParamsDictionary, any, IAuthUserReqBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { password, username } = req.body;

    const user = await User.findOne({
      $or: [{ email: username }, { username: req.body.username }],
    });
    if (!user) {
      throw new HttpError({
        title: "invalid_username_or_password",
        detail: "Tài khoản hoặc mật khẩu không đúng",
        code: StatusCodes.NOT_FOUND,
      });
    }
    // console.log(user);

    // wrong password
    const isMatch = comparePassword(password, user.password);
    if (!isMatch) {
      throw new HttpError({
        title: "invalid_username_or_password",
        detail: "Tài khoản hoặc mật khẩu không đúng",
        code: StatusCodes.NOT_FOUND,
      });
    }

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({
        _id: user._id.toString(),
        role: user.role.toString(),
      }),
      signRefreshToken({
        _id: user._id.toString(),
        role: user.role.toString(),
      }),
    ]);

    jsonOne<ILoginResponse>(res, StatusCodes.OK, {
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener usuario actual
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(
      req?.tokenPayload?._id,
      "-password"
    ).populate("role");
    if (!user)
      throw new HttpError({
        title: "User",
        detail: "User not found",
        code: StatusCodes.NOT_FOUND,
      });
    // if (!req.query.search) {
    //     const cacheKey = req.originalUrl;

    //     await setOneCache(cacheKey, user);
    // }
    jsonOne<IUserResponse>(res, StatusCodes.OK, user as unknown as IUserResponse);
  } catch (error) {
    next(error);
  }
};

// @desc    Actualizar detalles de usuario
// @route   PUT /api/auth/updatedetails
// @access  Private
export const updateDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      avatar: req.body.avatar,
    };

    const userId = req.tokenPayload._id;
    const user = await User.findByIdAndUpdate(userId, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    const userObj = user!.toObject();
    delete userObj.role;

    jsonOne(res, 200, userObj);
  }
);
export const changePassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req?.tokenPayload?._id;
    if (!currentPassword || !newPassword) {
      throw new HttpError({
        title: "missing_fields",
        detail: "Current password and new password are required",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new HttpError({
        title: "user_not_found",
        detail: "User not found",
        code: StatusCodes.NOT_FOUND,
      });
    }

    const isMatch = comparePassword(currentPassword, user.password);
    if (!isMatch) {
      throw new HttpError({
        title: "incorrect_password",
        detail: "Mật khẩu hiện tại không đúng",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    jsonOne(res, StatusCodes.OK, { message: "Đổi mật khẩu thành công" });
  }
);
