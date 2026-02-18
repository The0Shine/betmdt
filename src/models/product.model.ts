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
    // Consolidated tags array replaces: hot, featured, recommended, new
    tags: {
      type: [String],
      index: true,
      default: [],
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
    published: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to auto-update oldPrice when price changes
ProductSchema.pre<IProduct>("save", function (next) {
  // Auto-set oldPrice when price is modified (not on create)
  if (this.isModified("price") && !this.isNew) {
    // Get the original price from DB before this save
    // Note: this.get("price") returns the NEW value, not old
    // We need to use $locals to store original or handle in controller
    // For simplicity, controller will handle oldPrice logic
  }

  // Auto-update status based on quantity
  if (this.isModified("quantity")) {
    this.status = this.quantity > 0 ? "in-stock" : "out-of-stock";
  }
  next();
});

export default mongoose.model<IProduct>("Product", ProductSchema);

