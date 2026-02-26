import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import User from "../models/user.model";
import type { IUser } from "../interfaces/user.interface";
import HttpError from "../utils/httpError";

// Interface cho populated role
interface IPopulatedRole {
  _id: string;
  name: string;
  permissions: string[];
}

// Interface cho user với populated role
interface IUserWithPopulatedRole extends Omit<IUser, "role"> {
  role: IPopulatedRole;
}

// Extend Request interface
declare module "express" {
  interface Request {
    populatedUser?: IUserWithPopulatedRole;
  }
}

// Middleware load user info sau khi auth
export const loadUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tokenPayload) {
      throw new HttpError({
        title: "unauthorized",
        detail: "Token payload not found",
        code: StatusCodes.UNAUTHORIZED,
      });
    }

    const user = await User.findById(req.tokenPayload._id)
      .populate("role", "name permissions")
      .select("-password");
    if (!user) {
      throw new HttpError({
        title: "user_not_found",
        detail: "Người dùng không tồn tại",
        code: StatusCodes.UNAUTHORIZED,
      });
    }

    // Cast user với populated role
    req.populatedUser = user as unknown as IUserWithPopulatedRole;

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware kiểm tra permission
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.populatedUser) {
        throw new HttpError({
          title: "Bad Request",
          detail: "User not loaded",
          code: StatusCodes.BAD_REQUEST,
        });
      }

      if (!req.populatedUser.role) {
        throw new HttpError({
          title: "no_role",
          detail: "Tài khoản chưa được phân quyền",
          code: StatusCodes.FORBIDDEN,
        });
      }

      const userPermissions = req.populatedUser.role.permissions || [];

      // Super Admin có tất cả quyền
      if (userPermissions.includes("super.admin")) {
        return next();
      }

      if (!userPermissions.includes(permission)) {
        throw new HttpError({
          title: "insufficient_permissions",
          detail: "Bạn không có quyền thực hiện hành động này",
          code: StatusCodes.FORBIDDEN,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware kiểm tra nhiều permissions (OR logic)
export const requireAnyPermission = (permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.populatedUser?.role) {
        throw new HttpError({
          title: "no_role",
          detail: "Tài khoản chưa được phân quyền",
          code: StatusCodes.FORBIDDEN,
        });
      }

      const userPermissions = req.populatedUser.role.permissions || [];

      // Super Admin có tất cả quyền
      if (userPermissions.includes("super.admin")) {
        return next();
      }

      const hasPermission = permissions.some((permission) =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        throw new HttpError({
          title: "insufficient_permissions",
          detail: "Bạn không có quyền thực hiện hành động này",
          code: StatusCodes.FORBIDDEN,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware cho super admin
export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.populatedUser?.role) {
      throw new HttpError({
        title: "no_role",
        detail: "Tài khoản chưa được phân quyền",
        code: StatusCodes.FORBIDDEN,
      });
    }

    if (!req.populatedUser.role.permissions.includes("super.admin")) {
      throw new HttpError({
        title: "super_admin_required",
        detail: "Chỉ Super Admin mới có quyền thực hiện hành động này",
        code: StatusCodes.FORBIDDEN,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware cho admin
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.populatedUser?.role) {
      throw new HttpError({
        title: "no_role",
        detail: "Tài khoản chưa được phân quyền",
        code: StatusCodes.FORBIDDEN,
      });
    }

    const userPermissions = req.populatedUser.role.permissions;
    if (
      userPermissions.includes("super.admin") ||
      userPermissions.includes("admin.all")
    ) {
      return next();
    }

    throw new HttpError({
      title: "admin_required",
      detail: "Chỉ admin mới có quyền thực hiện hành động này",
      code: StatusCodes.FORBIDDEN,
    });
  } catch (error) {
    next(error);
  }
};

// Utility functions
export const isSuperAdmin = (user: IUserWithPopulatedRole): boolean => {
  if (!user.role) return false;
  return user.role.permissions.includes("super.admin");
};

export const isAdmin = (user: IUserWithPopulatedRole): boolean => {
  if (!user.role) return false;
  const permissions = user.role.permissions;
  return (
    permissions.includes("super.admin") || permissions.includes("admin.all")
  );
};

export const hasPermission = (
  user: IUserWithPopulatedRole,
  permission: string
): boolean => {
  if (!user.role) return false;
  const permissions = user.role.permissions;
  return (
    permissions.includes("super.admin") || permissions.includes(permission)
  );
};

export const hasAnyPermission = (
  user: IUserWithPopulatedRole,
  permissions: string[]
): boolean => {
  if (!user.role) return false;
  const userPermissions = user.role.permissions;
  return (
    userPermissions.includes("super.admin") ||
    permissions.some((permission) => userPermissions.includes(permission))
  );
};
