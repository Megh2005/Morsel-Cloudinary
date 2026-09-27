import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { connectToDatabase } from "@/lib/db";
import RescueDispatch from "@/models/RescueDispatch";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const dispatchId = formData.get("dispatchId") as string;
    const file = formData.get("file") as File;
    const deliveryNotes = (formData.get("deliveryNotes") as string) || "Food delivered to beneficiaries.";

    if (!dispatchId || !file) {
      return NextResponse.json(
        { error: "dispatchId and proof photo are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const dispatch = await RescueDispatch.findById(dispatchId);
    if (!dispatch) {
      return NextResponse.json({ error: "Rescue dispatch not found" }, { status: 404 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload handoff proof to Cloudinary
    const cldUpload: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "morsel_rescue_handoff",
          resource_type: "image",
          tags: ["food_rescue_delivered", "verified_impact"],
          context: {
            dispatch_id: dispatchId,
            ngo_name: dispatch.claimedByNgoName || "Community Partner",
          },
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(buffer);
    });

    dispatch.status = "delivered";
    dispatch.handoffMediaUrl = cldUpload.secure_url;
    dispatch.handoffCloudinaryId = cldUpload.public_id;
    dispatch.deliveredAt = new Date();
    dispatch.deliveryNotes = deliveryNotes;
    await dispatch.save();

    return NextResponse.json({
      success: true,
      dispatch,
      receipt: {
        receiptId: `REC-${dispatch._id.toString().slice(-6).toUpperCase()}`,
        donorName: dispatch.donorName,
        recipientNgo: dispatch.claimedByNgoName || "Verified Community Shelter",
        foodCategory: dispatch.foodCategory,
        servingsDelivered: dispatch.estimatedServings,
        co2PreventedKg: dispatch.co2DivertedKg,
        deliveredAt: dispatch.deliveredAt,
        location: dispatch.location,
        surplusPhoto: dispatch.surplusMediaUrl,
        handoffPhoto: dispatch.handoffMediaUrl,
      },
      message: "Delivery proof verified! Impact receipt generated.",
    });
  } catch (error: any) {
    console.error("Handoff verification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify handoff" },
      { status: 500 }
    );
  }
}
