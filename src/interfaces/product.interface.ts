import type { Document } from "mongoose"

export interface IProduct extends Document {
  _id: string
  name: string
  description: string
  price: number
  oldPrice?: number
  category: string
  subcategory?: string
  quantity: number
  status: "in-stock" | "out-of-stock"
  image: string
  images?: string[]
  barcode: string
  unit: string
  costPrice?: number
  // Consolidated tags array replaces: hot, featured, recommended, new
  tags: string[]
  specifications?: Record<string, string>
  rating?: number
  reviews?: number
  published?: boolean
  createdAt: Date
  updatedAt: Date
}

