import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Cart from "../models/cart.model";
import CartItem from "../models/cart-item.model";
import Product from "../models/product.model";
import { asyncHandler } from "../middlewares/async.middleware";
import { ErrorResponse } from "../utils/errorResponse";
import { jsonOne } from "../utils/general";
import { ICartItem } from "../interfaces/cart.interface";

// @desc    Lấy giỏ hàng của người dùng hiện tại
// @route   GET /api/cart
// @access  Private
export const getCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(req.user);

      const userId = req.user.id;

      // Tìm giỏ hàng của người dùng hoặc tạo mới nếu chưa có
      let cart = await Cart.findOne({ user: userId }).populate({
        path: "items",
        populate: {
          path: "product",
          select: "name price image description",
        },
      });

      if (!cart) {
        cart = await Cart.create({
          user: userId,
          items: [],
          totalPrice: 0,
        });
      }

      return jsonOne(res, StatusCodes.OK, cart);
    } catch (error) {
      console.log(error);
    }
    // Lấy user ID từ request (giả sử đã được xác thực qua middleware)
  }
);

// @desc    Thêm sản phẩm vào giỏ hàng
// @route   POST /api/cart
// @access  Private
export const addToCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    // Kiểm tra sản phẩm có tồn tại không
    const product = await Product.findById(productId);
    if (!product) {
      return next(
        new ErrorResponse(
          `Không tìm thấy sản phẩm với id ${productId}`,
          StatusCodes.NOT_FOUND
        )
      );
    }

    // Tìm hoặc tạo giỏ hàng cho người dùng
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [],
        totalPrice: 0,
      });
    }

    // Tìm giỏ hàng với các mục đã được populate
    cart = await Cart.findById(cart._id).populate({
      path: "items",
      populate: {
        path: "product",
      },
    });

    // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
    const cartItemIndex = cart.items.findIndex(
      (item: any) => item.product._id.toString() === productId
    );

    if (cartItemIndex > -1) {
      // Sản phẩm đã tồn tại, cập nhật số lượng
      const cartItem = await CartItem.findById(cart.items[cartItemIndex]);
      cartItem.quantity += Number(quantity);
      await cartItem.save();
    } else {
      // Sản phẩm chưa có trong giỏ hàng, tạo mới
      const newCartItem = await CartItem.create({
        product: productId,
        quantity: quantity,
        price: product.price,
      });

      // Thêm vào danh sách items của giỏ hàng
      cart.items.push(newCartItem._id as string & ICartItem);
    }

    // Tính lại tổng giá trị giỏ hàng
    await updateCartTotal(cart._id as string);

    // Lấy giỏ hàng đã cập nhật với đầy đủ thông tin
    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items",
      populate: {
        path: "product",
        select: "name price image description",
      },
    });

    return jsonOne(res, StatusCodes.OK, updatedCart);
  }
);

// @desc    Cập nhật số lượng sản phẩm trong giỏ hàng
// @route   PUT /api/cart/:itemId
// @access  Private
export const updateCartItem = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    // Kiểm tra số lượng hợp lệ
    if (quantity <= 0) {
      return next(
        new ErrorResponse("Số lượng phải lớn hơn 0", StatusCodes.BAD_REQUEST)
      );
    }

    // Tìm giỏ hàng của người dùng
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return next(
        new ErrorResponse("Không tìm thấy giỏ hàng", StatusCodes.NOT_FOUND)
      );
    }

    // Kiểm tra xem mục có thuộc giỏ hàng của người dùng không
    const itemExists = cart.items.some((item) => item.toString() === itemId);
    if (!itemExists) {
      return next(
        new ErrorResponse(
          "Mục này không thuộc giỏ hàng của bạn",
          StatusCodes.FORBIDDEN
        )
      );
    }

    // Cập nhật số lượng
    const cartItem = await CartItem.findById(itemId);
    if (!cartItem) {
      return next(
        new ErrorResponse(
          "Không tìm thấy mục trong giỏ hàng",
          StatusCodes.NOT_FOUND
        )
      );
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    // Cập nhật tổng giá trị giỏ hàng
    await updateCartTotal(cart._id as string);

    // Lấy giỏ hàng đã cập nhật
    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items",
      populate: {
        path: "product",
        select: "name price image description",
      },
    });

    return jsonOne(res, StatusCodes.OK, updatedCart);
  }
);

// @desc    Xóa sản phẩm khỏi giỏ hàng
// @route   DELETE /api/cart/:itemId
// @access  Private
export const removeCartItem = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;
    const { itemId } = req.params;

    // Tìm giỏ hàng của người dùng
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return next(
        new ErrorResponse("Không tìm thấy giỏ hàng", StatusCodes.NOT_FOUND)
      );
    }

    // Kiểm tra xem mục có thuộc giỏ hàng của người dùng không
    const itemExists = cart.items.some((item) => item.toString() === itemId);
    if (!itemExists) {
      return next(
        new ErrorResponse(
          "Mục này không thuộc giỏ hàng của bạn",
          StatusCodes.FORBIDDEN
        )
      );
    }

    // Xóa mục khỏi giỏ hàng
    cart.items = cart.items.filter((item): item is string => {
      const itemIdString =
        typeof item === "string" ? item : item._id.toString();
      return itemIdString !== itemId;
    });
    await cart.save();

    // Xóa mục khỏi bảng CartItem
    await CartItem.findByIdAndDelete(itemId);

    // Cập nhật tổng giá trị giỏ hàng
    await updateCartTotal(cart._id as string);

    // Lấy giỏ hàng đã cập nhật
    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items",
      populate: {
        path: "product",
        select: "name price image description",
      },
    });

    return jsonOne(res, StatusCodes.OK, updatedCart);
  }
);

// @desc    Xóa toàn bộ giỏ hàng
// @route   DELETE /api/cart
// @access  Private
export const clearCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id;

    // Tìm giỏ hàng của người dùng
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return next(
        new ErrorResponse("Không tìm thấy giỏ hàng", StatusCodes.NOT_FOUND)
      );
    }

    // Xóa tất cả các mục trong giỏ hàng
    await CartItem.deleteMany({ _id: { $in: cart.items } });

    // Cập nhật giỏ hàng
    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    return jsonOne(res, StatusCodes.OK, cart);
  }
);

// Hàm hỗ trợ để cập nhật tổng giá trị giỏ hàng
const updateCartTotal = async (cartId: string) => {
  const cart = await Cart.findById(cartId).populate({
    path: "items",
    populate: {
      path: "product",
    },
  });

  if (!cart) {
    throw new Error("Không tìm thấy giỏ hàng");
  }

  // Tính tổng giá trị
  let totalPrice = 0;
  for (const item of cart.items) {
    const cartItem = await CartItem.findById(item).populate("product");
    if (cartItem) {
      totalPrice += cartItem.quantity * cartItem.price;
    }
  }

  // Cập nhật tổng giá trị
  cart.totalPrice = totalPrice;
  await cart.save();

  return cart;
};
