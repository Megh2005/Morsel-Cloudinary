import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRescueDispatch extends Document {
  donorId: string;
  donorName: string;
  donorType: "household" | "restaurant" | "caterer" | "bakery" | "supermarket" | "other";
  title: string;
  foodCategory: string;
  description?: string;
  urgency: "urgent_2h" | "today" | "flexible";
  status: "available" | "claimed" | "delivered" | "cancelled";
  
  // AI-Verified Visual Evidence
  surplusMediaUrl: string;
  surplusCloudinaryId?: string;
  
  // AI Impact Assessment
  estimatedServings: number;
  co2DivertedKg: number;
  freshnessScore?: number; // 0 - 100
  aiSafetyNotes?: string;

  // OpenStreetMap Location
  location: {
    lat: number;
    lng: number;
    display_name?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    establishment?: string;
  };

  // NGO Claim & Handoff
  claimedByNgoName?: string;
  claimedAt?: Date;
  handoffMediaUrl?: string;
  handoffCloudinaryId?: string;
  deliveredAt?: Date;
  deliveryNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const RescueDispatchSchema: Schema = new Schema<IRescueDispatch>(
  {
    donorId: { type: String, required: true, index: true },
    donorName: { type: String, required: true },
    donorType: {
      type: String,
      enum: ["household", "restaurant", "caterer", "bakery", "supermarket", "other"],
      default: "restaurant",
    },
    title: { type: String, required: true },
    foodCategory: { type: String, default: "Prepared Meals" },
    description: { type: String, default: "" },
    urgency: {
      type: String,
      enum: ["urgent_2h", "today", "flexible"],
      default: "today",
      index: true,
    },
    status: {
      type: String,
      enum: ["available", "claimed", "delivered", "cancelled"],
      default: "available",
      index: true,
    },

    surplusMediaUrl: { type: String, required: true },
    surplusCloudinaryId: { type: String },

    estimatedServings: { type: Number, default: 20 },
    co2DivertedKg: { type: Number, default: 8 },
    freshnessScore: { type: Number, default: 95 },
    aiSafetyNotes: { type: String, default: "Visual inspection verified consumable." },

    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      display_name: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String, default: "India" },
      pincode: { type: String },
      establishment: { type: String },
    },

    claimedByNgoName: { type: String },
    claimedAt: { type: Date },
    handoffMediaUrl: { type: String },
    handoffCloudinaryId: { type: String },
    deliveredAt: { type: Date },
    deliveryNotes: { type: String },
  },
  { timestamps: true }
);

const RescueDispatch: Model<IRescueDispatch> =
  mongoose.models.RescueDispatch ||
  mongoose.model<IRescueDispatch>("RescueDispatch", RescueDispatchSchema);

export default RescueDispatch;
