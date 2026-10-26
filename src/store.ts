import { PRIVATE_ENV } from "./private-env";
import { SEED } from "./seed";
import { EMPTY_SECRETS, type BoardState, type CalendarDate, type ClientRecord, type ClientSecrets, type HistoryEvent } from "./types";

const KEY = "central-clientes.v1";

function cloneSeed(): ClientRecord[] {
  return structuredClone(SEED);
}

function complete(raw: ClientRecord): ClientRecord {
  const client = raw as Partial<ClientRecord>;
  return {
    slug: client.slug ?? "",
    tradeName: client.tradeName ?? "",
    repoName: client.repoName ?? "",
    repoPath: client.repoPath ?? "",
    status: client.status ?? "nao_iniciado",
    summary: client.summary ?? "",
    cnpj: client.cnpj ?? null,
    supabaseRef: client.supabaseRef ?? null,
    supabaseHost: client.supabaseHost ?? null,
    focusHomolog: client.focusHomolog ?? false,
    focusProduction: client.focusProduction ?? false,
    focusEmail: client.focusEmail ?? "",
    focusPanelUrl: client.focusPanelUrl ?? "",
    focusAmbiente: client.focusAmbiente ?? "",
    dbUser: client.dbUser ?? "",
    dbPort: client.dbPort ?? "",
    dbName: client.dbName ?? "",
    smtpHost: client.smtpHost ?? "",
    smtpPort: client.smtpPort ?? "",
    smtpUser: client.smtpUser ?? "",
    smtpFrom: client.smtpFrom ?? "",
    smtpTls: client.smtpTls ?? "",
    smtpSsl: client.smtpSsl ?? "",
    printerName: client.printerName ?? "",
    secrets: { ...EMPTY_SECRETS, ...(client.secrets ?? {}) },
    checklist: client.checklist ?? [],
  };
}

function prefer(current: string | null | undefined, incoming: string): string {
  const value = (current ?? "").trim();
  return value || incoming;
}

function applyEnv(client: ClientRecord): ClientRecord {
  const env = PRIVATE_ENV[client.slug];
  if (!env) return client;
  const cnpjDigits = env.focusCnpj.replace(/\D/g, "");
  const importedCnpj = cnpjDigits.length === 14 && cnpjDigits !== "00000000000000" ? cnpjDigits : "";
  const secrets: ClientSecrets = {
    dbPassword: prefer(client.secrets.dbPassword, env.dbPassword),
    databaseUrl: prefer(client.secrets.databaseUrl, env.databaseUrl),
    focusToken: prefer(client.secrets.focusToken, env.focusToken),
    focusHomolog: prefer(client.secrets.focusHomolog, env.focusHomolog),
    focusProduction: prefer(client.secrets.focusProduction, env.focusProduction),
    smtpPassword: prefer(client.secrets.smtpPassword, env.smtpPassword),
  };
  return {
    ...client,
    cnpj: prefer(client.cnpj, importedCnpj) || null,
    supabaseHost: prefer(client.supabaseHost, env.dbHost) || null,
    dbUser: prefer(client.dbUser, env.dbUser),
    dbPort: prefer(client.dbPort, env.dbPort),
    dbName: prefer(client.dbName, env.dbName),
    smtpHost: prefer(client.smtpHost, env.smtpHost),
    smtpPort: prefer(client.smtpPort, env.smtpPort),
    smtpUser: prefer(client.smtpUser, env.smtpUser),
    smtpFrom: prefer(client.smtpFrom, env.smtpFrom),
    smtpTls: prefer(client.smtpTls, env.smtpTls),
    smtpSsl: prefer(client.smtpSsl, env.smtpSsl),
    printerName: prefer(client.printerName, env.printerName),
    focusHomolog: client.focusHomolog || Boolean(env.focusHomolog),
    focusProduction: client.focusProduction || Boolean(env.focusProduction),
    secrets,
  };
}

function merge(saved: BoardState): BoardState {
  const bySlug = new Map(saved.clients.map((client) => [client.slug, client]));
  const clients = cloneSeed().map((seed) => applyEnv(complete(bySlug.get(seed.slug) ?? seed)));
  for (const extra of saved.clients) {
    if (!clients.some((client) => client.slug === extra.slug)) clients.push(applyEnv(complete(extra)));
  }
  return {
    clients,
    events: saved.events ?? [],
    dates: (saved.dates ?? []).filter((date) => date.day && date.clientSlug),
  };
}

export function loadBoard(): BoardState {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { clients: cloneSeed().map(applyEnv), events: [], dates: [] };
  try {
    return merge(JSON.parse(raw) as BoardState);
  } catch {
    return { clients: cloneSeed().map(applyEnv), events: [], dates: [] };
  }
}

export function saveBoard(state: BoardState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function newDate(input: Omit<CalendarDate, "id">): CalendarDate {
  return { ...input, id: crypto.randomUUID() };
}

export function newEvent(slug: string, text: string): HistoryEvent {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    slug,
    text,
  };
}
