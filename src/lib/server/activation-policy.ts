import type { SupabaseClient } from "@supabase/supabase-js";

export async function activationFeeEnabled(db: SupabaseClient): Promise<boolean> {
  const { data, error } = await db
    .from("gochati_activation_settings")
    .select("enabled")
    .eq("id", true)
    .maybeSingle();
  // Before the migration, preserve the existing paid-activation requirement.
  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) return true;
    throw error;
  }
  return data?.enabled !== false;
}
