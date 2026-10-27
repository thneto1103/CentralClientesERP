import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const KINDS: Record<string, string> = {
  pagamento: "Pagamento",
  entrega: "Entrega",
  certificado: "Certificado",
};

function saoPauloDay(offset: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = parts.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return date.toISOString().slice(0, 10);
}

Deno.serve(async () => {
  const key = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("REMINDER_FROM") ?? "";
  if (!key || !from) {
    return new Response(JSON.stringify({ ok: true, message: "Aviso desligado. Faltam RESEND_API_KEY e REMINDER_FROM." }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const day = saoPauloDay(1);
  const dates = await admin.from("client_dates").select("id, client_slug, kind, day, note").eq("day", day).eq("done", false);
  if (dates.error) return new Response(dates.error.message, { status: 500 });
  const socios = await admin.from("profiles").select("email").eq("role", "socio");
  const socioEmails = (socios.data ?? []).map((row) => row.email).filter(Boolean);
  let sent = 0;
  for (const date of dates.data ?? []) {
    if (!KINDS[date.kind]) continue;
    const already = await admin.from("date_reminders").select("date_id").eq("date_id", date.id).eq("sent_on", day).maybeSingle();
    if (already.data) continue;
    const grants = await admin.from("client_grants").select("user_id").eq("client_slug", date.client_slug);
    const ids = (grants.data ?? []).map((row) => row.user_id);
    const sellers = ids.length
      ? await admin.from("profiles").select("email").in("user_id", ids)
      : { data: [] as { email: string }[] };
    const to = [...new Set([...socioEmails, ...(sellers.data ?? []).map((row) => row.email)])];
    if (to.length === 0) continue;
    const client = await admin.from("clients").select("trade_name").eq("slug", date.client_slug).maybeSingle();
    const label = KINDS[date.kind];
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: `${label} amanhã — ${client.data?.trade_name ?? date.client_slug}`,
        text: `${label} de ${client.data?.trade_name ?? date.client_slug} é amanhã (${date.day}). ${date.note ?? ""}`.trim(),
      }),
    });
    if (!response.ok) continue;
    await admin.from("date_reminders").insert({ date_id: date.id, sent_on: day });
    sent += 1;
  }
  return new Response(JSON.stringify({ ok: true, message: `Avisos enviados: ${sent}.` }), {
    headers: { "Content-Type": "application/json" },
  });
});
