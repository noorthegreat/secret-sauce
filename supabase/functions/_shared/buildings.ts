import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type BuildingLookup = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  invite_code: string | null;
};

export async function resolveBuildingByRef(
  supabase: SupabaseClient,
  ref: { buildingId?: string; buildingSlug?: string },
): Promise<BuildingLookup | null> {
  const buildingId = typeof ref.buildingId === "string" ? ref.buildingId.trim() : "";
  const buildingSlug = typeof ref.buildingSlug === "string" ? ref.buildingSlug.trim() : "";

  if (buildingId) {
    if (!UUID_PATTERN.test(buildingId)) {
      throw new Error("Invalid buildingId");
    }

    const { data, error } = await supabase
      .from("buildings")
      .select("id, name, slug, is_active, invite_code")
      .eq("id", buildingId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ?? null;
  }

  if (buildingSlug) {
    const normalizedSlug = buildingSlug.toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      throw new Error("Invalid buildingSlug");
    }

    const { data, error } = await supabase
      .from("buildings")
      .select("id, name, slug, is_active, invite_code")
      .eq("slug", normalizedSlug)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ?? null;
  }

  throw new Error("buildingId or buildingSlug is required");
}
