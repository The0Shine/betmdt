import { Schema, model, Document } from "mongoose";

export interface IRole extends Document {
  name: string;
}

const roleSchema = new Schema<IRole>({
  name: { type: String, required: true, unique: true },
});

export default model<IRole>("Role", roleSchema);
