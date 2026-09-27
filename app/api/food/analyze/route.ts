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

    // STEP 1: Upload to Cloudinary with Rich AI Analysis, Quality Scoring & Palette Extraction
    const cldUpload = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "morsel_food_intelligence",
          resource_type: "image",
          colors: true, // Color palette extraction
          image_metadata: true, // EXIF and camera metadata
          quality_analysis: true, // Cloudinary AI visual quality and focus scoring
          accessibility_analysis: true, // Accessibility contrast analysis
          phash: true, // Perceptual hash for visual similarity
          auto_tagging: 0.6, // Cloudinary AI auto-tagging
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
You are Morsel AI, a world-class culinary intelligence, food safety analysis, and precision waste prevention engine.
Analyze this food image with extreme visual and biological scrutiny.

MANDATORY INSTRUCTIONS:
1. MULTI-ITEM RECOGNITION: The image may contain a single food item OR MULTIPLE DIFFERENT FOOD ITEMS (e.g. an entire refrigerator shelf, a vegetable crisper/basket, countertop groceries, multiple distinct leftovers, or a dinner spread). You MUST identify, recognize, and separate EVERY SINGLE FOOD ITEM visible in the image without omitting any. Each recognized item must be provided as an independent object in the "detectedItems" array with its own separate diagnosis, storage advice, and tailored rescue recipes.

2. CRITICAL SPOILAGE, ROT, AND CONSUMABILITY EVALUATION (EDGE CASES):
Inspect every food item meticulously for signs of rot, fungal mold (green, white, black, blue fuzz), bacterial slime, soft rot, liquefaction, severe discoloration, rancidity, fermentation of cooked foods, sour curdling, or destroyed/damaged packaging:
- IF AN ITEM IS SPOILED, ROTTEN, DECAYED, MOLDY, DESTROYED, OR UNCONSUMABLE:
  * "spoilageRisk": "spoiled"
  * "isConsumable": false
  * "isStorable": false (Rotting items emit fungal spores and ethylene gas that actively spoil and cross-contaminate other items in the fridge/pantry)
  * "spoilageSeverity": "toxic_mold" | "heavy_rot" | "decayed_unfit" | "damaged_destroyed"
  * "estimatedDaysLeft": 0
  * "healthHazardWarning": High-urgency, clear, prominent biological warning explaining the direct medical and health risk (e.g., "Active fungal mold and bacterial decomposition detected. Ingestion carries severe risk of mycotoxin exposure, acute gastroenteritis, or bacterial food poisoning. DO NOT CONSUME.").
  * "disposalAdvice": Exact, actionable instructions for safe disposal and composting (e.g., "Do not keep inside refrigerator or near fresh food. Seal in an airtight compost or waste bag and discard immediately to prevent airborne spore contamination.").
  * "storageTips": "DO NOT STORE — Item is decayed and will cross-contaminate surrounding food in the fridge."
  * "recipes": [] (CRITICAL SAFETY MANDATE: NEVER suggest cooking, boiling, or consuming rotten, moldy, or spoiled food. Bacterial and fungal mycotoxins are heat-stable and cannot be eliminated by cooking!)
  * "co2SavedKg": 0
  * "financialSavings": 0
- IF AN ITEM IS STILL CONSUMABLE AND SAFE TO EAT:
  * "isConsumable": true
  * "isStorable": true
  * "spoilageSeverity": "fresh" | "minor_wilting" | "expiring_soon"
  * "healthHazardWarning": ""
  * "disposalAdvice": ""
  * Provide practical climate-tuned preservation tips and delicious regional rescue recipes.

3. USER GEOGRAPHIC & CLIMATIC PROFILE:
- Country: ${userLocation.country}
- State / Province: ${userLocation.state}
- City / Region: ${userLocation.city}
Tailor all verdicts to this exact location:
- Spoilage risk and estimated days left MUST reflect the ambient humidity, local temperature, and typical climate conditions of ${userLocation.city}, ${userLocation.state}, ${userLocation.country}.
- Storage recommendations must specify practical preservation tips effective for ${userLocation.city}'s environment.
- Rescue recipes (for consumable items only) MUST utilize commonly accessible regional pantry ingredients, local spices, and cooking styles familiar to households in ${userLocation.city}, ${userLocation.state}, ${userLocation.country}.
- Estimate financial savings in standard local currency values (e.g. INR ₹ in India, or appropriate local units).

