import mongoose, { Schema } from "mongoose";
import type { Document, Types } from "mongoose";

export interface IStockItem {
  product: Types.ObjectId;
  productName: string;
  quantity: number;
  unit: string;
  costPrice: number;
  note?: string;
}

export interface IStock extends Document {
  _id: Types.ObjectId;
  voucherNumber: string;
  type: "import" | "export";
  status: "pending" | "approved" | "rejected" | "cancelled";
  reason: string;
  items: IStockItem[];
  totalValue: number;
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  relatedOrder?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStockHistory extends Document {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  productName: string;
  type: "import" | "export";
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  reason: string;
  relatedVoucher: Types.ObjectId;
  voucherNumber: string;
  relatedOrder?: Types.ObjectId;
  createdBy: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unit: {
    type: String,
    required: true,
  },
  costPrice: {
    type: Number,
    min: 0,
    default: 0,
  },
  note: {
    type: String,
    trim: true,
  },
});

const StockSchema: Schema = new Schema(
  {
    voucherNumber: {
      type: String,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["import", "export"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    items: [StockItemSchema],
    totalValue: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    relatedOrder: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const StockHistorySchema: Schema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["import", "export"],
      required: true,
    },
    quantityBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    quantityChange: {
      type: Number,
      required: true,
    },
    quantityAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    relatedVoucher: {
      type: Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
    },
    voucherNumber: {
      type: String,
      required: true,
    },
    relatedOrder: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Tự động tạo mã phiếu
StockSchema.pre<IStock>("save", async function (next) {
  if (this.isNew && !this.voucherNumber) {
    const prefix = this.type === "import" ? "PN" : "PX";
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

    // Tìm số thứ tự cuối cùng trong ngày
    const lastVoucher = await mongoose
      .model("Stock")
      .findOne({
        voucherNumber: new RegExp(`^${prefix}${dateStr}`),
      })
      .sort({ voucherNumber: -1 });

    let sequence = 1;
    if (lastVoucher) {
      const lastSequence = Number.parseInt(lastVoucher.voucherNumber.slice(-3));
      sequence = lastSequence + 1;
    }

    this.voucherNumber = `${prefix}${dateStr}${sequence
      .toString()
      .padStart(3, "0")}`;
  }

  // Tính tổng giá trị
  if (this.isModified("items")) {
    this.totalValue = this.items.reduce((total, item) => {
      return total + item.costPrice * item.quantity;
    }, 0);
  }

  next();
});

// Index cho Stock
StockSchema.index({ type: 1, status: 1 });
StockSchema.index({ createdBy: 1 });
StockSchema.index({ relatedOrder: 1 });
StockSchema.index({ createdAt: -1 });

// Index cho StockHistory
StockHistorySchema.index({ product: 1, createdAt: -1 });
StockHistorySchema.index({ type: 1 });
StockHistorySchema.index({ relatedVoucher: 1 });
StockHistorySchema.index({ relatedOrder: 1 });
StockHistorySchema.index({ voucherNumber: 1 });

export const Stock = mongoose.model<IStock>("Stock", StockSchema);
export const StockHistory = mongoose.model<IStockHistory>(
  "StockHistory",
  StockHistorySchema
);
