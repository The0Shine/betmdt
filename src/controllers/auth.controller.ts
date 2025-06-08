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

    jsonOne(res, StatusCodes.CREATED, {
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
        detail: "Access Forbidden!",
        code: StatusCodes.NOT_FOUND,
      });
    }
    // console.log(user);

    // wrong password
    const isMatch = comparePassword(password, user.password);
    if (!isMatch) {
      throw new HttpError({
        title: "invalid_username_or_password",
        detail: "Access Forbidden!",
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

    jsonOne(res, StatusCodes.OK, {
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cerrar sesión / limpiar cookie
// @route   GET /api/auth/logout
// @access  Private
// export const logout = asyncHandler(async (req: Request, res: Response) => {
//   res.cookie("token", "none", {
//     expires: new Date(Date.now() + 10 * 1000),
//     httpOnly: true,
//   });

//   res.status(200).json({
//     success: true,
//     data: {},
//   });
// });

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
    jsonOne(res, StatusCodes.OK, user);
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

    // @ts-ignore
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  }
);

// @desc    Actualizar contraseña
// @route   PUT /api/auth/updatepassword
// @access  Private
// export const updatePassword = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     // @ts-ignore
//     const user = await User.findById(req.user.id).select("+password");

//     // Verificar contraseña actual
//     if (!user) {
//       return next(new ErrorResponse("Usuario no encontrado", 404));
//     }
//     const isMatch = await user.matchPassword(req.body.currentPassword);

//     if (!isMatch) {
//       return next(new ErrorResponse("Contraseña actual incorrecta", 401));
//     }

//     user.password = req.body.newPassword;
//     await user.save();

//     sendTokenResponse(user, 200, res);
//   }
// );

// @desc    Olvidé mi contraseña
// @route   POST /api/auth/forgotpassword
// @access  Public
// export const forgotPassword = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const user = await User.findOne({ email: req.body.email });

//     if (!user) {
//       return next(new ErrorResponse("No hay usuario con ese email", 404));
//     }

//     // Obtener token de restablecimiento
//     const resetToken = user.getResetPasswordToken();

//     await user.save({ validateBeforeSave: false });

//     // Crear URL de restablecimiento
//     const resetUrl = `${req.protocol}://${req.get(
//       "host"
//     )}/api/auth/resetpassword/${resetToken}`;

//     const message = `Está recibiendo este email porque usted (o alguien más) ha solicitado el restablecimiento de una contraseña. Por favor haga una solicitud PUT a: \n\n ${resetUrl}`;

//     try {
//       await sendEmail({
//         email: user.email,
//         subject: "Token de restablecimiento de contraseña",
//         message,
//       });

//       res.status(200).json({ success: true, data: "Email enviado" });
//     } catch (err) {
//       console.log(err);
//       user.resetPasswordToken = undefined;
//       user.resetPasswordExpire = undefined;

//       await user.save({ validateBeforeSave: false });

//       return next(new ErrorResponse("No se pudo enviar el email", 500));
//     }
//   }
// );

// @desc    Restablecer contraseña
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
// export const resetPassword = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     // Obtener token hasheado
//     const resetPasswordToken = crypto
//       .createHash("sha256")
//       .update(req.params.resettoken)
//       .digest("hex");

//     const user = await User.findOne({
//       resetPasswordToken,
//       resetPasswordExpire: { $gt: Date.now() },
//     });

//     if (!user) {
//       return next(new ErrorResponse("Token inválido", 400));
//     }

//     // Establecer nueva contraseña
//     user.password = req.body.password;
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpire = undefined;
//     await user.save();

//     sendTokenResponse(user, 200, res);
//   }
// );

// // Función auxiliar para enviar respuesta con token
// const sendTokenResponse = (user: any, statusCode: number, res: Response) => {
//   // Crear token
//   const token = user.getSignedJwtToken();

//   const options = {
//     expires: new Date(
//       Date.now() +
//         Number.parseInt(env.ACCESS_TOKEN_EXPIRATION) * 24 * 60 * 60 * 1000
//     ),
//     httpOnly: true,
//   };

//   res.status(statusCode).cookie("token", token, options).json({
//     success: true,
//     token,
//   });
// };
