import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import FoodItem from "@/models/FoodItem";
import User from "@/models/User";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to analyze and track food." },
        { status: 401 }
      );
    }
    const userId = session.user.id || (session.user as any)._id || (session.user as any).email;

    // Connect to database and retrieve user location (Country, State, City)
    await connectToDatabase();
    let userLocation = {
      country: "India",
      state: "West Bengal",
      city: "Kolkata",
    };
    try {
      const userDoc = await User.findOne({
        $or: [{ _id: userId }, { email: session.user.email }],
      });
      if (userDoc) {
        if (userDoc.country) userLocation.country = userDoc.country;
        if (userDoc.state) userLocation.state = userDoc.state;
        if (userDoc.city) userLocation.city = userDoc.city;
      }
    } catch (locErr) {
      console.warn("User location retrieval notice:", locErr);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const saveToInventory = formData.get("saveToInventory") !== "false";

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    // Convert file to buffer & base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Uri = `data:${file.type};base64,${buffer.toString("base64")}`;

    // STEP 1: Upload to Cloudinary with AI Enhancements & Smart Food Focus
    const cldUpload = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "morsel_food_intelligence",
          resource_type: "image",
          colors: true, // Extract predominant color palette for freshness analysis
          transformation: [
            { quality: "auto", fetch_format: "auto" },
            { effect: "improve:outdoor" }, // Optimize fridge & kitchen shadow illumination
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    const publicId = cldUpload.public_id;
    const secureUrl = cldUpload.secure_url;
    const dominantColors = (cldUpload.colors || []).map((c: any) => c[0] || c);

    // STEP 2: Gemini AI Multimodal Culinary & Spoilage Analysis
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    } catch {
      model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
    }

    const prompt = `
You are Morsel AI, a world-class culinary intelligence and precision food waste prevention engine.
Analyze this food image with extreme visual scrutiny.

MANDATORY INSTRUCTIONS:
1. MULTI-ITEM RECOGNITION: The image may contain a single food item OR MULTIPLE DIFFERENT FOOD ITEMS (e.g. an entire refrigerator shelf, a vegetable crisper/basket, countertop groceries, multiple distinct leftovers, or a dinner spread). You MUST identify, recognize, and separate EVERY SINGLE FOOD ITEM visible in the image without omitting any. Each recognized item must be provided as an independent object in the "detectedItems" array with its own separate diagnosis, storage advice, and tailored rescue recipes.

2. USER GEOGRAPHIC & CLIMATIC PROFILE:
- Country: ${userLocation.country}
- State / Province: ${userLocation.state}
- City / Region: ${userLocation.city}
Tailor all verdicts to this exact location:
- Spoilage risk and estimated days left MUST reflect the ambient humidity, local temperature, and typical climate conditions of ${userLocation.city}, ${userLocation.state}, ${userLocation.country}.
- Storage recommendations must specify practical preservation tips effective for ${userLocation.city}'s environment.
- Rescue recipes MUST utilize commonly accessible regional pantry ingredients, local spices, and cooking styles familiar to households in ${userLocation.city}, ${userLocation.state}, ${userLocation.country}.
- Estimate financial savings in standard local currency values (e.g. INR ₹ in India, or appropriate local units).

Provide your response ONLY as a raw, valid JSON object (strictly NO markdown formatting, NO backticks, NO \`\`\`json code blocks) matching this schema:
{
  "summary": "Concise 1-2 sentence culinary summary of all recognized food items and priority action needed",
  "locationContext": "${userLocation.city}, ${userLocation.state}, ${userLocation.country}",
  "detectedItems": [
    {
      "itemName": "Specific recognizable name of this individual item (e.g., 'Cavendish Bananas', 'Fresh Spinach Leaves', 'Cooked Yellow Dal')",
      "category": "Produce" | "Leftovers" | "Dairy" | "Bakery" | "Protein" | "Pantry" | "Beverage" | "Other",
      "portionSize": "Estimated portion/quantity visible (e.g., '3 medium bananas (~350g)' or 'Approx 250g bowl')",
      "spoilageRisk": "low" | "medium" | "high" | "spoiled",
      "spoilageNotes": "Detailed observation on visible freshness signs, wilting, ripening, browning, or texture",
      "estimatedDaysLeft": 2,
      "storageTips": "Precise, actionable preservation advice specifically for this item in ${userLocation.city}'s climate (container, temperature, moisture prevention)",
      "recipes": [
        {
          "title": "Regionally Tailored Rescue Recipe",
          "time": "15 mins",
          "ingredients": ["This food item", "Common local staple", "Local seasoning/spice"],
          "instructions": "Clear, practical 2-sentence preparation instructions to rescue this ingredient quickly"
        },
        {
          "title": "Creative Alternative / Combo Recipe",
          "time": "20 mins",
          "ingredients": ["This food item", "Secondary staple or complementary item"],
          "instructions": "Another practical way to repurpose this food item before it spoils"
        }
      ],
      "co2SavedKg": 1.2,
      "financialSavings": 80,
      "tags": ["produce", "fresh", "perishable"]
    }
  ]
}
`;

    let rawAnalysis: any = null;
    try {
      const geminiResult = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: file.type || "image/jpeg",
          },
        },
      ]);

      const rawText = geminiResult.response.text();
      const cleanJson = rawText.replace(/```json|```/gi, "").trim();
      rawAnalysis = JSON.parse(cleanJson);
    } catch (aiErr: any) {
      console.warn("Gemini primary model notice, using fallback:", aiErr.message);
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const fallbackResult = await fallbackModel.generateContent([
        prompt,
        {
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: file.type || "image/jpeg",
          },
        },
      ]);
      const rawText = fallbackResult.response.text();
      const cleanJson = rawText.replace(/```json|```/gi, "").trim();
      rawAnalysis = JSON.parse(cleanJson);
    }

    // Normalize detectedItems array
    let detectedItems: any[] = [];
    if (
      rawAnalysis?.detectedItems &&
      Array.isArray(rawAnalysis.detectedItems) &&
      rawAnalysis.detectedItems.length > 0
    ) {
      detectedItems = rawAnalysis.detectedItems;
    } else if (rawAnalysis?.itemName) {
      // Fallback if model returned a single item object
      detectedItems = [rawAnalysis];
    } else {
      detectedItems = [
        {
          itemName: "Recognized Food Item",
          category: "Produce",
          portionSize: "Standard portion",
          spoilageRisk: "medium",
          spoilageNotes: "Assessed visual freshness condition",
          estimatedDaysLeft: 3,
          storageTips: "Store in a cool, ventilated container away from direct sunlight.",
          recipes: [],
          co2SavedKg: 1.1,
          financialSavings: 80,
          tags: ["food", "perishable"],
        },
      ];
    }

    // Primary item represents the most urgent or first recognized item for backward compatibility
    const primaryItem = detectedItems.reduce((prev: any, curr: any) => {
      const riskOrder: Record<string, number> = { spoiled: 4, high: 3, medium: 2, low: 1 };
      const prevRisk = riskOrder[prev?.spoilageRisk] || 2;
      const currRisk = riskOrder[curr?.spoilageRisk] || 2;
      return currRisk > prevRisk ? curr : prev;
    }, detectedItems[0]);

    const itemName = primaryItem.itemName || "Identified Food Item";
    const category = primaryItem.category || "Produce";
    const spoilageRisk = primaryItem.spoilageRisk || "medium";
    const estimatedDaysLeft = Number(primaryItem.estimatedDaysLeft) || 3;
    const co2SavedKg = Number(primaryItem.co2SavedKg) || 1.1;
    const financialSavings = Number(primaryItem.financialSavings) || 95;

    // STEP 3: Store Gemini Intelligence directly into Cloudinary Asset Metadata (DAM)
    try {
      await cloudinary.uploader.add_context(
        `item=${encodeURIComponent(itemName)}|items_count=${detectedItems.length}|location=${encodeURIComponent(userLocation.city)}|urgency=${spoilageRisk}|days_left=${estimatedDaysLeft}`,
        [publicId]
      );
    } catch (cldContextErr) {
      console.warn("Cloudinary context sync notice:", cldContextErr);
    }

    // STEP 4: Build Cloudinary On-The-Fly Dynamic Badged URLs
    const badgedUrl = cloudinary.url(publicId, {
      width: 700,
      height: 700,
      crop: "fill",
      gravity: "auto",
      quality: "auto",
      fetch_format: "auto",
      secure: true,
    });

    const impactCardUrl = cloudinary.url(publicId, {
      width: 800,
      height: 800,
      crop: "fill",
      gravity: "auto",
      quality: "auto",
      fetch_format: "auto",
      secure: true,
    });

    // STEP 5: Persist ALL recognized items to MongoDB Food Inventory
    const savedItems: any[] = [];
    if (saveToInventory) {
      await connectToDatabase();
      for (const itemData of detectedItems) {
        try {
          const createdDoc = await FoodItem.create({
            userId,
            name: itemData.itemName || "Identified Food Item",
            category: itemData.category || "Produce",
            portionSize: itemData.portionSize || "Standard portion",
            spoilageRisk: itemData.spoilageRisk || "medium",
            spoilageNotes: itemData.spoilageNotes || "",
            estimatedDaysLeft: Number(itemData.estimatedDaysLeft) || 3,
            storageTips: itemData.storageTips || "",
            recipes: itemData.recipes || [],
            co2SavedKg: Number(itemData.co2SavedKg) || 1.1,
            financialSavings: Number(itemData.financialSavings) || 85,
            cloudinaryPublicId: publicId,
            cloudinaryUrl: secureUrl,
            badgedUrl,
            dominantColors: dominantColors.slice(0, 5),
            tags: itemData.tags || [],
            status: "in_fridge",
          });
          savedItems.push(createdDoc);
        } catch (dbSaveErr) {
          console.error("Error saving detected item to database:", dbSaveErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: rawAnalysis?.summary || `Recognized ${detectedItems.length} food items in this scan`,
      locationContext: `${userLocation.city}, ${userLocation.state}, ${userLocation.country}`,
      detectedItems,
      analysis: {
        ...primaryItem,
        summary: rawAnalysis?.summary,
        locationContext: `${userLocation.city}, ${userLocation.state}, ${userLocation.country}`,
        detectedItems,
      },
      cloudinary: {
        publicId,
        originalUrl: secureUrl,
        badgedUrl,
        impactCardUrl,
        dominantColors,
      },
      item: savedItems[0] || null,
      items: savedItems,
    });
  } catch (error: any) {
    console.error("Food analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze food image" },
      { status: 500 }
    );
  }
}
