import mongoose, { Schema } from "mongoose";
import type { IProduct } from "../interfaces/product.interface";

const ProductSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    oldPrice: {
      type: Number,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      ref: "Category",
    },
    subcategory: {
      type: String,
      ref: "Category",
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["in-stock", "out-of-stock"],
      default: "in-stock",
    },
    image: {
      type: String,
    },
    images: [
      {
        type: String,
      },
    ],
    barcode: {
      type: String,
      unique: true,
      sparse: true,
    },
    unit: {
      type: String,
      required: true,
    },
    costPrice: {
      type: Number,
      min: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    recommended: {
      type: Boolean,
      default: false,
    },
    hot: {
      type: Boolean,
      default: false,
    },
    new: {
      type: Boolean,
      default: false,
    },
    specifications: {
      type: Map,
      of: String,
    },
    rating: {
      type: Number,
      default: 0,
    },
    reviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware para actualizar el estado del producto basado en el stock
ProductSchema.pre<IProduct>("save", function (next) {
  if (this.isModified("stock")) {
    this.status = this.quantity > 0 ? "in-stock" : "out-of-stock";
  }
  next();
});

export default mongoose.model<IProduct>("Product", ProductSchema);
