"use server";

import { revalidatePath } from "next/cache";
import type { UserProfile } from "@/domain/recommendations";
import { getCurrentUser } from "@/lib/auth/current-user";
import { parseProfileUpdateInput, updateUserProfile } from "@/lib/auth/profiles";
import { checkRateLimit } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/repositories/recommendations/recommendations-repository";

export async function updateProfileAction(formData: FormData): Promise<ActionResult<UserProfile>> {
  const currentUser = await getCurrentUser();

  if (!currentUser.profile) {
    return { ok: false, message: "Faça login para editar seu perfil.", mode: currentUser.mode };
  }

  if (!(await isProfileUpdateAllowed(currentUser.profile.id))) {
    return {
      ok: false,
      message: "Muitas edições de perfil em pouco tempo. Tente novamente mais tarde.",
      mode: currentUser.mode,
    };
  }

  const input = {
    name: formData.get("name"),
    handle: formData.get("handle"),
  };
  const parsedInput = parseProfileUpdateInput(input);

  if (parsedInput instanceof Error) {
    return { ok: false, message: parsedInput.message, mode: currentUser.mode };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { ok: false, message: "Perfil disponível somente com Supabase configurado.", mode: "offline" };
  }

  try {
    const profile = await updateUserProfile(supabase, currentUser.profile.id, input);

    revalidatePath("/profile");

    return { ok: true, data: profile, message: "Perfil atualizado.", mode: currentUser.mode };
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível atualizar o perfil.",
      mode: currentUser.mode,
    };
  }
}

async function isProfileUpdateAllowed(userId: string): Promise<boolean> {
  return checkRateLimit({
    key: `profile-update:${userId}`,
    limit: 6,
    windowMs: 60 * 60 * 1000,
  });
}