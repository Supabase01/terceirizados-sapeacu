import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MASTER_EMAIL = "nailton.alsampaio@gmail.com";

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

    if (caller.email !== MASTER_EMAIL) {
      throw new Error("Apenas o usuário Master pode excluir usuários");
    }

    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id é obrigatório");

    if (user_id === caller.id) {
      throw new Error("Você não pode excluir a si mesmo");
    }

    // Avoid deleting the master account
    const { data: target } = await adminClient.auth.admin.getUserById(user_id);
    if (target?.user?.email === MASTER_EMAIL) {
      throw new Error("Não é permitido excluir a conta Master");
    }

    // Clean related rows first
    await adminClient.from("usuario_permissoes").delete().eq("user_id", user_id);
    await adminClient.from("usuario_funcoes_sistema").delete().eq("user_id", user_id);
    await adminClient.from("usuario_unidades").delete().eq("user_id", user_id);
    await adminClient.from("user_roles").delete().eq("user_id", user_id);
    await adminClient.from("profiles").delete().eq("id", user_id);

    const { error } = await adminClient.auth.admin.deleteUser(user_id);
    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
