import type { Request, Response, NextFunction } from "express";
import Cart from "../models/cart.model";
import Product from "../models/product.model";
export const validateProductExists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const productId = Number.parseInt(req.body.productId);

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    const product = await Product.findOne({ where: { id: productId } });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    next();
  } catch (error) {
    console.error("Error validating product:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const validateQuantity = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const quantity = Number.parseInt(req.body.quantity);

  if (isNaN(quantity) || quantity < 1) {
    return res
      .status(400)
      .json({ message: "Quantity must be a positive number" });
  }

  next();
};

export const getUserCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Find or create cart for the user
    let cart = await Cart.findOne({ where: { userId: req.user.id } });

    if (!cart) {
      cart = await Cart.create({ userId: req.user.id });
    }

    // Attach cart to request object
    (req as any).cart = cart;
    next();
  } catch (error) {
    console.error("Error getting user cart:", error);
    res.status(500).json({ message: "Server error" });
  }
};
