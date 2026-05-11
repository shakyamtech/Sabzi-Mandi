import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    // Try both standard and custom names for the service role key
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: cErr } = await userClient.auth.getUser();
    if (cErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Verify caller is admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || "list";

    if (action === "list") {
      const { data: usersData, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const ids = usersData.users.map((u) => u.id);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        admin.from("profiles").select("id, full_name, shop_name").in("id", ids),
        admin.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);
      const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const rMap = new Map<string, string[]>();
      (roles || []).forEach((r: any) => {
        const arr = rMap.get(r.user_id) || [];
        arr.push(r.role);
        rMap.set(r.user_id, arr);
      });
      const users = usersData.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        full_name: pMap.get(u.id)?.full_name || "",
        shop_name: pMap.get(u.id)?.shop_name || "",
        roles: rMap.get(u.id) || [],
      }));
      return json({ users });
    }

    if (action === "update_profile") {
      const { user_id, full_name, shop_name } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      const { error } = await admin
        .from("profiles")
        .update({ full_name, shop_name, updated_at: new Date().toISOString() })
        .eq("id", user_id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "set_admin") {
      const { user_id, make_admin } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      if (make_admin) {
        await admin.from("user_roles").insert({ user_id, role: "admin" }).select();
      } else {
        if (user_id === callerId) return json({ error: "Cannot remove your own admin role" }, 400);
        await admin.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
      }
      return json({ ok: true });
    }

    if (action === "delete_user") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      if (user_id === callerId) return json({ error: "Cannot delete yourself" }, 400);
      // Wipe app data (no FK cascade from auth.users)
      const tables = ["sale_items","sales","purchase_items","purchases","cash_transactions","ledger_entries","expenses","customers","suppliers","products","profiles"];
      for (const t of tables) {
        const col = t === "profiles" ? "id" : "user_id";
        await admin.from(t).delete().eq(col, user_id);
      }
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e.message || String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
