"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { recommendationInputSchema, type ModerationStatus } from "@/domain/recommendations";
import { getCurrentUser, getOfflineDemoUser } from "@/lib/auth/current-user";
import { canModerate } from "@/lib/auth/permissions";
import { geocodeAddress } from "@/lib/geocoding";
import { isValidCoordinate } from "@/lib/geolocation";
import { validateRecommendationPhoto } from "@/lib/images/recommendation-photo";
import { appOfficialRegion } from "@/lib/product";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRateLimitClientKey } from "@/lib/rate-limit-client";
import { getRecommendationRepository } from "@/repositories/recommendations";
import type { ActionResult } from "@/repositories/recommendations/recommendations-repository";

const addressSchema = z.string().trim().min(5, "Informe um endereço com mais detalhes.").max(180);
const reportReasonSchema = z.string().trim().min(5).max(500);
const tagSchema = z
  .string()
  .trim()
  .min(2)
  .max(30)
  .regex(/^[\p{L}\p{N} -]+$/u);
export async function createRecommendationAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await isActionAllowed("create", 8, 60 * 60 * 1000))) {
    return { ok: false, message: "Muitas publicações em pouco tempo. Tente novamente mais tarde.", mode: "offline" };
  }

  const repository = await getRecommendationRepository();
  const currentUser = await getCurrentUser();
  const author = currentUser.profile ?? (repository.mode === "offline" ? getOfflineDemoUser("member") : null);

  if (!author) {
    return { ok: false, message: "Faça login para publicar uma recomendação.", mode: repository.mode };
  }

  const input = await parseRecommendationForm(formData);

  if (input instanceof Error) {
    return { ok: false, message: input.message, mode: repository.mode };
  }

  try {
    const recommendation = await repository.data.create(input, author.id);

    revalidatePath("/");
    revalidatePath("/admin/moderation");
    revalidatePath(`/recommendations/${recommendation.id}`);

    return {
      ok: true,
      data: { id: recommendation.id },
      message:
        repository.mode === "offline"
          ? "Recomendação validada localmente. Configure Supabase para persistir."
          : "Recomendação publicada.",
      mode: repository.mode,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível publicar agora.",
      mode: repository.mode,
    };
  }
}

export async function geocodeRecommendationAddressAction(address: string, city = appOfficialRegion.city): Promise<ActionResult<{ latitude: number; longitude: number }>> {
  if (!(await isActionAllowed("geocode", 5, 60 * 1000))) {
    return { ok: false, message: "Muitas buscas de endereço em pouco tempo. Tente novamente em instantes.", mode: "offline" };
  }

  const repository = await getRecommendationRepository();
  const currentUser = await getCurrentUser();
  const author = currentUser.profile ?? (repository.mode === "offline" ? getOfflineDemoUser("member") : null);

  if (!author) {
    return { ok: false, message: "Faça login para buscar o endereço.", mode: repository.mode };
  }

  const parsedAddress = addressSchema.safeParse(address);

  if (!parsedAddress.success) {
    return { ok: false, message: parsedAddress.error.issues[0]?.message ?? "Informe um endereço válido.", mode: repository.mode };
  }

  const coordinates = await geocodeAddress(parsedAddress.data, city);

  if (!coordinates) {
    return { ok: false, message: "Não encontrei esse endereço. Ajuste o texto ou marque no mapa.", mode: repository.mode };
  }

  return { ok: true, data: coordinates, message: "Coordenadas atualizadas pelo endereço.", mode: repository.mode };
}

export async function updateRecommendationAction(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  if (!(await isActionAllowed(`update:${id}`, 12, 60 * 60 * 1000))) {
    return { ok: false, message: "Muitas edições em pouco tempo. Tente novamente mais tarde.", mode: "offline" };
  }

  const repository = await getRecommendationRepository();
  const currentUser = await getCurrentUser();
  const author = currentUser.profile ?? (repository.mode === "offline" ? getOfflineDemoUser("member") : null);

  if (!author) {
    return { ok: false, message: "Faça login para editar sua recomendação.", mode: repository.mode };
  }

  const input = await parseRecommendationForm(formData);

  if (input instanceof Error) {
    return { ok: false, message: input.message, mode: repository.mode };
  }

  try {
    const recommendation = await repository.data.update(id, input, author.id);

    revalidatePath("/");
    revalidatePath(`/recommendations/${id}`);
    revalidatePath(`/recommendations/${id}/edit`);
    revalidatePath("/admin/moderation");

    return {
      ok: recommendation !== null,
      data: recommendation ? { id: recommendation.id } : undefined,
      message: recommendation ? "Recomendação atualizada." : "Você só pode editar suas próprias recomendações.",
      mode: repository.mode,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível atualizar agora.",
      mode: repository.mode,
    };
  }
}

export async function deleteRecommendationAction(id: string): Promise<ActionResult> {
  if (!(await isActionAllowed(`delete:${id}`, 6, 60 * 60 * 1000))) {
    return { ok: false, message: "Muitas remoções em pouco tempo. Tente novamente mais tarde.", mode: "offline" };
  }

  const repository = await getRecommendationRepository();
  const currentUser = await getCurrentUser();
  const author = currentUser.profile ?? (repository.mode === "offline" ? getOfflineDemoUser("member") : null);

  if (!author) {
    return { ok: false, message: "Faça login para remover sua recomendação.", mode: repository.mode };
  }

  try {
    const deleted = await repository.data.delete(id, author.id);

    revalidatePath("/");
    revalidatePath(`/recommendations/${id}`);
    revalidatePath("/admin/moderation");

    return {
      ok: deleted,
      message: deleted ? "Recomendação removida." : "Você só pode remover suas próprias recomendações.",
      mode: repository.mode,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível remover agora.",
      mode: repository.mode,
    };
  }
}

