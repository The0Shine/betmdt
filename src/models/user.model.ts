import mongoose, { Schema } from "mongoose";
import type { IUser } from "../interfaces/user.interface";

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true }, // 👈
    lastName: { type: String, required: true }, // 👈
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    avatar: String,
    phone: {
      type: String,
    },
    address: String,
    role: {
      type: Schema.Types.ObjectId,
      ref: "Role",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>("User", UserSchema);
