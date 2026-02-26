import type { Request, Response, NextFunction } from "express";
import Cart from "../models/cart.model";
import CartItem from "../models/cart-item.model";
import Product from "../models/product.model";
import { StatusCodes } from "http-status-codes";
import HttpError from "../utils/httpError";
import { jsonOne } from "../utils/general";
import { ICartResponse } from "../interfaces/response/cart.interface";
import { IMessageResponse } from "../interfaces/response/response.interface";

// Hàm tính tổng giá trị giỏ hàng
const calculateTotalPrice = async (cartItemIds: string[]): Promise<number> => {
  const cartItems = await CartItem.find({ _id: { $in: cartItemIds } });
  return cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
};

// @desc    Lấy giỏ hàng của người dùng
// @route   GET /api/cart
// @access  Private
export const getCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload._id;

    // Tìm giỏ hàng của người dùng
    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items",
      populate: {
        path: "product",
        select: "_id name price image description quantity",
      },
    });

    if (!cart) {
      // Nếu không tìm thấy giỏ hàng, tạo giỏ hàng mới
      const newCart = await Cart.create({
        user: userId,
        items: [],
        totalPrice: 0,
      });

      jsonOne(res, StatusCodes.OK, newCart);
      return;
    }

    jsonOne(res, StatusCodes.OK, cart);
  } catch (error) {
    next(error);
  }
};

