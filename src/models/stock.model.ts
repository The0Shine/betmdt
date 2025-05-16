import mongoose, { Schema } from "mongoose";
export interface IStockAdjustmentProduct {
  productId: string;
  quantity: number;
  note?: string;
  unit: string;
  productName?: string;
}

export interface IStockAdjustment {
  _id?: string;
  type: "import" | "export" | "adjustment";
  reason: string;
  products: IStockAdjustmentProduct[];
  status: "draft" | "completed";
  createdBy?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockAdjustmentResponse {
  success: boolean;
  data: IStockAdjustment;
}

export interface StockAdjustmentsResponse {
  success: boolean;
  count: number;
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
  data: IStockAdjustment[];
}

export interface StockAdjustmentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  type?: "import" | "export" | "adjustment";
  status?: "draft" | "completed";
  startDate?: string;
  endDate?: string;
}

const StockAdjustmentProductSchema = new Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    required: true,
  },
  note: {
    type: String,
  },
});

const StockAdjustmentSchema: Schema = new Schema(
  {
    type: {
      type: String,
      enum: ["import", "export", "adjustment"],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    products: [StockAdjustmentProductSchema],
    status: {
      type: String,
      enum: ["draft", "completed"],
      default: "draft",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IStockAdjustment>(
  "StockAdjustment",
  StockAdjustmentSchema
);
