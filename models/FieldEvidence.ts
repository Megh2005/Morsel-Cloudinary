import mongoose from "mongoose";

const FieldEvidenceSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImpactProject",
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    phase: {
      type: String,
      enum: ["before", "after"],
      required: true,
      default: "before",
    },
    title: {
      type: String,
      default: "",
    },
    activityType: {
      type: String,
      enum: [
        "surplus_harvest",
        "sorting_quality_check",
        "kitchen_preparation",
        "meal_distribution",
        "composting_feedstock",
        "soil_regeneration",
      ],
      default: "surplus_harvest",
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    cloudinaryUrl: {
      type: String,
      required: true,
    },
    transformedCardUrl: {
      type: String,
      default: "",
    },
    splitCompareUrl: {
      type: String,
      default: "",
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      display_name: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      country: { type: String, default: "India" },
      pincode: { type: String, default: "" },
      accuracy: { type: Number, default: 0 },
      source: {
        type: String,
        enum: ["gps_browser", "map_picker", "exif_metadata", "manual"],
        default: "map_picker",
      },
    },
    exifMetadata: {
      cameraMake: { type: String, default: "" },
      cameraModel: { type: String, default: "" },
      captureDate: { type: Date },
      gpsLatitudeRef: { type: String, default: "" },
      gpsLongitudeRef: { type: String, default: "" },
      rawMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    aiAnalysis: {
      sceneType: { type: String, default: "field_operation" },
      detectedFoodItems: [{ type: String }],
      estimatedMealsCount: { type: Number, default: 0 },
      co2DivertedKg: { type: Number, default: 0 },
      confidenceScore: { type: Number, default: 0.9 },
      verificationNotes: { type: String, default: "" },
      sdgImpact: { type: String, default: "SDG 2: Zero Hunger" },
      verificationStatus: {
        type: String,
        enum: ["verified", "flagged", "pending"],
        default: "verified",
      },
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    strict: false,
  },
);

if (mongoose.models?.FieldEvidence) {
  delete (mongoose.models as any).FieldEvidence;
}

const FieldEvidence = mongoose.model("FieldEvidence", FieldEvidenceSchema);

export default FieldEvidence;
