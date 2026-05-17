import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModerationStatus, Recommendation } from "@/domain/recommendations";
import { getRecommendationPhotoExtension, validateRecommendationPhoto } from "@/lib/images/recommendation-photo";
import { calculatePriceBand } from "@/lib/pricing";
import type { Database } from "@/lib/supabase/database.types";
import type { CreateRecommendationInput, RecommendationRepository, UpdateRecommendationInput } from "./recommendations-repository";

const recommendationPhotosBucket = "recommendation-photos";
const recommendationPhotoStoragePathPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/;
const recommendationSelect =
  "*, profiles(id,name,handle,role), recommendation_photos(storage_path,alt_text,sort_order), recommendation_tags(tags(slug,label))";

type RecommendationRow = Database["public"]["Tables"]["recommendations"]["Row"];
type PhotoRow = Pick<
  Database["public"]["Tables"]["recommendation_photos"]["Row"],
  "storage_path" | "alt_text" | "sort_order"
>;
type ProfileRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "name" | "handle" | "role">;
type TagRow = Pick<Database["public"]["Tables"]["tags"]["Row"], "slug" | "label">;
type RecommendationTagRow = { tags: TagRow | null };
type RecommendationRowWithRelations = RecommendationRow & {
  profiles: ProfileRow | null;
  recommendation_photos: PhotoRow[] | null;
  recommendation_tags: RecommendationTagRow[] | null;
};

export class SupabaseRecommendationsRepository implements RecommendationRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async list(): Promise<Recommendation[]> {
    const { data, error } = await this.supabase
      .from("recommendations")
      .select(recommendationSelect)
      .eq("status", "active")
      .order("value_score", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Não foi possível carregar recomendações.");
    }

