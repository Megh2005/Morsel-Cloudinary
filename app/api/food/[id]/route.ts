import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import FoodItem from "@/models/FoodItem";
import { deleteImage } from "@/lib/cloudinary";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    await connectToDatabase();

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "consumed") {
        updateData.consumedAt = new Date();
      } else if (status === "wasted") {
        updateData.wastedAt = new Date();
      }
    }

    const updated = await FoodItem.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!updated) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const item = await FoodItem.findById(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Try deleting image from Cloudinary
    if (item.cloudinaryUrl) {
      try {
        await deleteImage(item.cloudinaryUrl);
      } catch (cldErr) {
        console.warn("Could not delete from Cloudinary:", cldErr);
      }
    }

    await FoodItem.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Item deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete item" },
      { status: 500 }
    );
  }
}
