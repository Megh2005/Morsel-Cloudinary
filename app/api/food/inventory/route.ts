import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import FoodItem from "@/models/FoodItem";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to view your inventory." },
        { status: 401 }
      );
    }
    const userId = session.user.id || (session.user as any)._id || (session.user as any).email;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "in_fridge";
    const category = searchParams.get("category");

    await connectToDatabase();

    // Map any legacy unassigned items to this authenticated user
    if ((session.user as any)?.email) {
      await FoodItem.updateMany(
        { userId: { $in: ["guest_user", (session.user as any).email] } },
        { $set: { userId } }
      );
    } else {
      await FoodItem.updateMany(
        { userId: "guest_user" },
        { $set: { userId } }
      );
    }

    const baseFilter: any = { userId };
    if (status === "in_fridge") {
      baseFilter.status = { $in: ["in_fridge", "consumed"] };
    } else if (status === "consumed" || status === "wasted") {
      baseFilter.status = status;
    }
    if (category && category !== "All") {
      baseFilter.category = category;
    }

    const items = await FoodItem.find(baseFilter).sort({ estimatedDaysLeft: 1, createdAt: -1 });

    // Sanitize any previously stored broken badgedUrls (e.g. ones with '#' in url)
    const sanitizedItems = items.map((doc: any) => {
      const it = doc.toObject();
      if (it.badgedUrl && it.badgedUrl.includes("#")) {
        // Replace '#dc2626' with 'rgb:dc2626' or fall back to safe cloudinaryUrl
        it.badgedUrl = it.badgedUrl.replace(/#([a-fA-F0-9]{6})/g, "rgb:$1");
      }
      return it;
    });

    return NextResponse.json({ success: true, items: sanitizedItems });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
