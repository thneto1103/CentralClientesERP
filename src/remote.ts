import { supabase } from "./supabaseClient";
import { withSeed } from "./store";
import type { BoardState, CalendarDate, CheckItem, ClientRecord, DateKind, HistoryEvent, ProjectStatus } from "./types";

type ClientRow = {
  slug: string;
  trade_name: string;
  repo_name: string;
  repo_path: string;
  status: ProjectStatus;
  summary: string;
  cnpj: string | null;
  supabase_ref: string | null;
  supabase_host: string | null;
  focus_homolog: boolean;
  focus_production: boolean;
  focus_email: string;
  focus_panel_url: string;
  focus_ambiente: string;
  db_user: string;
  db_port: string;
  db_name: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_from: string;
  smtp_tls: string;
  smtp_ssl: string;
  printer_name: string;
  db_password: string;
  database_url: string;
  focus_token: string;
  focus_homolog_token: string;
  focus_production_token: string;
  smtp_password: string;
  checklist: CheckItem[] | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function fromClient(row: ClientRow): ClientRecord {
  const ambiente = row.focus_ambiente === "homologacao" || row.focus_ambiente === "producao" ? row.focus_ambiente : "";
  return {
    slug: row.slug,
    tradeName: row.trade_name,
    repoName: row.repo_name,
    repoPath: row.repo_path,
    status: row.status,
    summary: row.summary,
    cnpj: row.cnpj?.trim() || null,
    supabaseRef: row.supabase_ref,
    supabaseHost: row.supabase_host,
    focusHomolog: row.focus_homolog,
    focusProduction: row.focus_production,
    focusEmail: text(row.focus_email),
    focusPanelUrl: text(row.focus_panel_url),
    focusAmbiente: ambiente,
    dbUser: text(row.db_user),
    dbPort: text(row.db_port),
    dbName: text(row.db_name),
    smtpHost: text(row.smtp_host),
    smtpPort: text(row.smtp_port),
    smtpUser: text(row.smtp_user),
    smtpFrom: text(row.smtp_from),
    smtpTls: text(row.smtp_tls),
    smtpSsl: text(row.smtp_ssl),
    printerName: text(row.printer_name),
    secrets: {
      dbPassword: text(row.db_password),
      databaseUrl: text(row.database_url),
      focusToken: text(row.focus_token),
      focusHomolog: text(row.focus_homolog_token),
      focusProduction: text(row.focus_production_token),
      smtpPassword: text(row.smtp_password),
    },
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
  };
}

function toClient(client: ClientRecord): ClientRow {
  const cnpj = (client.cnpj ?? "").replace(/\D/g, "");
  return {
    slug: client.slug,
    trade_name: client.tradeName,
    repo_name: client.repoName,
    repo_path: client.repoPath,
    status: client.status,
    summary: client.summary,
    cnpj: cnpj.length === 14 ? cnpj : null,
    supabase_ref: client.supabaseRef,
    supabase_host: client.supabaseHost,
    focus_homolog: client.focusHomolog,
    focus_production: client.focusProduction,
    focus_email: client.focusEmail,
    focus_panel_url: client.focusPanelUrl,
    focus_ambiente: client.focusAmbiente,
    db_user: client.dbUser,
    db_port: client.dbPort,
    db_name: client.dbName,
    smtp_host: client.smtpHost,
    smtp_port: client.smtpPort,
    smtp_user: client.smtpUser,
    smtp_from: client.smtpFrom,
    smtp_tls: client.smtpTls,
    smtp_ssl: client.smtpSsl,
    printer_name: client.printerName,
    db_password: client.secrets.dbPassword,
    database_url: client.secrets.databaseUrl,
    focus_token: client.secrets.focusToken,
    focus_homolog_token: client.secrets.focusHomolog,
    focus_production_token: client.secrets.focusProduction,
    smtp_password: client.secrets.smtpPassword,
    checklist: client.checklist,
  };
}

function fromDate(row: { id: string; client_slug: string; kind: string; day: string; amount_cents: number | null; note: string; done: boolean }): CalendarDate {
  return {
    id: row.id,
    clientSlug: row.client_slug,
    kind: row.kind as DateKind,
    day: String(row.day).slice(0, 10),
    amountCents: row.amount_cents,
    note: row.note ?? "",
    done: row.done,
  };
}

function fromEvent(row: { id: string; at: string; slug: string; text: string }): HistoryEvent {
  return { id: row.id, at: row.at, slug: row.slug, text: row.text };
}

export async function loadRemote(): Promise<{ board: BoardState | null; error: string }> {
  if (!supabase) return { board: null, error: "Supabase não configurado." };
  const [clients, dates, events] = await Promise.all([
    supabase.from("clients").select("*"),
    supabase.from("client_dates").select("*"),
    supabase.from("client_events").select("*").order("at", { ascending: false }),
  ]);
  const error = clients.error ?? dates.error ?? events.error;
  if (error) return { board: null, error: error.message };
  return {
    board: withSeed({
      clients: ((clients.data ?? []) as ClientRow[]).map(fromClient),
      dates: ((dates.data ?? []) as Parameters<typeof fromDate>[0][]).map(fromDate),
      events: ((events.data ?? []) as Parameters<typeof fromEvent>[0][]).map(fromEvent),
    }),
    error: "",
  };
}

async function deleteMissingDates(ids: string[]): Promise<string> {
  if (!supabase) return "";
  const existing = await supabase.from("client_dates").select("id");
  if (existing.error) return existing.error.message;
  const keep = new Set(ids);
  const remove = (existing.data ?? []).map((row) => String(row.id)).filter((id) => !keep.has(id));
  if (remove.length === 0) return "";
  const deleted = await supabase.from("client_dates").delete().in("id", remove);
  return deleted.error?.message ?? "";
}

export async function pushBoard(board: BoardState): Promise<string> {
  if (!supabase) return "";
  const savedClients = await supabase.from("clients").upsert(board.clients.map(toClient));
  if (savedClients.error) return savedClients.error.message;
  if (board.dates.length > 0) {
  const savedDates = await supabase.from("client_dates").upsert(
    board.dates.map((date) => ({
      id: date.id,
      client_slug: date.clientSlug,
      kind: date.kind,
      day: date.day,
      amount_cents: date.amountCents,
      note: date.note,
      done: date.done,
    })),
  );
  if (savedDates.error) return savedDates.error.message;
  }
  const removed = await deleteMissingDates(board.dates.map((date) => date.id));
  if (removed) return removed;
  if (board.events.length === 0) return "";
  const savedEvents = await supabase.from("client_events").upsert(
    board.events.map((event) => ({
      id: event.id,
      at: event.at,
      slug: event.slug,
      text: event.text,
    })),
  );
  return savedEvents.error?.message ?? "";
}
