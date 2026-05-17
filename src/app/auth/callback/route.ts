import { NextResponse, type NextRequest } from "next/server";
import { ensureBasicProfile } from "@/lib/auth/profiles";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const supabase = await createServerSupabaseClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth_failed", request.nextUrl.origin));
    }

    const { data: authData } = await supabase.auth.getUser();

    if (authData.user) {
      try {
        await ensureBasicProfile(supabase, authData.user);
      } catch {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/login?error=profile_failed", request.nextUrl.origin));
      }
    }
  }

  return NextResponse.redirect(new URL("/", request.nextUrl.origin));
}