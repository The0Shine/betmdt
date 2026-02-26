import mongoose, { Schema } from "mongoose";
import { ICartItem } from "../interfaces/cart.interface";

const CartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    price: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: Cleanup orphan cart items after 30 days of inactivity.
CartItemSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<ICartItem>("CartItem", CartItemSchema);