export async function reportRecommendationAction(id: string, reason: string): Promise<ActionResult> {
  if (!(await isActionAllowed(`report:${id}`, 5, 15 * 60 * 1000))) {
    return { ok: false, message: "Muitas denúncias em pouco tempo. Tente novamente mais tarde.", mode: "offline" };
  }

  const parsedReason = reportReasonSchema.safeParse(reason);

  if (!parsedReason.success) {
    return { ok: false, message: "Informe um motivo válido para a denúncia.", mode: "offline" };
  }

  const repository = await getRecommendationRepository();
  const currentUser = await getCurrentUser();
  const reporterId = currentUser.profile?.id ?? null;

  if (repository.mode === "supabase" && !reporterId) {
    return { ok: false, message: "Faça login para denunciar.", mode: repository.mode };
  }

  try {
    const recommendation = await repository.data.report(id, reporterId, parsedReason.data);

    revalidatePath(`/recommendations/${id}`);
    revalidatePath("/admin/moderation");

    return {
      ok: recommendation !== null,
      message: recommendation ? "Denúncia registrada." : "Recomendação não encontrada.",
      mode: repository.mode,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível denunciar agora.",
      mode: repository.mode,
    };
  }
}

function parseTags(value: FormDataEntryValue | null): string[] {
  const tags = String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);

  return Array.from(new Set(tags)).filter((tag) => tagSchema.safeParse(tag).success);
}

async function parseRecommendationForm(formData: FormData) {
  const parsed = recommendationInputSchema.safeParse({
    dishName: formData.get("dishName"),
    placeName: formData.get("placeName"),
    category: formData.get("category"),
    neighborhood: formData.get("neighborhood"),
    pricePaid: formData.get("pricePaid"),
    valueScore: formData.get("valueScore"),
    summary: formData.get("summary"),
    whyWorthIt: formData.get("whyWorthIt"),
  });

  if (!parsed.success) {
    return new Error(parsed.error.issues[0]?.message ?? "Revise os campos da recomendação.");
  }

  const coordinates = parseCoordinates(formData);

  if (coordinates instanceof Error) {
    return coordinates;
  }

  if (!isValidCoordinate(coordinates)) {
    return new Error("Coordenadas inválidas.");
  }

  const photo = await parsePhoto(formData.get("photo"), parsed.data.dishName);

  if (photo instanceof Error) {
    return photo;
  }

  const address = addressSchema.safeParse(formData.get("address"));

  if (!address.success) {
    return new Error(address.error.issues[0]?.message ?? "Informe um endereço válido.");
  }

  return {
    ...parsed.data,
    city: String(formData.get("city") || appOfficialRegion.city),
    address: address.data,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    tags: parseTags(formData.get("tags")),
    photo,
    removePhoto: formData.get("removePhoto") === "on",
  };
}

function parseCoordinates(formData: FormData) {
  const latitudeValue = formData.get("latitude");
  const longitudeValue = formData.get("longitude");

  if (typeof latitudeValue !== "string" || typeof longitudeValue !== "string") {
    return new Error("Selecione o local da recomendação no mapa.");
  }

  if (!latitudeValue.trim() || !longitudeValue.trim()) {
    return new Error("Selecione o local da recomendação no mapa.");
  }

  return {
    latitude: Number(latitudeValue),
    longitude: Number(longitudeValue),
  };
}

export async function updateRecommendationStatusAction(
  id: string,
  status: ModerationStatus,
): Promise<ActionResult> {
  if (!(await isActionAllowed("moderation", 30, 15 * 60 * 1000))) {
    return { ok: false, message: "Muitas ações de moderação em pouco tempo.", mode: "offline" };
  }

  const repository = await getRecommendationRepository();
  const currentUser = await getCurrentUser();
  const admin = currentUser.profile ?? (repository.mode === "offline" ? getOfflineDemoUser("admin") : null);

  if (!admin || !canModerate(admin)) {
    return { ok: false, message: "Apenas admins podem moderar recomendações.", mode: repository.mode };
  }

  try {
    const recommendation = await repository.data.updateStatus(id, status, admin.id);

    revalidatePath("/");
    revalidatePath(`/recommendations/${id}`);
    revalidatePath("/admin/moderation");

    return {
      ok: recommendation !== null,
      message: recommendation ? "Status atualizado." : "Recomendação não encontrada.",
      mode: repository.mode,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível atualizar o status.",
      mode: repository.mode,
    };
  }
}

async function isActionAllowed(action: string, limit: number, windowMs: number): Promise<boolean> {
  const headerStore = await headers();
  const clientKey = getRateLimitClientKey(headerStore);

  return checkRateLimit({ key: `${action}:${clientKey}`, limit, windowMs });
}

async function parsePhoto(value: FormDataEntryValue | null, dishName: string) {
  if (!(value instanceof File) || value.size === 0) {
    return undefined;
  }

  const validationError = await validateRecommendationPhoto(value);

  if (validationError) {
    return new Error(validationError);
  }

  return {
    file: value,
    altText: `Foto de ${dishName}`,
  };
}
