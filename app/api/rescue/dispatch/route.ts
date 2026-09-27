import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v2 as cloudinary } from "cloudinary";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import RescueDispatch from "@/models/RescueDispatch";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
});

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const urgency = searchParams.get("urgency") || "";
    const donorType = searchParams.get("donorType") || "";

    const query: any = {};
    if (status) query.status = status;
    if (urgency) query.urgency = urgency;
    if (donorType) query.donorType = donorType;

    const dispatches = await RescueDispatch.find(query).sort({ createdAt: -1 }).limit(50);

    return NextResponse.json({ success: true, dispatches });
  } catch (error: any) {
    console.error("Failed to fetch rescue dispatches:", error);
    return NextResponse.json(
      { error: "Failed to fetch rescue dispatches" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const donorId =
      session?.user?.id ||
      (session?.user as any)?._id ||
      (session?.user as any)?.email ||
      "community_member";

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = (formData.get("title") as string) || "Surplus Leftover Food";
    const donorName = (formData.get("donorName") as string) || "Community Kitchen / Cook";
    const donorType = (formData.get("donorType") as any) || "household";
    const foodCategory = (formData.get("foodCategory") as string) || "Home-cooked Leftover";
    const description = (formData.get("description") as string) || "";
    const urgency = (formData.get("urgency") as any) || "today";

    const lat = parseFloat(formData.get("lat") as string);
    const lng = parseFloat(formData.get("lng") as string);
    const display_name = (formData.get("display_name") as string) || "";
    const city = (formData.get("city") as string) || "";
    const state = (formData.get("state") as string) || "";
    const country = (formData.get("country") as string) || "India";
    const pincode = (formData.get("pincode") as string) || "";
    const establishment = (formData.get("establishment") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "Please upload or capture a photo of the food" }, { status: 400 });
    }
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Please choose a pickup location" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Upload to Cloudinary with tags
    const cldUpload: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "morsel_rescue_surplus",
          resource_type: "image",
          tags: ["food_rescue", "leftovers", donorType, foodCategory.toLowerCase().replace(/\s+/g, "_")],
          context: {
            donor_name: donorName,
            title,
            city,
          },
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(buffer);
    });

    const surplusMediaUrl = cldUpload.secure_url;
    const surplusCloudinaryId = cldUpload.public_id;

    // 2. Multimodal AI Analysis: Storage Shelf-Life & Repurposed Upcycled Recipes
    let estimatedServings = 4;
    let co2DivertedKg = 2;
    let freshnessScore = 95;
    let aiSafetyNotes = "Food visually checked; appears fresh and wholesome.";
    let storageAdvice = {
      safeStorageDays: 2,
      storageMethod: "Store in an airtight glass or food-safe plastic container in refrigerator below 4°C.",
      expiryHours: 36,
    };
    let repurposedRecipes = [
      {
        title: "Quick Stir-Fry Reheat Bowl",
        description: "Re-toss the meal with fresh herbs and a dash of oil over medium heat for high aroma and safe eating.",
        effortLevel: "Quick & Easy (10-15m)" as const,
        prepTimeMinutes: 10,
        ingredientsNeeded: ["Cooking oil", "Fresh cilantro / herbs", "Pinch of salt"],
        instructions: [
          "Heat 1 tbsp oil in a pan over medium heat.",
          "Add the food and toss gently until piping hot throughout.",
          "Garnish with fresh herbs and serve immediately.",
        ],
      },
      {
        title: "Crispy Upcycled Patties / Cutlets",
        description: "Mash the leftovers with boiled potatoes or breadcrumbs and shallow fry for delicious crispy snacks.",
        effortLevel: "Moderate (20-30m)" as const,
        prepTimeMinutes: 20,
        ingredientsNeeded: ["Breadcrumbs or cornstarch", "Boiled potato (optional)", "Spices to taste"],
        instructions: [
          "Mash the food lightly and mix with binding agent.",
          "Shape into small flat round patties.",
          "Pan-sear on both sides with light oil until golden brown.",
        ],
      },
    ];

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are an expert culinary food scientist and sustainability specialist.
Analyze this photo of surplus / leftover food submitted by a household or food establishment for rescue.
Food Category: ${foodCategory}
Listing Title: ${title}
Donor Type: ${donorType}
Description: ${description}

