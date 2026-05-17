import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { UserProfile } from "@/domain/recommendations";
import type { Database } from "@/lib/supabase/database.types";

type ProfileRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "name" | "handle" | "role">;
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type AuthUserForProfile = Pick<User, "id" | "email" | "user_metadata">;
const fallbackDisplayName = "Usuário Vale Muito";
const reservedNameFragments = ["admin", "administrador", "moderador", "suporte"];

export async function ensureBasicProfile(
  supabase: SupabaseClient<Database>,
  user: AuthUserForProfile,
): Promise<UserProfile> {
  const existingProfile = await findProfileById(supabase, user.id);

  if (existingProfile) {
    return existingProfile;
  }

  const profile = buildDefaultProfile(user);
  const { data, error } = await supabase
    .from("profiles")
    .insert(profile)
    .select("id,name,handle,role")
    .single();

  if (!error && data) {
    return mapProfile(data);
  }

  if (error.code !== "23505") {
    throw new Error("Não foi possível criar o perfil básico.");
  }

  const profileCreatedByConcurrentRequest = await findProfileById(supabase, user.id);

  if (profileCreatedByConcurrentRequest) {
    return profileCreatedByConcurrentRequest;
  }

  throw new Error("Não foi possível criar o perfil básico.");
}

export function buildDefaultProfile(user: AuthUserForProfile): ProfileInsert {
  const rawName = firstString(user.user_metadata.full_name, user.user_metadata.name, user.user_metadata.user_name);
  const name = normalizeDisplayName(rawName);
  const handleBase = slugifyHandle(firstString(user.user_metadata.user_name, name));

  return {
    id: user.id,
    name,
    handle: `@${handleBase}-${user.id.slice(0, 8)}`,
    role: "member",
  };
}

async function findProfileById(supabase: SupabaseClient<Database>, userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,handle,role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Não foi possível carregar o perfil.");
  }

  return data ? mapProfile(data) : null;
}

function mapProfile(profile: ProfileRow): UserProfile {
  return {
    id: profile.id,
    name: profile.name,
    handle: profile.handle,
    role: profile.role,
  };
}

function firstString(...values: unknown[]): string {
  const value = values.find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);

  return typeof value === "string" ? value : fallbackDisplayName;
}

function normalizeDisplayName(value: string): string {
  const normalized = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>\\{}[\]]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  const lowerName = normalized.toLocaleLowerCase("pt-BR");

  if (normalized.length < 2 || reservedNameFragments.some((fragment) => lowerName.includes(fragment))) {
    return fallbackDisplayName;
  }

  return normalized;
}

function slugifyHandle(value: string): string {
  const slug = value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  if (slug.length < 2 || reservedNameFragments.some((fragment) => slug.includes(fragment))) {
    return "usuario";
  }

  return slug;
}