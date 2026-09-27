import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng") || searchParams.get("lon");
  const category = searchParams.get("category");

  const cacheHeaders = {
    "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  };

  if (!q.trim() || q.trim().length < 2) {
    return NextResponse.json({ success: true, results: [] }, { headers: cacheHeaders });
  }

  const items: any[] = [];

  // Distance calculator (Haversine formula)
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  // 1. Primary: Photon with Proximity Bias
  try {
    let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=10`;
    if (lat && lng) {
      photonUrl += `&lat=${lat}&lon=${lng}`;
    }
    if (category === "hospital") {
      photonUrl += `&osm_tag=amenity:hospital`;
    } else if (category === "market") {
      photonUrl += `&osm_tag=shop:supermarket&osm_tag=amenity:marketplace`;
    }

    const photonRes = await fetch(photonUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (photonRes.ok) {
      const pData = await photonRes.json();
      if (pData.features && Array.isArray(pData.features)) {
        for (const feat of pData.features) {
          const props = feat.properties;
          const coords = feat.geometry?.coordinates;
          if (!coords || coords.length < 2) continue;

          const lon = coords[0];
          const itemLat = coords[1];

          let cat = "address";
          if (props.osm_key === "amenity") cat = "amenity";
          else if (props.osm_key === "shop") cat = "shop";
          else if (props.osm_key === "tourism" || props.osm_key === "historic") cat = "landmark";
          else if (props.osm_key === "office" || props.osm_key === "building") cat = "establishment";

          const name = props.name || props.street || "Location";
          const subtitleParts = [
            props.street,
            props.city || props.district,
            props.state,
            props.country,
          ].filter(Boolean);

          const distanceKm =
            lat && lng
              ? getDistanceKm(parseFloat(lat), parseFloat(lng), itemLat, lon)
              : undefined;

          items.push({
            id: `photon-${props.osm_id || "item"}-${items.length}`,
            name,
            subtitle: subtitleParts.join(", "),
            lat: itemLat,
            lng: lon,
            category: cat,
            tag: props.osm_value || props.osm_key,
            distanceKm,
            raw: {
              city: props.city || props.district,
              state: props.state,
              country: props.country,
              postcode: props.postcode,
            },
          });
        }
      }
    }
  } catch (err) {
    console.warn("Photon search error:", err);
  }

  // 2. Nominatim fallback if sparse
  if (items.length < 3) {
    try {
      let nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q
      )}&format=json&addressdetails=1&extratags=1&limit=5`;
      if (lat && lng) {
        const uLat = parseFloat(lat);
        const uLng = parseFloat(lng);
        nomUrl += `&viewbox=${uLng - 0.5},${uLat + 0.5},${uLng + 0.5},${uLat - 0.5}&bounded=0`;
      }

      const nomRes = await fetch(nomUrl, {
        headers: {
          "User-Agent": "Morsel-FieldWatch/1.0 (contact@morsel.org)",
          Accept: "application/json",
        },
        next: { revalidate: 86400 },
      });

      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (Array.isArray(nomData)) {
          for (const hit of nomData) {
            const itemLat = parseFloat(hit.lat);
            const itemLng = parseFloat(hit.lon);
            if (isNaN(itemLat) || isNaN(itemLng)) continue;

            if (items.some((i) => Math.abs(i.lat - itemLat) < 0.001 && Math.abs(i.lng - itemLng) < 0.001)) {
              continue;
            }

            let cat = "address";
            if (hit.class === "amenity") cat = "amenity";
            else if (hit.class === "tourism" || hit.class === "historic") cat = "landmark";
            else if (hit.class === "shop") cat = "shop";
            else if (hit.class === "office" || hit.class === "building") cat = "establishment";

            const distanceKm =
              lat && lng
                ? getDistanceKm(parseFloat(lat), parseFloat(lng), itemLat, itemLng)
                : undefined;

            items.push({
              id: `nom-${hit.place_id}`,
              name: hit.name || hit.display_name?.split(",")[0] || "Location",
              subtitle: hit.display_name,
              lat: itemLat,
              lng: itemLng,
              category: cat,
              tag: hit.type || hit.class,
              distanceKm,
              raw: {
                city: hit.address?.city || hit.address?.town || hit.address?.village,
                state: hit.address?.state,
                country: hit.address?.country,
                postcode: hit.address?.postcode,
              },
            });
          }
        }
      }
    } catch (err) {
      console.warn("Nominatim search error:", err);
    }
  }

  // Sort by distance if coordinates available
  items.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));

  return NextResponse.json({ success: true, results: items }, { headers: cacheHeaders });
}
