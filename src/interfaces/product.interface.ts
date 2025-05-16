import type { Document } from "mongoose"

export interface IProduct extends Document {
  name: string
  description: string
  price: number
  oldPrice?: number
  category: string
  subcategory?: string
  stock: number
  status: "in-stock" | "out-of-stock"
  image: string
  images?: string[]
  barcode: string
  unit: string
  costPrice: number
  featured?: boolean
  recommended?: boolean
  hot?: boolean
  new?: boolean
  specifications?: Record<string, string>
  rating?: number
  reviews?: number
  createdAt: Date
  updatedAt: Date
}
