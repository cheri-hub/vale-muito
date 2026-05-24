export const PRODUCTION_SUPABASE_URL = "https://sawbyjtmoltbldkxotkq.supabase.co";

export function getConfiguredSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || PRODUCTION_SUPABASE_URL;
}