import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  try {
    const { z, x, y } = await params;
    const cleanY = y.replace(/\.(mvt|pbf)$/i, "");

    const apiKey = process.env.PROTOMAPS_API_KEY;
    if (!apiKey) {
      return new NextResponse("Protomaps API key not configured", { status: 500 });
    }

    const upstreamUrl = `https://api.protomaps.com/tiles/v3/${z}/${x}/${cleanY}.mvt?key=${apiKey}`;

    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/x-protobuf",
      },
      next: {
        revalidate: 86400, // Cache for 24 hours
      },
    });

    if (!upstreamRes.ok) {
      return new NextResponse(`Protomaps upstream error: ${upstreamRes.statusText}`, {
        status: upstreamRes.status,
      });
    }

    const buffer = await upstreamRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/x-protobuf",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    console.error("Protomaps proxy error:", error);
    return new NextResponse("Failed to proxy Protomaps tile", { status: 500 });
  }
}
