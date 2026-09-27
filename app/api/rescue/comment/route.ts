import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import RescueDispatch from "@/models/RescueDispatch";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { dispatchId, authorName, authorRole = "volunteer", text } = await req.json();

    if (!dispatchId || !text?.trim()) {
      return NextResponse.json(
        { error: "Listing ID and message text are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const dispatch = await RescueDispatch.findById(dispatchId);

    if (!dispatch) {
      return NextResponse.json({ error: "Food listing not found" }, { status: 404 });
    }

    const newComment = {
      commentId: randomUUID(),
      authorId: randomUUID(),
      authorName: authorName?.trim() || "Community Member",
      authorRole: authorRole as "donor" | "ngo" | "volunteer",
      text: text.trim(),
      createdAt: new Date(),
    };

    dispatch.comments = dispatch.comments || [];
    dispatch.comments.push(newComment as any);
    await dispatch.save();

    return NextResponse.json({
      success: true,
      comment: newComment,
      dispatch,
      message: "Message posted successfully",
    });
  } catch (error: any) {
    console.error("Failed to post comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to post message" },
      { status: 500 }
    );
  }
}
