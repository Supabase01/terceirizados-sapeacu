import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const { email, password, nome, role, action } = body;

    // Check if any profiles exist (bootstrap mode)
    const { count } = await adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const isBootstrap = (count === null || count === 0);

    if (!isBootstrap && action !== "bootstrap") {
      // Verify caller is admin
      if (!authHeader) throw new Error("Não autorizado");
      
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: caller } } = await callerClient.auth.getUser();
      if (!caller) throw new Error("Não autorizado");

      const { data: roles } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "admin");

      if (!roles || roles.length === 0) {
        throw new Error("Apenas administradores podem criar usuários");
      }
    }

    if (!email || !password) {
      throw new Error("E-mail e senha são obrigatórios");
    }

    // Check if user already exists and delete if bootstrap
    if (isBootstrap || action === "bootstrap") {
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const existing = users?.find(u => u.email === email);
      if (existing) {
        await adminClient.auth.admin.deleteUser(existing.id);
      }
    }

    // Create user with admin API (auto-confirms)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome: nome || email },
    });

    if (createError) throw createError;

    // Update role if specified and not default
    if (role && role !== "usuario" && newUser.user) {
      await new Promise(resolve => setTimeout(resolve, 500));
      await adminClient
        .from("user_roles")
        .update({ role })
        .eq("user_id", newUser.user.id);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
