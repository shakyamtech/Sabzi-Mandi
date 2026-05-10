import { supabase } from "@/integrations/supabase/client";

export const getShopInfo = async (): Promise<{ name: string; pan: string }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { name: "My Shop", pan: "" };
  
  const { data } = await supabase
    .from("profiles")
    .select("shop_name, pan_no")
    .eq("id", user.id)
    .maybeSingle();
    
  return { 
    name: data?.shop_name || "My Shop", 
    pan: data?.pan_no || "" 
  };
};
