import { Schema, model, Document } from "mongoose";

export interface ITransaction extends Document {
  user: Schema.Types.ObjectId;
  order: Schema.Types.ObjectId;
  amount: number;
  method: string;
  status: string;
}

const transactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    amount: { type: Number, required: true },
    method: { type: String },
    status: { type: String, default: "pending" },
  },
  { timestamps: true }
);

export default model<ITransaction>("Transaction", transactionSchema);
