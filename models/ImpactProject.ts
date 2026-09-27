import mongoose from "mongoose";

const ImpactProjectSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    organizationName: {
      type: String,
      required: true,
      default: "Community Initiative",
    },
    category: {
      type: String,
      enum: [
        "food_rescue",
        "community_kitchen",
        "compost_regeneration",
        "farm_gleaning",
        "landfill_diversion",
      ],
      default: "food_rescue",
    },
    description: {
      type: String,
      default: "",
    },
    location: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
      display_name: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      country: { type: String, default: "India" },
      pincode: { type: String, default: "" },
    },
    totalMealsRescued: {
      type: Number,
      default: 0,
    },
    totalCo2DivertedKg: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "completed", "verified"],
      default: "active",
      index: true,
    },
    sdgGoals: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
    strict: false,
  },
);

if (mongoose.models?.ImpactProject) {
  delete (mongoose.models as any).ImpactProject;
}

const ImpactProject = mongoose.model("ImpactProject", ImpactProjectSchema);

export default ImpactProject;
