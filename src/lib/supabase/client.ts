"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabasePublicEnv, type SupabasePublicEnv } from "./env";

export function createBrowserSupabaseClient(runtimeEnv?: SupabasePublicEnv | null) {
  const env = runtimeEnv ?? getSupabasePublicEnv();

  if (!env) {
    return null;
  }

  return createBrowserClient<Database>(env.url, env.anonKey);
}