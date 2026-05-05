import { supabase } from "@/integrations/supabase/client";

let cached: string | null = null;

export const getShopName = async (): Promise<string> => {
  if (cached) return cached;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return "My Shop";
  const { data } = await supabase.from("profiles").select("shop_name").eq("id", u.user.id).maybeSingle();
  cached = data?.shop_name || "My Shop";
  return cached;
};
