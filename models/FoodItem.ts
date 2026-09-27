import mongoose from "mongoose";

const FoodItemSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["Produce", "Leftovers", "Dairy", "Bakery", "Protein", "Pantry", "Beverage", "Other"],
      default: "Other",
    },
    portionSize: {
      type: String,
      default: "Standard portion",
    },
    spoilageRisk: {
      type: String,
      enum: ["low", "medium", "high", "spoiled"],
      default: "low",
    },
    spoilageNotes: {
      type: String,
      default: "",
    },
    estimatedDaysLeft: {
      type: Number,
      default: 3,
    },
    storageTips: {
      type: String,
      default: "",
    },
    recipes: [
      {
        title: { type: String, required: true },
        time: { type: String, default: "15 mins" },
        ingredients: [{ type: String }],
        instructions: { type: String, default: "" },
      },
    ],
    co2SavedKg: {
      type: Number,
      default: 0.8,
    },
    financialSavings: {
      type: Number,
      default: 80,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    cloudinaryUrl: {
      type: String,
      required: true,
    },
    badgedUrl: {
      type: String,
      required: true,
    },
    tags: [
      {
        type: String,
      },
    ],
    dominantColors: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ["in_fridge", "consumed", "wasted"],
      default: "in_fridge",
      index: true,
    },
    consumedAt: {
      type: Date,
    },
    wastedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

if (mongoose.models && mongoose.models.FoodItem) {
  delete (mongoose.models as any).FoodItem;
}

const FoodItem = mongoose.model("FoodItem", FoodItemSchema);

export default FoodItem;
