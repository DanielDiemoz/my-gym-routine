import { supabase } from "@/integrations/supabase/client";

let cachedAdmin: boolean | null = null;

export async function isAdmin(): Promise<boolean> {
  if (cachedAdmin !== null) return cachedAdmin;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    cachedAdmin = false;
    return false;
  }

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  cachedAdmin = data?.role === "admin";
  return cachedAdmin;
}

export function resetAdminCache() {
  cachedAdmin = null;
}
