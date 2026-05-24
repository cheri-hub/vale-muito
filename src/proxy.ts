import { NextResponse, type NextRequest } from "next/server";
import { getConfiguredSupabaseUrl } from "./lib/supabase/config";

const staticImageContentSources = [
  "'self'",
  "data:",
  "blob:",
  "https://images.unsplash.com",
  "https://*.tile.openstreetmap.org",
];

export function getSupabaseContentSources(supabaseUrl = getConfiguredSupabaseUrl()): string[] {
  if (!supabaseUrl) {
    return [];
  }

  try {
    const url = new URL(supabaseUrl);

    if (url.protocol !== "https:") {
      return [];
    }

    return [`https://${url.hostname}`];
  } catch {
    return [];
  }
}

export function createContentSecurityPolicy(
  nonce: string,
  isDevelopment: boolean,
  supabaseUrl = getConfiguredSupabaseUrl(),
): string {
  const supabaseContentSources = getSupabaseContentSources(supabaseUrl);
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src ${[...staticImageContentSources, ...supabaseContentSources].join(" ")};
    connect-src ${["'self'", ...supabaseContentSources].join(" ")};
    font-src 'self';
    object-src 'none';
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `;

  return cspHeader.replace(/\s{2,}/g, " ").trim();
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDevelopment = process.env.NODE_ENV === "development";
  const contentSecurityPolicy = createContentSecurityPolicy(nonce, isDevelopment);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};