import mongoose, { Schema } from "mongoose";
import type { IAddress } from "../interfaces/address.interface";

const AddressSchema = new Schema<IAddress>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    // Contact info
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Location hierarchy
    provinceCode: {
      type: String,
      trim: true,
    },
    provinceName: {
      type: String,
      required: true,
      trim: true,
    },
    districtCode: {
      type: String,
      trim: true,
    },
    districtName: {
      type: String,
      required: true,
      trim: true,
    },
    wardCode: {
      type: String,
      trim: true,
    },
    wardName: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Detail address
    streetAddress: {
      type: String,
      required: true,
      trim: true,
    },
    fullAddress: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Status
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user address queries
AddressSchema.index({ user: 1, isDefault: -1 });

// Pre-save hook to compute fullAddress if not provided
AddressSchema.pre("save", function (next) {
  if (this.isModified("streetAddress") || this.isModified("wardName") || 
      this.isModified("districtName") || this.isModified("provinceName")) {
    if (!this.fullAddress || this.isModified("streetAddress")) {
      this.fullAddress = `${this.streetAddress}, ${this.wardName}, ${this.districtName}, ${this.provinceName}`;
    }
  }
  next();
});

export default mongoose.model<IAddress>("Address", AddressSchema);
