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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Não autorizado");

    const isMaster = caller.email === "nailton.alsampaio@gmail.com";
    if (!isMaster) {
      const { data: roles } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .eq("role", "admin");
      if (!roles || roles.length === 0) {
        throw new Error("Apenas administradores podem redefinir senhas");
      }
    }

    const { user_id, new_password } = await req.json();
    if (!user_id || !new_password || String(new_password).length < 6) {
      throw new Error("user_id e new_password (mín. 6 caracteres) são obrigatórios");
    }

    const { error: updErr } = await adminClient.auth.admin.updateUserById(user_id, {
      password: new_password,
    });
    if (updErr) throw updErr;

    // Clear PIN so user is forced to create a new one on next access
    const { error: pinErr } = await adminClient
      .from("profiles")
      .update({ pin: null })
      .eq("id", user_id);
    if (pinErr) throw pinErr;

    await adminClient.from("log_sistema").insert({
      tipo: "sucesso",
      categoria: "autenticacao",
      descricao: `Senha redefinida pelo admin ${caller.email} para user ${user_id}`,
      user_id: caller.id,
      user_email: caller.email,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
