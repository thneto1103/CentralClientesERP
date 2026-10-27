import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type Body = {
  action?: "create" | "role" | "delete";
  email?: string;
  password?: string;
  role?: "socio" | "vendedor";
  userId?: string;
};

function json(status: number, payload: { ok: boolean; message: string }) {
  return new Response(JSON.stringify(payload), { status, headers: cors });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const header = request.headers.get("Authorization") ?? "";
  const userClient = createClient(url, anon, { global: { headers: { Authorization: header } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json(401, { ok: false, message: "Entre de novo." });
  const admin = createClient(url, service);
  const actor = await admin.from("profiles").select("role").eq("user_id", userData.user.id).maybeSingle();
  if (actor.data?.role !== "socio") return json(403, { ok: false, message: "Só um sócio pode fazer isso." });

  const body = (await request.json()) as Body;
  const socios = await admin.from("profiles").select("user_id", { count: "exact", head: true }).eq("role", "socio");
  const socioCount = socios.count ?? 0;

  if (body.action === "create") {
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const role = body.role === "socio" ? "socio" : body.role === "vendedor" ? "vendedor" : "";
    if (!email || !email.includes("@") || password.length < 6 || !role) {
      return json(400, { ok: false, message: "Informe e-mail, senha de 6 caracteres e o nível." });
    }
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) return json(400, { ok: false, message: created.error?.message ?? "Não criei o usuário." });
    const inserted = await admin.from("profiles").insert({ user_id: created.data.user.id, email, role });
    if (inserted.error) return json(400, { ok: false, message: inserted.error.message });
    return json(200, { ok: true, message: "Usuário criado." });
  }

  if (!body.userId) return json(400, { ok: false, message: "Falta o usuário." });
  if (body.userId === userData.user.id) return json(400, { ok: false, message: "Você não pode alterar a si mesmo." });
  const target = await admin.from("profiles").select("role, email").eq("user_id", body.userId).maybeSingle();
  if (!target.data) return json(404, { ok: false, message: "Usuário não encontrado." });

  if (body.action === "delete") {
    if (target.data.role === "socio" && socioCount <= 1) return json(400, { ok: false, message: "Precisa restar um sócio." });
    const removed = await admin.auth.admin.deleteUser(body.userId);
    if (removed.error) return json(400, { ok: false, message: removed.error.message });
    return json(200, { ok: true, message: "Usuário removido." });
  }

  if (body.action === "role") {
    const role = body.role === "socio" ? "socio" : body.role === "vendedor" ? "vendedor" : "";
    if (!role) return json(400, { ok: false, message: "Nível inválido." });
    if (target.data.role === "socio" && role === "vendedor" && socioCount <= 1) {
      return json(400, { ok: false, message: "Precisa restar um sócio." });
    }
    const updated = await admin.from("profiles").update({ role }).eq("user_id", body.userId);
    if (updated.error) return json(400, { ok: false, message: updated.error.message });
    return json(200, { ok: true, message: "Nível atualizado." });
  }

  return json(400, { ok: false, message: "Ação desconhecida." });
});
