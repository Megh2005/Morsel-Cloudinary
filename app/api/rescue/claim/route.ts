import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import RescueDispatch from "@/models/RescueDispatch";

export async function POST(req: NextRequest) {
  try {
    const { dispatchId, ngoName } = await req.json();

    if (!dispatchId || !ngoName) {
      return NextResponse.json(
        { error: "dispatchId and ngoName are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const dispatch = await RescueDispatch.findById(dispatchId);
    if (!dispatch) {
      return NextResponse.json({ error: "Dispatch not found" }, { status: 404 });
    }

    if (dispatch.status !== "available") {
      return NextResponse.json(
        { error: `This food rescue is already ${dispatch.status}` },
        { status: 400 }
      );
    }

    dispatch.status = "claimed";
    dispatch.claimedByNgoName = ngoName;
    dispatch.claimedAt = new Date();
    await dispatch.save();

    return NextResponse.json({
      success: true,
      dispatch,
      message: `Food rescue successfully claimed by ${ngoName}`,
    });
  } catch (error: any) {
    console.error("Failed to claim rescue dispatch:", error);
    return NextResponse.json(
      { error: error.message || "Failed to claim food rescue" },
      { status: 500 }
    );
  }
}
