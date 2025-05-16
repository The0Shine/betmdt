import type { Document } from "mongoose"

export interface ICategory extends Document {
  name: string
  slug: string
  description?: string
  icon?: string
  parent?: string
  createdAt: Date
  updatedAt: Date
}
