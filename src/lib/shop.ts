import { supabase } from "@/integrations/supabase/client";

export const getShopName = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "My Shop";
  
  const { data } = await supabase
    .from("profiles")
    .select("shop_name")
    .eq("id", user.id)
    .maybeSingle();
    
  return data?.shop_name || "My Shop";
};
