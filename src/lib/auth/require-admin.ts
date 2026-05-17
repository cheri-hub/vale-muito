import { canModerate } from "./permissions";
import { getCurrentUser, getOfflineDemoUser } from "./current-user";

export interface AdminAccessResult {
  allowed: boolean;
  mode: "offline" | "supabase";
  reason?: string;
}

export async function requireAdmin(): Promise<AdminAccessResult> {
  const currentUser = await getCurrentUser();

  if (currentUser.mode === "offline") {
    return { allowed: true, mode: "offline" };
  }

  if (canModerate(currentUser.profile)) {
    return { allowed: true, mode: "supabase" };
  }

  return {
    allowed: false,
    mode: "supabase",
    reason: "Você precisa entrar com uma conta admin para acessar a moderação.",
  };
}

export function getOfflineAdminProfile() {
  return getOfflineDemoUser("admin");
}