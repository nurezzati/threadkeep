import { NextRequest, NextResponse } from "next/server";

export interface OGMeta {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

interface OGParseError {
  error: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function extractMeta(html: string, url: string): OGMeta {
  /**
   * Lightweight OG parser — no DOM/jsdom dependency needed server-side.
   * Reads <meta property="og:*"> and <meta name="*"> tags via regex.
   */
  const metaRegex =
    /<meta\s+(?:[^>]*?\s)?(?:property|name)=["']([^"']+)["'][^>]*?\s+content=["']([^"']*)["'][^>]*?>/gi;
  // Also handle reversed attribute order: content=... property=...
  const metaRegexRev =
    /<meta\s+(?:[^>]*?\s)?content=["']([^"']*)["'][^>]*?\s+(?:property|name)=["']([^"']+)["'][^>]*?>/gi;

  const bag: Record<string, string> = {};

  for (const regex of [metaRegex, metaRegexRev]) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      // Normal order: group1 = property, group2 = content
      // Reversed order: group1 = content, group2 = property
      const [, a, b] = match;
      const [key, value] =
        regex === metaRegex ? [a.toLowerCase(), b] : [b.toLowerCase(), a];
      if (!bag[key]) bag[key] = value;
    }
  }

  // Fallback title from <title> tag
  const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const fallbackTitle = titleTagMatch ? titleTagMatch[1].trim() : null;

  return {
    url,
    title: bag["og:title"] || bag["twitter:title"] || fallbackTitle,
    description:
      bag["og:description"] || bag["twitter:description"] || bag["description"],
    image: bag["og:image"] || bag["twitter:image"] || null,
    siteName: bag["og:site_name"] || null,
  };
}

function validateThreadsUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw);
    if (!parsed.hostname.endsWith("threads.net")) return null;
    // Only allow http/https
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest
): Promise<NextResponse<OGMeta | OGParseError>> {
  const { searchParams } = req.nextUrl;
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json(
      { error: "Missing `url` query parameter." },
      { status: 400 }
    );
  }

  const parsed = validateThreadsUrl(rawUrl);
  if (!parsed) {
    return NextResponse.json(
      { error: "URL must be a valid threads.net link." },
      { status: 422 }
    );
  }

  let html: string;
  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        // Mimic a browser to get server-rendered OG tags
        "User-Agent":
          "Mozilla/5.0 (compatible; ThreadKeepBot/1.0; +https://threadkeep.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      // Abort after 8 s so we don't block for long
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream responded with ${res.status}.` },
        { status: 502 }
      );
    }

    // Read only the <head> portion — typically first ~20 KB is enough
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body.");

    let accumulated = "";
    const decoder = new TextDecoder();
    const MAX_BYTES = 30_000;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
      if (accumulated.length >= MAX_BYTES) {
        reader.cancel();
        break;
      }
    }

    html = accumulated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const meta = extractMeta(html, parsed.toString());

  return NextResponse.json(meta, {
    headers: {
      // Cache for 1 hour — OG tags rarely change
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
