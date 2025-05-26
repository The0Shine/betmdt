import mongoose, { Schema } from "mongoose";

export interface IRole {
  _id?: string;
  name: string;
  description?: string;
  permissions: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: [
      {
        type: String,
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IRole>("Role", RoleSchema);
