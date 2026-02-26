import mongoose, { Schema } from "mongoose";
import { ICart } from "../interfaces/cart.interface";

const CartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        type: Schema.Types.ObjectId,
        ref: "CartItem",
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: MongoDB will automatically delete carts that haven't been updated in 30 days.
CartSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<ICart>("Cart", CartSchema);
