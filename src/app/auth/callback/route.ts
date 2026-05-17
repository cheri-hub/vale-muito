import { NextResponse, type NextRequest } from "next/server";
import { ensureBasicProfile } from "@/lib/auth/profiles";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getPublicOrigin(request: NextRequest) {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      return request.nextUrl.origin;
    }
  }

  if (process.env.RATE_LIMIT_TRUST_PROXY_HEADERS === "true") {
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();

    if (forwardedHost) {
      try {
        return new URL(`${forwardedProto ?? "https"}://${forwardedHost}`).origin;
      } catch {
        return request.nextUrl.origin;
      }
    }
  }

  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const supabase = await createServerSupabaseClient();
  const publicOrigin = getPublicOrigin(request);

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth_failed", publicOrigin));
    }

    const { data: authData } = await supabase.auth.getUser();

    if (authData.user) {
      try {
        await ensureBasicProfile(supabase, authData.user);
      } catch {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/login?error=profile_failed", publicOrigin));
      }
    }
  }

  return NextResponse.redirect(new URL("/", publicOrigin));
}