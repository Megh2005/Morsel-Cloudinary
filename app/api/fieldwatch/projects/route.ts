import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import FieldEvidence from "@/models/FieldEvidence";
import ImpactProject from "@/models/ImpactProject";

// Pre-configured rich verified demo drives for zero-empty-state onboarding
const DEMO_PROJECTS = [
  {
    _id: "demo-kolkata-market-rescue",
    title: "Sealdah Market Surplus Rescue & Meal Distribution",
    organizationName: "Morsel Community Aid Bengal",
    category: "food_rescue",
    description:
      "Rescued 180kg of edible vegetable surplus from morning wholesale market and converted into 420 hot nutritious khichdi meals for local community shelters.",
    location: {
      lat: 22.5697,
      lng: 88.3697,
      display_name:
        "Sealdah Wholesale Market, Bepin Behari Ganguly St, Bowbazar, Kolkata, West Bengal 700012",
      city: "Kolkata",
      state: "West Bengal",
      country: "India",
      pincode: "700012",
    },
    totalMealsRescued: 420,
    totalCo2DivertedKg: 168.5,
    status: "verified",
    sdgGoals: [
      "SDG 2: Zero Hunger",
      "SDG 12: Responsible Consumption",
      "SDG 13: Climate Action",
    ],
    beforeEvidence: {
      _id: "demo-ev-before-1",
      phase: "before",
      title: "Crates of Edible Produce Surplus Collected from Market Vendors",
      activityType: "surplus_harvest",
      cloudinaryPublicId: "morsel_demo_produce_surplus",
      cloudinaryUrl:
        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
      transformedCardUrl:
        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
      location: {
        lat: 22.5697,
        lng: 88.3697,
        display_name: "Sealdah Wholesale Market, Kolkata",
        city: "Kolkata",
        state: "West Bengal",
        country: "India",
      },
      aiAnalysis: {
        sceneType: "market_surplus_sorting",
        detectedFoodItems: [
          "Cabbage",
          "Tomatoes",
          "Potatoes",
          "Spinach",
          "Cauliflower",
        ],
        estimatedMealsCount: 420,
        co2DivertedKg: 168.5,
        confidenceScore: 0.96,
        verificationNotes:
          "Visual audit confirms approximately 180kg of safe, edible produce with fresh cellular integrity rescued before landfill diversion.",
        sdgImpact: "SDG 12: Responsible Consumption & Production",
        verificationStatus: "verified",
      },
      recordedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    afterEvidence: {
      _id: "demo-ev-after-1",
      phase: "after",
      title: "Hot Meal Trays Prepared and Served at Shelter Kitchen",
      activityType: "meal_distribution",
      cloudinaryPublicId: "morsel_demo_meal_distribution",
      cloudinaryUrl:
        "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80",
      transformedCardUrl:
        "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80",
      location: {
        lat: 22.5629,
        lng: 88.3638,
        display_name:
          "Central Kolkata Community Care Hall, College Square, Kolkata",
        city: "Kolkata",
        state: "West Bengal",
        country: "India",
      },
      aiAnalysis: {
        sceneType: "community_meal_distribution",
        detectedFoodItems: [
          "Prepared Rice Bowls",
          "Lentil Khichdi",
          "Vegetable Stew",
        ],
        estimatedMealsCount: 420,
        co2DivertedKg: 168.5,
        confidenceScore: 0.98,
        verificationNotes:
          "Visual audit verifies 420 warm meal portions distributed with hygienic food-grade stainless containers and active volunteer verification.",
        sdgImpact: "SDG 2: Zero Hunger",
        verificationStatus: "verified",
      },
      recordedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  },
  {
    _id: "demo-mumbai-compost-hub",
    title: "Urban Veg Scraps to Living Organic Compost",
    organizationName: "Green Soil Earth Mission",
    category: "compost_regeneration",
    description:
      "Collected 350kg of kitchen cuttings, peelings, and coffee grounds from 15 community cafes and diverted to aerobic microbe vermicompost beds.",
    location: {
      lat: 19.076,
      lng: 72.8777,
      display_name:
        "Bandra Urban Farm Hub, Bandra West, Mumbai, Maharashtra 400050",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      pincode: "400050",
    },
    totalMealsRescued: 0,
    totalCo2DivertedKg: 285.0,
    status: "verified",
    sdgGoals: [
      "SDG 13: Climate Action",
      "SDG 15: Life on Land",
      "SDG 12: Responsible Consumption",
    ],
    beforeEvidence: {
      _id: "demo-ev-before-2",
      phase: "before",
      title: "Raw Kitchen Waste & Vegetable Trimmings Inflow",
      activityType: "composting_feedstock",
      cloudinaryPublicId: "morsel_demo_compost_before",
      cloudinaryUrl:
        "https://images.unsplash.com/photo-1582281298055-e25b84a30b0b?auto=format&fit=crop&w=1200&q=80",
      transformedCardUrl:
        "https://images.unsplash.com/photo-1582281298055-e25b84a30b0b?auto=format&fit=crop&w=1200&q=80",
      location: {
        lat: 19.076,
        lng: 72.8777,
        display_name: "Bandra West Collection Depot, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
      },
      aiAnalysis: {
        sceneType: "organic_feedstock_collection",
        detectedFoodItems: [
          "Fruit Peelings",
          "Vegetable Ends",
          "Coffee Grounds",
        ],
        estimatedMealsCount: 0,
        co2DivertedKg: 285.0,
        confidenceScore: 0.94,
        verificationNotes:
          "Visual verification confirms pure organic feedstock free of non-biodegradable plastics ready for nitrogen-carbon ratio balancing.",
        sdgImpact: "SDG 12: Responsible Consumption",
        verificationStatus: "verified",
      },
      recordedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    afterEvidence: {
      _id: "demo-ev-after-2",
      phase: "after",
      title: "Nutrient-Dense Living Bio-Compost for Urban Community Gardens",
      activityType: "soil_regeneration",
      cloudinaryPublicId: "morsel_demo_compost_after",
      cloudinaryUrl:
        "https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=1200&q=80",
      transformedCardUrl:
        "https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=1200&q=80",
      location: {
        lat: 19.076,
        lng: 72.8777,
        display_name: "Bandra Urban Farm Hub, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
      },
      aiAnalysis: {
        sceneType: "regenerative_soil_enrichment",
        detectedFoodItems: ["Dark Humus", "Organic Compost", "Bio-Fertilizer"],
        estimatedMealsCount: 0,
        co2DivertedKg: 285.0,
        confidenceScore: 0.97,
        verificationNotes:
          "Soil transformation verified: dark crumbly humus enriched with mycorrhizal fungi, restoring urban garden topsoil.",
        sdgImpact: "SDG 15: Life on Land",
        verificationStatus: "verified",
      },
      recordedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  },
];

export async function GET(_req: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    const _userId =
      session?.user?.id ||
      (session?.user as any)?._id ||
      (session?.user as any)?.email;

    // Fetch user or community projects
    const dbProjects = await ImpactProject.find()
      .sort({ createdAt: -1 })
      .lean();

    // Attach evidence to projects
    const formattedProjects = await Promise.all(
      dbProjects.map(async (project: any) => {
        const evidenceList = await FieldEvidence.find({
          projectId: project._id,
        })
          .sort({ recordedAt: -1 })
          .lean();

        const beforeEvidence =
          evidenceList.find((e) => e.phase === "before") || null;
        const afterEvidence =
          evidenceList.find((e) => e.phase === "after") || null;

        return {
          ...project,
          evidenceList,
          beforeEvidence,
          afterEvidence,
        };
      }),
    );

    // Prioritize user's actual database projects; only provide one sample drive if zero exist
    const allProjects =
      formattedProjects.length > 0
        ? formattedProjects
        : DEMO_PROJECTS.slice(0, 1).map((p) => ({ ...p, isSample: true }));

    return NextResponse.json({
      success: true,
      projects: allProjects,
      totalProjectsCount: allProjects.length,
      hasRealProjects: formattedProjects.length > 0,
    });
  } catch (error: any) {
    console.error("Error fetching impact projects:", error);
    return NextResponse.json({
      success: true,
      projects: DEMO_PROJECTS.slice(0, 1).map((p) => ({ ...p, isSample: true })),
      notice: "Serving verified sample reference drive",
      hasRealProjects: false,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required to create a field drive" },
        { status: 401 },
      );
    }
    const userId =
      session.user.id ||
      (session.user as any)._id ||
      (session.user as any).email;

    const body = await req.json();
    const {
      title,
      organizationName,
      category,
      description,
      location,
      sdgGoals,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Project title is required" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const newProject = await ImpactProject.create({
      userId,
      title: title.trim(),
      organizationName: organizationName?.trim() || "Community Initiative",
      category: category || "food_rescue",
      description: description?.trim() || "",
      location: {
        lat: Number(location?.lat) || 0,
        lng: Number(location?.lng) || 0,
        display_name: location?.display_name || "",
        city: location?.city || "",
        state: location?.state || "",
        country: location?.country || "India",
        pincode: location?.pincode || "",
      },
      sdgGoals: sdgGoals || [
        "SDG 2: Zero Hunger",
        "SDG 12: Responsible Consumption",
        "SDG 13: Climate Action",
      ],
      status: "active",
    });

    return NextResponse.json({
      success: true,
      project: newProject,
    });
  } catch (error: any) {
    console.error("Error creating impact project:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create impact project" },
      { status: 500 },
    );
  }
}
