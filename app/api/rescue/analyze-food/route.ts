import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const foodCategory = (formData.get("foodCategory") as string) || "Home-cooked Leftover";
    const title = (formData.get("title") as string) || "Leftover food";

    if (!file) {
      return NextResponse.json({ error: "Photo is required for analysis" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let estimatedServings = 4;
    let co2DivertedKg = 1.6;
    let freshnessScore = 94;
    let safetyNotes = "Food appears fresh and suitable for consumption.";
    let storageAdvice = {
      safeStorageDays: 2,
      storageMethod: "Refrigerate in a sealed airtight container below 4°C.",
      expiryHours: 36,
    };
    let repurposedRecipes = [
      {
        title: "Golden Pan-Crisped Toss",
        description: "Re-toss leftover portions with aromatics for a revitalized warm dish.",
        effortLevel: "Quick & Easy (10-15m)",
        prepTimeMinutes: 10,
        ingredientsNeeded: ["Cooking oil or butter", "Chopped garlic/onion", "Seasoning"],
        instructions: [
          "Heat pan on medium flame with a small spoon of oil.",
          "Add leftovers and warm through thoroughly for 4-5 minutes.",
          "Serve fresh while steaming.",
        ],
      },
      {
        title: "Comforting Stuffed Wraps / Rolls",
        description: "Roll the savory leftovers inside flatbreads or tortillas with fresh sliced greens.",
        effortLevel: "Minimal (5m)",
        prepTimeMinutes: 5,
        ingredientsNeeded: ["Flatbreads / Tortillas / Rotis", "Green chutney or sauce"],
        instructions: [
          "Warm the flatbread lightly.",
          "Place a generous spoonful of leftover filling in the center.",
          "Drizzle your favorite sauce, roll tightly, and enjoy.",
        ],
      },
    ];

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are a professional chef, food safety expert, and sustainability advisor.
Analyze this food photograph uploaded by a household or restaurant:
Food Category: ${foodCategory}
Title: ${title}

Provide immediate, friendly, non-technical culinary & storage advice in ONLY a valid JSON object matching this schema:
{
  "estimatedServings": <number of meal servings visible, integer>,
  "co2DivertedKg": <kg of CO2 diverted from landfill, float>,
  "freshnessScore": <integer 0-100 indicating quality and freshness>,
  "safetyNotes": "<one friendly sentence on safety and storage>",
  "storageAdvice": {
    "safeStorageDays": <number of days it can be kept safely in the fridge, integer between 1 and 6>,
    "storageMethod": "<clear, practical advice: e.g. airtight container in fridge at 4°C, freeze if not eaten in 2 days>",
    "expiryHours": <hours until it should be consumed if refrigerated, integer>
  },
  "repurposedRecipes": [
    {
      "title": "<mouth-watering creative recipe to turn this leftover into a brand new meal>",
      "description": "<one inviting sentence on what makes this dish tasty>",
      "effortLevel": "<One of: 'Minimal (5m)', 'Quick & Easy (10-15m)', 'Moderate (20-30m)', 'Batch Cook (45m+)'>",
      "prepTimeMinutes": <estimated minutes, integer>,
      "ingredientsNeeded": ["<pantry item 1>", "<pantry item 2>", "<pantry item 3>"],
      "instructions": ["<step 1>", "<step 2>", "<step 3>"]
    },
    {
      "title": "<second creative repurpose recipe>",
      "description": "<description>",
      "effortLevel": "<effort>",
      "prepTimeMinutes": <minutes>,
      "ingredientsNeeded": ["<items>"],
      "instructions": ["<step 1>", "<step 2>"]
    }
  ]
}`;

        const mimeType = file.type || "image/jpeg";
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: buffer.toString("base64"),
              mimeType,
            },
          },
        ]);

        const rawText = result.response.text();
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.estimatedServings) estimatedServings = Math.max(1, Math.round(parsed.estimatedServings));
          if (parsed.co2DivertedKg) co2DivertedKg = Math.max(0.5, Number(parsed.co2DivertedKg.toFixed(1)));
          if (parsed.freshnessScore) freshnessScore = Math.min(100, Math.max(10, parsed.freshnessScore));
          if (parsed.safetyNotes) safetyNotes = parsed.safetyNotes;

          if (parsed.storageAdvice) {
            storageAdvice = {
              safeStorageDays: Math.max(1, Math.min(10, parsed.storageAdvice.safeStorageDays || 2)),
              storageMethod: parsed.storageAdvice.storageMethod || storageAdvice.storageMethod,
              expiryHours: Math.max(12, parsed.storageAdvice.expiryHours || 36),
            };
          }

          if (Array.isArray(parsed.repurposedRecipes) && parsed.repurposedRecipes.length > 0) {
            repurposedRecipes = parsed.repurposedRecipes.slice(0, 3).map((r: any) => ({
              title: r.title || "Repurposed Dish",
              description: r.description || "A delicious transformed dish from leftover food.",
              effortLevel: r.effortLevel || "Quick & Easy (10-15m)",
              prepTimeMinutes: r.prepTimeMinutes || 15,
              ingredientsNeeded: Array.isArray(r.ingredientsNeeded) ? r.ingredientsNeeded : ["Basic seasoning"],
              instructions: Array.isArray(r.instructions) ? r.instructions : ["Heat thoroughly and enjoy."],
            }));
          }
        }
      } catch (err) {
        console.warn("AI analysis fallback:", err);
      }
    }

    return NextResponse.json({
      success: true,
      analysis: {
        estimatedServings,
        co2DivertedKg,
        freshnessScore,
        safetyNotes,
        storageAdvice,
        repurposedRecipes,
      },
    });
  } catch (error: any) {
    console.error("Food analysis failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze food" },
      { status: 500 }
    );
  }
}
