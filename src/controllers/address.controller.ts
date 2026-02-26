import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Address from "../models/address.model";
import { jsonOne, jsonAll } from "../utils/general";
import HttpError from "../utils/httpError";
import type { IAddressResponse } from "../interfaces/response/address.interface";

/**
 * @desc    Get all addresses for current user
 * @route   GET /api/addresses
 * @access  Private
 */
export const getMyAddresses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload?._id;
    
    const addresses = await Address.find({ user: userId })
      .sort({ isDefault: -1, createdAt: -1 });
    
    jsonAll<IAddressResponse>(res, StatusCodes.OK, addresses);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single address by ID
 * @route   GET /api/addresses/:id
 * @access  Private
 */
export const getAddressById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload?._id;
    const { id } = req.params;
    
    const address = await Address.findOne({ _id: id, user: userId });
    
    if (!address) {
      throw new HttpError({
        code: StatusCodes.NOT_FOUND,
        title: "not_found",
        detail: "Không tìm thấy địa chỉ",
      });
    }
    
    jsonOne<IAddressResponse>(res, StatusCodes.OK, address);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new address
 * @route   POST /api/addresses
 * @access  Private
 */
export const createAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload?._id;
    const {
      fullName,
      phone,
      provinceCode,
      provinceName,
      districtCode,
      districtName,
      wardCode,
      wardName,
      streetAddress,
      isDefault,
    } = req.body;

    // Validate required fields
    if (!fullName || !phone || !provinceName || !districtName || !wardName || !streetAddress) {
      throw new HttpError({
        code: StatusCodes.BAD_REQUEST,
        title: "validation_error",
        detail: "Vui lòng điền đầy đủ thông tin",
      });
    }

    // Compute fullAddress
    const fullAddress = `${streetAddress}, ${wardName}, ${districtName}, ${provinceName}`;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await Address.updateMany(
        { user: userId, isDefault: true },
        { isDefault: false }
      );
    }

    // Check if this is user's first address - auto set as default
    const existingCount = await Address.countDocuments({ user: userId });
    const shouldBeDefault = existingCount === 0 || isDefault;

    const address = await Address.create({
      user: userId,
      fullName,
      phone,
      provinceCode,
      provinceName,
      districtCode,
      districtName,
      wardCode,
      wardName,
      streetAddress,
      fullAddress,
      isDefault: shouldBeDefault,
    });

    jsonOne<IAddressResponse>(res, StatusCodes.CREATED, address);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update address
 * @route   PUT /api/addresses/:id
 * @access  Private
 */
export const updateAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload?._id;
    const { id } = req.params;
    const updateData = req.body;

    const address = await Address.findOne({ _id: id, user: userId });
    
    if (!address) {
      throw new HttpError({
        code: StatusCodes.NOT_FOUND,
        title: "not_found",
        detail: "Không tìm thấy địa chỉ",
      });
    }

    // Update fields
    const allowedFields = [
      "fullName", "phone", "provinceCode", "provinceName",
      "districtCode", "districtName", "wardCode", "wardName", "streetAddress"
    ];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        (address as any)[field] = updateData[field];
      }
    });

    // Recompute fullAddress
    address.fullAddress = `${address.streetAddress}, ${address.wardName}, ${address.districtName}, ${address.provinceName}`;

    await address.save();

    jsonOne<IAddressResponse>(res, StatusCodes.OK, address);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete address
 * @route   DELETE /api/addresses/:id
 * @access  Private
 */
export const deleteAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload?._id;
    const { id } = req.params;

    const address = await Address.findOne({ _id: id, user: userId });
    
    if (!address) {
      throw new HttpError({
        code: StatusCodes.NOT_FOUND,
        title: "not_found",
        detail: "Không tìm thấy địa chỉ",
      });
    }

    const wasDefault = address.isDefault;
    await address.deleteOne();

    // If deleted address was default, set another as default
    if (wasDefault) {
      const nextDefault = await Address.findOne({ user: userId }).sort({ createdAt: -1 });
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Đã xóa địa chỉ",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set address as default
 * @route   PUT /api/addresses/:id/default
 * @access  Private
 */
export const setDefaultAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload?._id;
    const { id } = req.params;

    const address = await Address.findOne({ _id: id, user: userId });
    
    if (!address) {
      throw new HttpError({
        code: StatusCodes.NOT_FOUND,
        title: "not_found",
        detail: "Không tìm thấy địa chỉ",
      });
    }

    // Unset all defaults for this user
    await Address.updateMany(
      { user: userId, isDefault: true },
      { isDefault: false }
    );

    // Set this address as default
    address.isDefault = true;
    await address.save();

    jsonOne<IAddressResponse>(res, StatusCodes.OK, address);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's default address
 * @route   GET /api/addresses/default
 * @access  Private
 */
export const getDefaultAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.tokenPayload?._id;

    const address = await Address.findOne({ user: userId, isDefault: true });
    
    if (!address) {
      // Return empty response if no default
      res.status(StatusCodes.OK).json({
        success: true,
        data: null,
      });
      return;
    }

    jsonOne<IAddressResponse>(res, StatusCodes.OK, address);
  } catch (error) {
    next(error);
  }
};
