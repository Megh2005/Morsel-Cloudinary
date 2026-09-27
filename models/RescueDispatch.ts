import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRepurposedRecipe {
  title: string;
  description: string;
  effortLevel: "Minimal (5m)" | "Quick & Easy (10-15m)" | "Moderate (20-30m)" | "Batch Cook (45m+)";
  prepTimeMinutes: number;
  ingredientsNeeded: string[];
  instructions: string[];
}

export interface IStorageAdvice {
  safeStorageDays: number;
  storageMethod: string;
  expiryHours: number;
}

export interface IClaimRequest {
  claimId: string;
  ngoId?: string;
  ngoName: string;
  contactPerson: string;
  contactPhone: string;
  pickupEta: string;
  beneficiaryCount?: number;
  message?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

export interface IDispatchComment {
  commentId: string;
  authorId: string;
  authorName: string;
  authorRole: "donor" | "ngo" | "volunteer";
  text: string;
  createdAt: Date;
}

export interface IRescueDispatch extends Document {
  donorId: string;
  donorName: string;
  donorType: "household" | "restaurant" | "caterer" | "bakery" | "supermarket" | "other";
  title: string;
  foodCategory: string;
  description?: string;
  urgency: "urgent_2h" | "today" | "flexible";
  status: "available" | "claim_pending" | "claimed" | "delivered" | "cancelled";

  // Visual Evidence
  surplusMediaUrl: string;
  surplusCloudinaryId?: string;

  // AI-Powered Food & Leftover Intelligence
  estimatedServings: number;
  co2DivertedKg: number;
  freshnessScore?: number; // 0 - 100
  aiSafetyNotes?: string;
  storageAdvice: IStorageAdvice;
  repurposedRecipes: IRepurposedRecipe[];

  // Geographic Location
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

  // Claim & Approval Workflow
  claims: IClaimRequest[];
  approvedClaimId?: string;
  claimedByNgoName?: string;
  claimedAt?: Date;

  // Interactive Coordination Thread
  comments: IDispatchComment[];

  // Proof-of-Handoff
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
      default: "household",
    },
    title: { type: String, required: true },
    foodCategory: { type: String, default: "Home-cooked Leftover" },
    description: { type: String, default: "" },
    urgency: {
      type: String,
      enum: ["urgent_2h", "today", "flexible"],
      default: "today",
      index: true,
    },
    status: {
      type: String,
      enum: ["available", "claim_pending", "claimed", "delivered", "cancelled"],
      default: "available",
      index: true,
    },

    surplusMediaUrl: { type: String, required: true },
    surplusCloudinaryId: { type: String },

    estimatedServings: { type: Number, default: 4 },
    co2DivertedKg: { type: Number, default: 2 },
    freshnessScore: { type: Number, default: 95 },
    aiSafetyNotes: { type: String, default: "Food looks fresh, appetizing, and safe for consumption." },

    storageAdvice: {
      safeStorageDays: { type: Number, default: 2 },
      storageMethod: { type: String, default: "Keep refrigerated in sealed airtight container at or below 4°C" },
      expiryHours: { type: Number, default: 36 },
    },

    repurposedRecipes: [
      {
        title: { type: String, required: true },
        description: { type: String, default: "" },
        effortLevel: {
          type: String,
          enum: ["Minimal (5m)", "Quick & Easy (10-15m)", "Moderate (20-30m)", "Batch Cook (45m+)"],
          default: "Quick & Easy (10-15m)",
        },
        prepTimeMinutes: { type: Number, default: 15 },
        ingredientsNeeded: [{ type: String }],
        instructions: [{ type: String }],
      },
    ],

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

    claims: [
      {
        claimId: { type: String, required: true },
        ngoId: { type: String },
        ngoName: { type: String, required: true },
        contactPerson: { type: String, required: true },
        contactPhone: { type: String, required: true },
        pickupEta: { type: String, required: true },
        beneficiaryCount: { type: Number, default: 0 },
        message: { type: String, default: "" },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    approvedClaimId: { type: String },
    claimedByNgoName: { type: String },
    claimedAt: { type: Date },

    comments: [
      {
        commentId: { type: String, required: true },
        authorId: { type: String, required: true },
        authorName: { type: String, required: true },
        authorRole: {
          type: String,
          enum: ["donor", "ngo", "volunteer"],
          default: "volunteer",
        },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

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
