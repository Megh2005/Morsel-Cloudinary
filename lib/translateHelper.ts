/**
 * Helper to translate dynamic content using Google Cloud Translation API via /api/translate
 * Includes an in-memory cache to avoid duplicate calls.
 */

const translationCache = new Map<string, string>();

export async function translateContent(
  text: string,
  targetLang?: string
): Promise<string> {
  if (!text || typeof text !== "string") return text;

  const lang =
    targetLang ||
    (typeof window !== "undefined"
      ? localStorage.getItem("morsel_lang") || "en"
      : "en");

  if (lang === "en") return text;

  const cacheKey = `${lang}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target: lang }),
    });

    if (!res.ok) return text;
    const data = await res.json();
    const translated = data.translatedText || text;
    translationCache.set(cacheKey, translated);
    return translated;
  } catch (error) {
    console.warn("Translation failed, falling back to original:", error);
    return text;
  }
}

export async function translateBatch(
  texts: string[],
  targetLang?: string
): Promise<string[]> {
  if (!texts || texts.length === 0) return [];

  const lang =
    targetLang ||
    (typeof window !== "undefined"
      ? localStorage.getItem("morsel_lang") || "en"
      : "en");

  if (lang === "en") return texts;

  // Check if all are cached
  const results: string[] = [];
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  texts.forEach((t, i) => {
    const key = `${lang}:${t}`;
    if (translationCache.has(key)) {
      results[i] = translationCache.get(key)!;
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(t);
    }
  });

  if (uncachedTexts.length === 0) {
    return results;
  }

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: uncachedTexts, target: lang }),
    });

    if (!res.ok) {
      uncachedIndices.forEach((origIdx, i) => {
        results[origIdx] = uncachedTexts[i];
      });
      return results;
    }

    const data = await res.json();
    const translatedArray = Array.isArray(data.translatedText)
      ? data.translatedText
      : [data.translatedText];

    uncachedIndices.forEach((origIdx, i) => {
      const translated = translatedArray[i] || uncachedTexts[i];
      results[origIdx] = translated;
      translationCache.set(`${lang}:${uncachedTexts[i]}`, translated);
    });

    return results;
  } catch (error) {
    uncachedIndices.forEach((origIdx, i) => {
      results[origIdx] = uncachedTexts[i];
    });
    return results;
  }
}
