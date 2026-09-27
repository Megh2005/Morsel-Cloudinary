import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text, target = "en" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { translatedText: text, message: "Google API key not configured" },
        { status: 200 }
      );
    }

    const texts = Array.isArray(text) ? text : [text];

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: texts,
          target,
          format: "text",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn("Translation API warning:", errorData);
      return NextResponse.json({
        translatedText: text,
        fallback: true,
      });
    }

    const data = await response.json();
    const translations = data?.data?.translations;

    if (!translations || translations.length === 0) {
      return NextResponse.json({ translatedText: text });
    }

    const result = Array.isArray(text)
      ? translations.map((t: any) => t.translatedText)
      : translations[0].translatedText;

    return NextResponse.json({
      translatedText: result,
      detectedSourceLanguage: translations[0]?.detectedSourceLanguage,
    });
  } catch (error: any) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to translate" },
      { status: 500 }
    );
  }
}