// @desc    Thêm sản phẩm vào giỏ hàng
// @route   POST /api/cart
// @access  Private
export const addItemToCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload._id;
    const { productId, quantity } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!productId || !quantity) {
      throw new HttpError({
        title: "missing_fields",
        detail: "Product ID and quantity are required",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Kiểm tra sản phẩm có tồn tại không
    const product = await Product.findById(productId);
    if (!product) {
      throw new HttpError({
        title: "product_not_found",
        detail: `Product not found with id of ${productId}`,
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Tìm giỏ hàng của người dùng
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [],
        totalPrice: 0,
        lastActivity: new Date(),
      });
    }

    // Tìm xem sản phẩm đã có trong giỏ hàng chưa
    // Lấy tất cả các CartItem trong giỏ hàng
    const cartItems = await CartItem.find({
      _id: { $in: cart.items },
    }).populate("product");

    // Tìm CartItem có product trùng với productId
    const existingItemIndex = cartItems.findIndex(
      (item) =>
        item.product &&
        item.product._id &&
        item.product._id.toString() === productId
    );

    let cartItem;

    if (existingItemIndex > -1) {
      // Nếu sản phẩm đã có trong giỏ hàng, cập nhật số lượng
      cartItem = cartItems[existingItemIndex];
      cartItem.quantity = quantity;
      cartItem.price = product.price;
      await cartItem.save();
    } else {
      // Nếu sản phẩm chưa có trong giỏ hàng, thêm mới
      cartItem = await CartItem.create({
        product: productId,
        quantity: quantity,
        price: product.price,
      });

      // Thêm cartItem vào danh sách items của cart
      cart.items.push(cartItem._id);
    }

    // Cập nhật tổng giá trị giỏ hàng
    cart.totalPrice = await calculateTotalPrice(cart.items as string[]);
    await Cart.findByIdAndUpdate(
      cart._id,
      {
        items: cart.items,
        totalPrice: cart.totalPrice,
        lastActivity: new Date(),
      },
      { new: true }
    );

    // Lấy giỏ hàng đã cập nhật với đầy đủ thông tin
    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items",
      populate: {
        path: "product",
        select: "_id name price image description quantity",
      },
    });

    jsonOne(res, StatusCodes.OK, updatedCart);
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật số lượng sản phẩm trong giỏ hàng
// @route   PUT /api/cart/:itemId
// @access  Private
export const updateCartItemQuantity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload._id;
    const itemId = req.params.itemId;

    const { quantity } = req.body;

    // Kiểm tra số lượng có hợp lệ không
    if (!quantity || quantity < 1) {
      throw new HttpError({
        title: "invalid_quantity",
        detail: "Quantity must be at least 1",
        code: StatusCodes.BAD_REQUEST,
      });
    }

    // Tìm giỏ hàng của người dùng
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      throw new HttpError({
        title: "cart_not_found",
        detail: "Cart not found",
        code: StatusCodes.NOT_FOUND,
      });
    }

    // SECURITY: Verify cart item belongs to user's cart before update
    const itemBelongsToCart = cart.items.some(
      (id) => id.toString() === itemId
    );
    if (!itemBelongsToCart) {
      throw new HttpError({
        title: "item_not_in_cart",
        detail: "Cart item does not belong to your cart",
        code: StatusCodes.FORBIDDEN,
      });
    }

    // Cập nhật số lượng của CartItem
    const cartItem = await CartItem.findById(itemId).populate("product");
    if (!cartItem) {
      throw new HttpError({
        title: "item_not_found",
        detail: "Cart item not found",
        code: StatusCodes.NOT_FOUND,
      });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    // Cập nhật tổng giá trị giỏ hàng
    cart.totalPrice = await calculateTotalPrice(cart.items as string[]);
    await Cart.findByIdAndUpdate(
      cart._id,
      {
        totalPrice: cart.totalPrice,
        lastActivity: new Date(),
      },
      { new: true }
    );

    // Lấy giỏ hàng đã cập nhật với đầy đủ thông tin
    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items",
      populate: {
        path: "product",
        select: "_id name price image description quantity",
      },
    });

    jsonOne(res, StatusCodes.OK, updatedCart);
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa sản phẩm khỏi giỏ hàng
// @route   DELETE /api/cart/:itemId
// @access  Private
export const deleteCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload._id;
    const itemId = req.params.itemId;

    // Tìm giỏ hàng của người dùng
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      throw new HttpError({
        title: "cart_not_found",
        detail: "Cart not found",
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Kiểm tra xem item có thuộc giỏ hàng không
    const itemIndex = cart.items.findIndex((id) => id.toString() === itemId);

    if (itemIndex === -1) {
      throw new HttpError({
        title: "item_not_in_cart",
        detail: "Item not found in cart",
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Xóa CartItem
    await CartItem.findByIdAndDelete(itemId);

    // Xóa tham chiếu đến CartItem trong giỏ hàng
    cart.items.splice(itemIndex, 1);
    cart.totalPrice = await calculateTotalPrice(cart.items as string[]);
    await Cart.findByIdAndUpdate(
      cart._id,
      {
        items: cart.items,
        totalPrice: cart.totalPrice,
        lastActivity: new Date(),
      },
      { new: true }
    );

    // Lấy giỏ hàng đã cập nhật với đầy đủ thông tin
    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items",
      populate: {
        path: "product",
        select: "_id name price image description quantity",
      },
    });

    jsonOne(res, StatusCodes.OK, updatedCart);
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa toàn bộ giỏ hàng
// @route   DELETE /api/cart
// @access  Private
export const clearCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.tokenPayload._id;

    // Tìm giỏ hàng của người dùng
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      throw new HttpError({
        title: "cart_not_found",
        detail: "Cart not found",
        code: StatusCodes.NOT_FOUND,
      });
    }

    // Xóa tất cả CartItem liên quan đến giỏ hàng
    await CartItem.deleteMany({ _id: { $in: cart.items } });

    // Xóa tất cả tham chiếu đến CartItem trong giỏ hàng
    cart.items = [];
    cart.totalPrice = 0;
    await Cart.findByIdAndUpdate(
      cart._id,
      {
        items: [],
        totalPrice: 0,
        lastActivity: new Date(),
      },
      { new: true }
    );

    jsonOne<IMessageResponse>(res, StatusCodes.OK, { message: "Cart cleared successfully" });
  } catch (error) {
    next(error);
  }
};