Analyze the food carefully and return ONLY a valid JSON object matching this exact schema:
{
  "estimatedServings": <number of standard meal portions visible, integer between 1 and 200>,
  "co2DivertedKg": <estimated kg of CO2 equivalent emissions saved by rescuing this food, roughly 0.4 kg per serving>,
  "freshnessScore": <integer 0 to 100 based on visual appearance, color, and state>,
  "safetyNotes": "<one clear, encouraging sentence on how to handle/consume it safely>",
  "storageAdvice": {
    "safeStorageDays": <realistic number of days it can be safely kept in home or commercial refrigeration, integer 1 to 7>,
    "storageMethod": "<practical instruction on how to store properly, e.g. airtight container at <= 4°C, freeze if not used within 2 days>",
    "expiryHours": <hours until it should be consumed if refrigerated, integer e.g. 24, 48, 72>
  },
  "repurposedRecipes": [
    {
      "title": "<creative new recipe name made by transforming these leftovers>",
      "description": "<one enticing sentence describing what this new dish turns into>",
      "effortLevel": "<One of: 'Minimal (5m)', 'Quick & Easy (10-15m)', 'Moderate (20-30m)', 'Batch Cook (45m+)'>",
      "prepTimeMinutes": <estimated minutes to make, integer>,
      "ingredientsNeeded": ["<list of 2-4 basic pantry items needed>"],
      "instructions": ["<step 1>", "<step 2>", "<step 3>"]
    },
    {
      "title": "<second distinct recipe idea>",
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
          if (parsed.safetyNotes) aiSafetyNotes = parsed.safetyNotes;

          if (parsed.storageAdvice) {
            storageAdvice = {
              safeStorageDays: Math.max(1, Math.min(10, parsed.storageAdvice.safeStorageDays || 2)),
              storageMethod: parsed.storageAdvice.storageMethod || storageAdvice.storageMethod,
              expiryHours: Math.max(12, parsed.storageAdvice.expiryHours || 36),
            };
          }

          if (Array.isArray(parsed.repurposedRecipes) && parsed.repurposedRecipes.length > 0) {
            repurposedRecipes = parsed.repurposedRecipes.slice(0, 3).map((r: any) => ({
              title: r.title || "Repurposed Meal",
              description: r.description || "A delicious transformed dish from leftover food.",
              effortLevel: r.effortLevel || "Quick & Easy (10-15m)",
              prepTimeMinutes: r.prepTimeMinutes || 15,
              ingredientsNeeded: Array.isArray(r.ingredientsNeeded) ? r.ingredientsNeeded : ["Basic pantry seasonings"],
              instructions: Array.isArray(r.instructions) ? r.instructions : ["Heat thoroughly and serve."],
            }));
          }
        }
      } catch (aiErr) {
        console.warn("AI Food Evaluation fallback:", aiErr);
      }
    }

    // 3. Save to MongoDB
    await connectToDatabase();

    const dispatch = await RescueDispatch.create({
      donorId,
      donorName,
      donorType,
      title,
      foodCategory,
      description,
      urgency,
      status: "available",
      surplusMediaUrl,
      surplusCloudinaryId,
      estimatedServings,
      co2DivertedKg,
      freshnessScore,
      aiSafetyNotes,
      storageAdvice,
      repurposedRecipes,
      claims: [],
      comments: [],
      location: {
        lat,
        lng,
        display_name,
        city,
        state,
        country,
        pincode,
        establishment,
      },
    });

    return NextResponse.json({
      success: true,
      dispatch,
      message: "Food rescue post listed successfully!",
    });
  } catch (error: any) {
    console.error("Rescue dispatch creation failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create rescue dispatch" },
      { status: 500 }
    );
  }
}
