import mongoose, { Schema } from "mongoose";
import slugify from "slugify";
import type { ICategory } from "../interfaces/category.interface";

const CategorySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Por favor ingrese el nombre de la categoría"],
      trim: true,
      maxlength: [50, "El nombre no puede tener más de 50 caracteres"],
      unique: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      maxlength: [500, "La descripción no puede tener más de 500 caracteres"],
    },
    icon: {
      type: String,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
  },
  {
    timestamps: true,
  }
);

// Middleware para crear slug antes de guardar
CategorySchema.pre<ICategory>("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});

export default mongoose.model<ICategory>("Category", CategorySchema);