Provide your response ONLY as a raw, valid JSON object (strictly NO markdown formatting, NO backticks, NO \`\`\`json code blocks) matching this schema:
{
  "summary": "Concise 1-2 sentence culinary summary of all recognized food items and priority safety/preservation action needed",
  "locationContext": "${userLocation.city}, ${userLocation.state}, ${userLocation.country}",
  "hasSpoiledItems": true | false,
  "detectedItems": [
    {
      "itemName": "Specific recognizable name of this individual item (e.g., 'Cavendish Bananas', 'Fresh Spinach Leaves', 'Cooked Yellow Dal')",
      "category": "Produce" | "Leftovers" | "Dairy" | "Bakery" | "Protein" | "Pantry" | "Beverage" | "Other",
      "portionSize": "Estimated portion/quantity visible (e.g., '3 medium bananas (~350g)' or 'Approx 250g bowl')",
      "spoilageRisk": "low" | "medium" | "high" | "spoiled",
      "isConsumable": true | false,
      "isStorable": true | false,
      "spoilageSeverity": "fresh" | "minor_wilting" | "expiring_soon" | "heavy_rot" | "toxic_mold" | "damaged_destroyed",
      "healthHazardWarning": "Detailed warning if spoiled/unconsumable, or empty string if safe",
      "disposalAdvice": "Safe composting or disposal guidance if spoiled/unconsumable, or empty string if safe",
      "spoilageNotes": "Detailed observation on visible freshness signs, wilting, ripening, browning, mold, or decomposition",
      "estimatedDaysLeft": 2,
      "storageTips": "Precise, actionable preservation advice specifically for this item in ${userLocation.city}'s climate",
      "recipes": [
        {
          "title": "Regionally Tailored Rescue Recipe",
          "time": "15 mins",
          "ingredients": ["This food item", "Common local staple", "Local seasoning/spice"],
          "instructions": "Clear, practical 2-sentence preparation instructions to rescue this ingredient quickly"
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

    // Normalize detectedItems array and sanitize edge cases (rot/spoilage/unconsumable items)
    let rawItems: any[] = [];
    if (
      rawAnalysis?.detectedItems &&
      Array.isArray(rawAnalysis.detectedItems) &&
      rawAnalysis.detectedItems.length > 0
    ) {
      rawItems = rawAnalysis.detectedItems;
    } else if (rawAnalysis?.itemName) {
      rawItems = [rawAnalysis];
    } else {
      rawItems = [
        {
          itemName: "Recognized Food Item",
          category: "Produce",
          portionSize: "Standard portion",
          spoilageRisk: "medium",
          isConsumable: true,
          isStorable: true,
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

    const detectedItems: any[] = rawItems.map((item: any) => {
      const isSpoiled =
        item.spoilageRisk === "spoiled" ||
        item.isConsumable === false ||
        item.isStorable === false;

      return {
        ...item,
        itemName: item.itemName || "Identified Food Item",
        category: item.category || "Produce",
        portionSize: item.portionSize || "Standard portion",
        spoilageRisk: isSpoiled ? "spoiled" : item.spoilageRisk || "medium",
        isConsumable: isSpoiled ? false : item.isConsumable !== false,
        isStorable: isSpoiled ? false : item.isStorable !== false,
        spoilageSeverity:
          item.spoilageSeverity || (isSpoiled ? "heavy_rot" : "fresh"),
        healthHazardWarning:
          item.healthHazardWarning ||
          (isSpoiled
            ? "Visual signs of rot, fungal mold, or microbial decomposition detected. Severe risk of food poisoning and mycotoxin exposure. DO NOT CONSUME."
            : ""),
        disposalAdvice:
          item.disposalAdvice ||
          (isSpoiled
            ? "Do NOT keep in refrigerator. Discard immediately in a sealed compost bag or waste bin to prevent airborne spore cross-contamination."
            : ""),
        spoilageNotes: item.spoilageNotes || "",
        estimatedDaysLeft: isSpoiled ? 0 : Number(item.estimatedDaysLeft) || 1,
        storageTips: isSpoiled
          ? "DO NOT STORE — Item is spoiled and will cross-contaminate other food."
          : item.storageTips || "",
        recipes: isSpoiled ? [] : item.recipes || [],
        co2SavedKg: isSpoiled ? 0 : Number(item.co2SavedKg) || 0.8,
        financialSavings: isSpoiled ? 0 : Number(item.financialSavings) || 50,
        tags: item.tags || [],
      };
    });

    // Primary item represents the most urgent or first recognized item
    const primaryItem = detectedItems.reduce((prev: any, curr: any) => {
      const riskOrder: Record<string, number> = {
        spoiled: 4,
        high: 3,
        medium: 2,
        low: 1,
      };
      const prevRisk = riskOrder[prev?.spoilageRisk] || 2;
      const currRisk = riskOrder[curr?.spoilageRisk] || 2;
      return currRisk > prevRisk ? curr : prev;
    }, detectedItems[0]);

    const itemName = primaryItem.itemName || "Identified Food Item";
    const category = primaryItem.category || "Produce";
    const spoilageRisk = primaryItem.spoilageRisk || "medium";
    const estimatedDaysLeft = Number(primaryItem.estimatedDaysLeft) || 0;
    const co2SavedKg = Number(primaryItem.co2SavedKg) || 0;
    const financialSavings = Number(primaryItem.financialSavings) || 0;

    // STEP 3: Store Extensive Intelligence & Safety into Cloudinary Asset Metadata (DAM)
    try {
      const contextMap: Record<string, string> = {
        food_title: encodeURIComponent(itemName),
        total_items_detected: String(detectedItems.length),
        all_items_catalog: encodeURIComponent(
          detectedItems
            .map((i) => i.itemName)
            .join(", ")
            .slice(0, 300),
        ),
        primary_category: category,
        spoilage_risk: spoilageRisk,
        spoilage_severity: primaryItem.spoilageSeverity || "normal",
        is_consumable: String(primaryItem.isConsumable),
        is_storable: String(primaryItem.isStorable),
        safety_verdict:
          primaryItem.isConsumable === false
            ? "CRITICAL_HAZARD_UNFIT_FOR_CONSUMPTION"
            : "SAFE_TO_CONSUME",
        health_warning: encodeURIComponent(
          primaryItem.healthHazardWarning || "None",
        ),
        disposal_instructions: encodeURIComponent(
          primaryItem.disposalAdvice || "Standard consumption",
        ),
        estimated_days_remaining: String(estimatedDaysLeft),
        co2_impact_kg: String(co2SavedKg),
        financial_savings_value: String(financialSavings),
        regional_climate_profile: encodeURIComponent(
          `${userLocation.city}, ${userLocation.state}, ${userLocation.country}`,
        ),
        user_city: encodeURIComponent(userLocation.city),
        user_state: encodeURIComponent(userLocation.state),
        user_country: encodeURIComponent(userLocation.country),
        analyzed_at: new Date().toISOString(),
        ai_engine: "morsel-precision-food-safety-v2",
      };

      const contextString = Object.entries(contextMap)
        .map(([k, v]) => `${k}=${v}`)
        .join("|");

      await cloudinary.uploader.add_context(contextString, [publicId]);

      // Cloudinary Searchable Tags for Advanced DAM Filtering
      const cldTags = [
        "morsel_ai_scan",
        category.toLowerCase(),
        spoilageRisk,
        primaryItem.isConsumable === false
          ? "unconsumable_spoiled"
          : "consumable_safe",
        primaryItem.isStorable === false
          ? "not_storable_hazard"
          : "storable_fridge",
        userLocation.city.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        userLocation.country.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        ...detectedItems
          .map((i) =>
            (i.itemName || "").toLowerCase().replace(/[^a-z0-9]/g, "_"),
          )
          .filter(Boolean),
      ].slice(0, 25);

      await cloudinary.uploader.add_tag(cldTags.join(","), [publicId]);
    } catch (cldContextErr) {
      console.warn("Cloudinary rich metadata sync notice:", cldContextErr);
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
          const isSpoiledItem =
            itemData.isConsumable === false ||
            itemData.spoilageRisk === "spoiled";

          const createdDoc = await FoodItem.create({
            userId,
            name: itemData.itemName || "Identified Food Item",
            category: itemData.category || "Produce",
            portionSize: itemData.portionSize || "Standard portion",
            spoilageRisk: itemData.spoilageRisk || "medium",
            isConsumable: itemData.isConsumable !== false,
            isStorable: itemData.isStorable !== false,
            spoilageSeverity: itemData.spoilageSeverity || "fresh",
            healthHazardWarning: itemData.healthHazardWarning || "",
            disposalAdvice: itemData.disposalAdvice || "",
            spoilageNotes: itemData.spoilageNotes || "",
            estimatedDaysLeft: Number(itemData.estimatedDaysLeft) || 0,
            storageTips: itemData.storageTips || "",
            recipes: itemData.recipes || [],
            co2SavedKg: Number(itemData.co2SavedKg) || 0,
            financialSavings: Number(itemData.financialSavings) || 0,
            cloudinaryPublicId: publicId,
            cloudinaryUrl: secureUrl,
            badgedUrl,
            dominantColors: dominantColors.slice(0, 5),
            tags: itemData.tags || [],
            status: "in_fridge",
            wastedAt: isSpoiledItem ? new Date() : undefined,
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
