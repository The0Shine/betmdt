import type { Document } from "mongoose";

export interface IRole extends Document {
  name: string;
  description?: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoleWithUserCount extends IRole {
  userCount: number;
}
