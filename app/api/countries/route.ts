import { NextRequest, NextResponse } from "next/server";
import {
  getAlphabeticalCountries,
  getAlphabeticalStates,
  getAlphabeticalCities,
} from "@/lib/locations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");
    const state = searchParams.get("state");

    if (country && state) {
      const cities = getAlphabeticalCities(country, state);
      return NextResponse.json(cities, {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
        },
      });
    }

    if (country) {
      const states = getAlphabeticalStates(country);
      return NextResponse.json(states, {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
        },
      });
    }

    const countries = getAlphabeticalCountries();
    return NextResponse.json(countries, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
