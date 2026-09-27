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
        { error: "Authentication required. Please sign in to view impact metrics." },
        { status: 401 }
      );
    }
    const userId = session.user.id || (session.user as any)._id || (session.user as any).email;

    await connectToDatabase();

    // Query items for authenticated user
    let items = await FoodItem.find({ userId });

    let totalCo2Saved = 0;
    let totalMoneySaved = 0;
    let consumedCount = 0;
    let wastedCount = 0;
    let inFridgeCount = 0;

    const categoryStats: Record<string, { count: number; saved: number }> = {};
    const wastedIngredients: Record<string, number> = {};

    for (const item of items) {
      const cat = item.category || "Other";
      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, saved: 0 };
      }
      categoryStats[cat].count += 1;

      if (item.status === "consumed") {
        consumedCount += 1;
        totalCo2Saved += item.co2SavedKg || 0.8;
        totalMoneySaved += item.financialSavings || 80;
        categoryStats[cat].saved += 1;
      } else if (item.status === "wasted") {
        wastedCount += 1;
        wastedIngredients[item.name] = (wastedIngredients[item.name] || 0) + 1;
      } else {
        inFridgeCount += 1;
      }
    }

    const totalDecisions = consumedCount + wastedCount;
    const rescueRate = totalDecisions > 0 ? Math.round((consumedCount / totalDecisions) * 100) : 100;

    const topWasted = Object.entries(wastedIngredients)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      success: true,
      metrics: {
        totalCo2Saved: Number(totalCo2Saved.toFixed(2)),
        totalMoneySaved: Math.round(totalMoneySaved),
        consumedCount,
        wastedCount,
        inFridgeCount,
        rescueRate,
        categoryStats,
        topWasted,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to calculate impact" },
      { status: 500 }
    );
  }
}
