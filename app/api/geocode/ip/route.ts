import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Extract client IP from headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  let clientIp = (forwardedFor ? forwardedFor.split(",")[0] : realIp || "").trim();

  // Remove IPv6 prefix if present (e.g. ::ffff:1.2.3.4)
  if (clientIp.startsWith("::ffff:")) {
    clientIp = clientIp.replace("::ffff:", "");
  }

  const isLocal =
    !clientIp ||
    clientIp === "::1" ||
    clientIp === "127.0.0.1" ||
    clientIp.startsWith("192.168.") ||
    clientIp.startsWith("10.");

  // If local dev environment, query public IP or provide India default
  const fetchUrl = isLocal ? "https://ipapi.co/json/" : `https://ipapi.co/${clientIp}/json/`;

  try {
    const res = await fetch(fetchUrl, {
      headers: { "User-Agent": "Morsel-RescueBridge/1.0" },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        return NextResponse.json({
          success: true,
          lat: data.latitude,
          lng: data.longitude,
          city: data.city || "",
          state: data.region || "",
          country: data.country_name || "India",
          ip: data.ip,
        });
      }
    }
  } catch (err) {
    console.warn("ipapi lookup failed, attempting ipwho.is fallback:", err);
  }

  // Fallback to ipwho.is
  try {
    const fallbackRes = await fetch(isLocal ? "https://ipwho.is/" : `https://ipwho.is/${clientIp}`);
    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      if (data && data.success && data.latitude && data.longitude) {
        return NextResponse.json({
          success: true,
          lat: data.latitude,
          lng: data.longitude,
          city: data.city || "",
          state: data.region || "",
          country: data.country || "India",
          ip: data.ip,
        });
      }
    }
  } catch (err) {
    console.warn("ipwho lookup failed:", err);
  }

  // India Default Fallback for Indian Jio users in development
  return NextResponse.json({
    success: true,
    lat: 19.076,
    lng: 72.8777,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    isFallback: true,
  });
}
