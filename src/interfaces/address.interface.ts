import type { Document, Types } from "mongoose";

export interface IAddress extends Document {
  user: Types.ObjectId;
  
  // Contact info
  fullName: string;
  phone: string;
  
  // Location hierarchy (Vietnam standard)
  provinceCode?: string;
  provinceName: string;
  districtCode?: string;
  districtName: string;
  wardCode?: string;
  wardName: string;
  
  // Detail address
  streetAddress: string;
  fullAddress: string;  // Computed: streetAddress + ward + district + province
  
  // Status
  isDefault: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Snapshot of address at order time
 * Denormalized to preserve history even if user updates/deletes address
 */
export interface IShippingAddressSnapshot {
  fullName: string;
  phone: string;
  provinceName: string;
  districtName: string;
  wardName: string;
  streetAddress: string;
  fullAddress: string;
}
