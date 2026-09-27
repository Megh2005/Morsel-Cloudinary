import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng") || searchParams.get("lon");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat or lng" }, { status: 400 });
  }

  const cacheHeaders = {
    "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
  };

  // 1. Try OpenStreetMap Nominatim with proper User-Agent
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1`;
    const nomRes = await fetch(nomUrl, {
      headers: {
        "User-Agent": "Morsel-RescueBridge/1.0 (contact@morsel.org)",
        Accept: "application/json",
      },
      next: { revalidate: 86400 },
    });

    if (nomRes.ok) {
      const data = await nomRes.json();
      if (data && data.address) {
        const addr = data.address;
        const establishment =
          data.name ||
          addr.amenity ||
          addr.shop ||
          addr.tourism ||
          addr.building ||
          addr.office ||
          addr.leisure ||
          data.extratags?.brand ||
          "";

        const city =
          addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
        const state = addr.state || addr.region || "";
        const country = addr.country || "";
        const pincode = addr.postcode || "";
        const display_name = data.display_name || establishment || "Selected Field Location";

        return NextResponse.json(
          {
            success: true,
            establishment,
            city,
            state,
            country,
            pincode,
            display_name,
          },
          { headers: cacheHeaders }
        );
      }
    }
  } catch (err) {
    console.warn("Nominatim reverse failed, falling back to Photon:", err);
  }

  // 2. Fallback to Photon Komoot reverse geocoding
  try {
    const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
    const photonRes = await fetch(photonUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (photonRes.ok) {
      const pData = await photonRes.json();
      if (pData.features && pData.features.length > 0) {
        const props = pData.features[0].properties;
        const establishment = props.name || "";
        const city = props.city || props.district || props.county || "";
        const state = props.state || "";
        const country = props.country || "";
        const pincode = props.postcode || "";
        const subtitleParts = [props.street, city, state, country].filter(Boolean);
        const display_name = establishment
          ? `${establishment}, ${subtitleParts.join(", ")}`
          : subtitleParts.join(", ") || "Selected Field Location";

        return NextResponse.json(
          {
            success: true,
            establishment,
            city,
            state,
            country,
            pincode,
            display_name,
          },
          { headers: cacheHeaders }
        );
      }
    }
  } catch (err) {
    console.warn("Photon reverse fallback failed:", err);
  }

  // Fallback response with coordinates
  const fallbackLat = parseFloat(lat);
  const fallbackLng = parseFloat(lng);
  return NextResponse.json(
    {
      success: true,
      establishment: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
      display_name: `${isNaN(fallbackLat) ? lat : fallbackLat.toFixed(5)}°, ${
        isNaN(fallbackLng) ? lng : fallbackLng.toFixed(5)
      }°`,
    },
    { headers: cacheHeaders }
  );
}
