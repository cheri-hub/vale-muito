import type { UserProfile } from "@/domain/recommendations";
import { ensureBasicProfile } from "@/lib/auth/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface CurrentUserResult {
  profile: UserProfile | null;
  mode: "offline" | "supabase";
}

export async function getCurrentUser(): Promise<CurrentUserResult> {
  if (!isSupabaseConfigured()) {
    return { profile: null, mode: "offline" };
  }

  const supabase = await createServerSupabaseClient();
  const { data: authData } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!authData.user || !supabase) {
    return { profile: null, mode: "supabase" };
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id,name,handle,role")
    .eq("id", authData.user.id)
    .maybeSingle();
  const profile = profileData as Pick<UserProfile, "id" | "name" | "handle" | "role"> | null;

  if (!profile) {
    try {
      return { profile: await ensureBasicProfile(supabase, authData.user), mode: "supabase" };
    } catch {
      return { profile: null, mode: "supabase" };
    }
  }

  return {
    profile: {
      id: profile.id,
      name: profile.name,
      handle: profile.handle,
      role: profile.role,
    },
    mode: "supabase",
  };
}

export function getOfflineDemoUser(role: "member" | "admin" = "member"): UserProfile {
  return {
    id: `offline-${role}`,
    name: role === "admin" ? "Admin Demo" : "Usuário Demo",
    handle: role === "admin" ? "@admin-demo" : "@demo",
    role,
  };
}