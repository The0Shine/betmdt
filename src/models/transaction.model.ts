import mongoose, { Schema } from "mongoose";
import type { ITransaction } from "../interfaces/transaction.interface";

const TransactionSchema: Schema = new Schema(
  {
    transactionNumber: {
      type: String,
      unique: true,
    },
    type: {
      type: String,
      enum: ["income", "expense"], // Chỉ thu và chi
      required: true,
    },
    category: {
      type: String,
      enum: ["order", "stock"], // Chỉ đơn hàng và kho
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "credit_card", "e_wallet", "other"],
      default: "cash",
    },
    relatedOrder: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    relatedVoucher: {
      type: Schema.Types.ObjectId,
      ref: "Stock",
    },
    relatedCustomer: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
    // Metadata để lưu thông tin bổ sung
    metadata: {
      orderNumber: String,
      voucherNumber: String,
      voucherType: String, // import/export
      customerInfo: String,
      autoCreated: { type: Boolean, default: false }, // Đánh dấu tự động tạo
    },
  },
  {
    timestamps: true,
  }
);

// Tự động tạo mã giao dịch
TransactionSchema.pre<ITransaction>("save", async function (next) {
  if (this.isNew && !this.transactionNumber) {
    const prefix = this.type === "income" ? "TN" : "TX";
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

    // Tìm số thứ tự cuối cùng trong ngày
    const lastTransaction = await mongoose
      .model("Transaction")
      .findOne({
        transactionNumber: new RegExp(`^${prefix}${dateStr}`),
      })
      .sort({ transactionNumber: -1 });

    let sequence = 1;
    if (lastTransaction) {
      const lastSequence = Number.parseInt(
        lastTransaction.transactionNumber.slice(-4)
      );
      sequence = lastSequence + 1;
    }

    this.transactionNumber = `${prefix}${dateStr}${sequence
      .toString()
      .padStart(4, "0")}`;
  }

  next();
});

// Index
TransactionSchema.index({ transactionNumber: 1 });
TransactionSchema.index({ type: 1, category: 1 });
TransactionSchema.index({ transactionDate: -1 });
TransactionSchema.index({ relatedOrder: 1 });
TransactionSchema.index({ relatedVoucher: 1 });
TransactionSchema.index({ createdBy: 1 });
TransactionSchema.index({ createdAt: -1 });

export default mongoose.model<ITransaction>("Transaction", TransactionSchema);