    return data.map((row) => this.mapRecommendationRow(row as RecommendationRowWithRelations));
  }

  async findById(id: string): Promise<Recommendation | null> {
    const { data, error } = await this.supabase
      .from("recommendations")
      .select(recommendationSelect)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error("Não foi possível carregar a recomendação.");
    }

    return data ? this.mapRecommendationRow(data as RecommendationRowWithRelations) : null;
  }

  async create(input: CreateRecommendationInput, authorId: string): Promise<Recommendation> {
    await this.assertCurrentUser(authorId);

    const { data, error } = await this.supabase
      .from("recommendations")
      .insert({
        author_id: authorId,
        dish_name: input.dishName,
        place_name: input.placeName,
        category: input.category,
        city: input.city,
        neighborhood: input.neighborhood,
        address: input.address,
        location: `POINT(${input.longitude} ${input.latitude})`,
        price_paid: input.pricePaid,
        price_band: calculatePriceBand(input.pricePaid),
        value_score: input.valueScore as Recommendation["valueScore"],
        summary: input.summary,
        why_worth_it: input.whyWorthIt,
      })
      .select(recommendationSelect)
      .single();

    if (error) {
      throw new Error("Não foi possível publicar a recomendação.");
    }

    try {
      await this.persistTags(data.id, input.tags);

      if (input.photo) {
        await this.persistPhoto(data.id, authorId, input.photo.file, input.photo.altText);
      }
    } catch (error) {
      try {
        await this.supabase.from("recommendations").delete().eq("id", data.id);
      } catch {
        // Preserve the original creation failure for the caller.
      }
      throw error;
    }

    return (await this.findById(data.id)) ?? this.mapRecommendationRow(data as RecommendationRowWithRelations);
  }

  async report(id: string, reporterId: string | null, reason: string): Promise<Recommendation | null> {
    if (!reporterId) {
      throw new Error("Faça login para denunciar.");
    }

    const { error: reportError } = await this.supabase.from("reports").insert({
      recommendation_id: id,
      reporter_id: reporterId,
      reason,
    });

    if (reportError) {
      throw new Error("Não foi possível registrar a denúncia.");
    }

    return this.findById(id);
  }

  async update(id: string, input: UpdateRecommendationInput, authorId: string): Promise<Recommendation | null> {
    await this.assertCurrentUser(authorId);

    const { data, error } = await this.supabase
      .from("recommendations")
      .update({
        dish_name: input.dishName,
        place_name: input.placeName,
        category: input.category,
        city: input.city,
        neighborhood: input.neighborhood,
        address: input.address,
        location: `POINT(${input.longitude} ${input.latitude})`,
        price_paid: input.pricePaid,
        price_band: calculatePriceBand(input.pricePaid),
        value_score: input.valueScore as Recommendation["valueScore"],
        summary: input.summary,
        why_worth_it: input.whyWorthIt,
      })
      .eq("id", id)
      .eq("author_id", authorId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error("Não foi possível atualizar a recomendação.");
    }

    if (!data) {
      return null;
    }

    await this.replaceTags(id, input.tags);

    if (input.removePhoto || input.photo) {
      await this.replacePhoto(id, authorId, input.photo?.file, input.photo?.altText ?? `Foto de ${input.dishName}`);
    }

    return this.findById(id);
  }

  async delete(id: string, authorId: string): Promise<boolean> {
    await this.assertCurrentUser(authorId);

    const { data, error } = await this.supabase
      .from("recommendations")
      .delete()
      .eq("id", id)
      .eq("author_id", authorId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error("Não foi possível remover a recomendação.");
    }

    return Boolean(data);
  }

  async updateStatus(
    id: string,
    status: ModerationStatus,
    adminId: string | null,
  ): Promise<Recommendation | null> {
    if (!adminId) {
      throw new Error("Admin inválido para auditoria.");
    }

    const { error } = await this.supabase.from("recommendations").update({ status }).eq("id", id);

    if (error) {
      throw new Error("Não foi possível atualizar o status.");
    }

    await this.supabase.from("admin_audit_logs").insert({
      admin_id: adminId,
      recommendation_id: id,
      action: status,
    });

    return this.findById(id);
  }

  private async persistTags(recommendationId: string, tags: string[]): Promise<void> {
    const tagRecords = Array.from(
      new Map(
        tags
          .map(toTagRecord)
          .filter((tagRecord) => tagRecord.slug.length >= 2)
          .map((tagRecord) => [tagRecord.slug, tagRecord]),
      ).values(),
    );

    if (tagRecords.length === 0) {
      return;
    }

    const { data, error } = await this.supabase
      .from("tags")
      .upsert(tagRecords, { onConflict: "slug" })
      .select("id");

    if (error) {
      throw new Error("Não foi possível salvar as tags.");
    }

    const recommendationTags = data.map((tag) => ({
      recommendation_id: recommendationId,
      tag_id: tag.id,
    }));

    const { error: joinError } = await this.supabase
      .from("recommendation_tags")
      .upsert(recommendationTags, { onConflict: "recommendation_id,tag_id" });

    if (joinError) {
      throw new Error("Não foi possível vincular as tags.");
    }
  }

  private async replaceTags(recommendationId: string, tags: string[]): Promise<void> {
    const { error } = await this.supabase.from("recommendation_tags").delete().eq("recommendation_id", recommendationId);

    if (error) {
      throw new Error("Não foi possível atualizar as tags.");
    }

    await this.persistTags(recommendationId, tags);
  }

  private async persistPhoto(
    recommendationId: string,
    authorId: string,
    file: File,
    altText: string,
  ): Promise<void> {
    const validationError = await validateRecommendationPhoto(file);

    if (validationError) {
      throw new Error(validationError);
    }

    await this.assertCurrentUser(authorId);

    const storagePath = buildPhotoStoragePath(authorId, recommendationId, file);
    const { error: uploadError } = await this.supabase.storage
      .from(recommendationPhotosBucket)
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      throw new Error("Não foi possível enviar a foto.");
    }

    const { error: photoError } = await this.supabase.from("recommendation_photos").insert({
      recommendation_id: recommendationId,
      storage_path: storagePath,
      alt_text: altText,
      sort_order: 0,
    });

    if (photoError) {
      try {
        await this.supabase.storage.from(recommendationPhotosBucket).remove([storagePath]);
      } catch {
        // Preserve the original database failure for the caller.
      }
      throw new Error("Não foi possível salvar a foto.");
    }
  }

  private async replacePhoto(
    recommendationId: string,
    authorId: string,
    file: File | undefined,
    altText: string,
  ): Promise<void> {
    await this.assertCurrentUser(authorId);

    const existingPaths = await this.getPhotoStoragePaths(recommendationId);
    const { error } = await this.supabase
      .from("recommendation_photos")
      .delete()
      .eq("recommendation_id", recommendationId);

    if (error) {
      throw new Error("Não foi possível atualizar a foto.");
    }

    if (existingPaths.length > 0) {
      const { error: storageError } = await this.supabase.storage.from(recommendationPhotosBucket).remove(existingPaths);

      if (storageError) {
        throw new Error("Não foi possível limpar a foto anterior.");
      }
    }

    if (file) {
      await this.persistPhoto(recommendationId, authorId, file, altText);
    }
  }

  private async getPhotoStoragePaths(recommendationId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("recommendation_photos")
      .select("storage_path")
      .eq("recommendation_id", recommendationId);

    if (error) {
      throw new Error("Não foi possível carregar as fotos atuais.");
    }

    return data.map((photo) => photo.storage_path);
  }

  private async assertCurrentUser(authorId: string): Promise<void> {
    const { data, error } = await this.supabase.auth.getUser();

    if (error || data.user?.id !== authorId) {
      throw new Error("Sessão inválida para alterar esta recomendação.");
    }
  }

  private mapRecommendationRow(row: RecommendationRowWithRelations): Recommendation {
    const profile = row.profiles;
    const photo = row.recommendation_photos?.toSorted((first, second) => first.sort_order - second.sort_order)[0];
    const tags = row.recommendation_tags
      ?.map((recommendationTag) => recommendationTag.tags?.label)
      .filter((tag): tag is string => Boolean(tag)) ?? [];

    return {
      id: row.id,
      dishName: row.dish_name,
      placeName: row.place_name,
      category: row.category,
      city: row.city,
      neighborhood: row.neighborhood,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      pricePaid: Number(row.price_paid),
      priceBand: row.price_band,
      valueScore: row.value_score,
      tags,
      summary: row.summary,
      whyWorthIt: row.why_worth_it,
      imageUrl: photo
        ? this.getPhotoUrl(photo.storage_path)
        : "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
      imageAlt: photo?.alt_text ?? `Foto ilustrativa de ${row.dish_name}`,
      author: {
        id: profile?.id ?? row.author_id,
        name: profile?.name ?? "Usuário Vale Muito",
        handle: profile?.handle ?? "@valemuito",
        role: profile?.role ?? "member",
      },
      status: row.status,
      reportCount: row.report_count,
      createdAt: row.created_at,
    };
  }

  private getPhotoUrl(storagePath: string): string {
    return this.supabase.storage.from(recommendationPhotosBucket).getPublicUrl(storagePath).data.publicUrl;
  }
}

function toTagRecord(label: string) {
  return {
    slug: slugify(label),
    label,
  };
}

function slugify(value: string): string {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function buildPhotoStoragePath(authorId: string, recommendationId: string, file: File): string {
  const storagePath = `${authorId}/${recommendationId}/${crypto.randomUUID()}${getRecommendationPhotoExtension(file)}`;

  if (!recommendationPhotoStoragePathPattern.test(storagePath)) {
    throw new Error("Caminho de foto inválido.");
  }

  return storagePath;
}

