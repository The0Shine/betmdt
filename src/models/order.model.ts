import mongoose, { Schema } from "mongoose";
import type { IOrder } from "../interfaces/order.interface";

const OrderSchema: Schema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Product",
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],

    paymentMethod: {
      type: String,
      required: true,
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },
    
    // Reference to original address (optional)
    shippingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
    },
    
    // Snapshot of address at order time (required)
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      provinceName: { type: String, required: true },
      districtName: { type: String, required: true },
      wardName: { type: String, required: true },
      streetAddress: { type: String, required: true },
      fullAddress: { type: String, required: true },
    },
    
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "cancelled",
        "completed",
        "refund_requested",
        "refunded",
      ],
      default: "pending",
    },

    refundInfo: {
      refundReason: { type: String },
      refundDate: { type: Date },
      refundTransactionId: { type: String },
      notes: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IOrder>("Order", OrderSchema);
