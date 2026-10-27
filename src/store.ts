import { SEED } from "./seed";
import { EMPTY_SECRETS, type BoardState, type CalendarDate, type ClientContact, type ClientRecord, type ClientSecrets, type EnvSnapshot, type HistoryEvent } from "./types";

const loadedEnv = import.meta.glob("./private-env.ts", {
  eager: true,
  import: "PRIVATE_ENV",
}) as Record<string, Record<string, EnvSnapshot>>;

const PRIVATE_ENV: Record<string, EnvSnapshot> = Object.values(loadedEnv)[0] ?? {};

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

function completeEvent(event: HistoryEvent): HistoryEvent {
  return { ...event, actorEmail: event.actorEmail ?? "" };
}

function boardFrom(clients: ClientRecord[], saved: Partial<BoardState>): BoardState {
  return {
    clients,
    events: (saved.events ?? []).map(completeEvent),
    dates: (saved.dates ?? []).filter((date) => date.day && date.clientSlug),
    contacts: (saved.contacts ?? []).filter((contact) => contact.clientSlug && contact.name),
    files: (saved.files ?? []).filter((file) => file.clientSlug && file.storagePath),
  };
}

export function withSeed(saved: BoardState): BoardState {
  const bySlug = new Map(saved.clients.map((client) => [client.slug, client]));
  const clients = cloneSeed().map((seed) => {
    const remote = bySlug.get(seed.slug);
    const base = remote
      ? { ...seed, ...remote, checklist: remote.checklist.length ? remote.checklist : seed.checklist }
      : seed;
    return applyEnv(complete(base));
  });
  for (const extra of saved.clients) {
    if (!clients.some((client) => client.slug === extra.slug)) clients.push(applyEnv(complete(extra)));
  }
  return boardFrom(clients, saved);
}

export function hydrateRemote(saved: BoardState): BoardState {
  return boardFrom(saved.clients.map((client) => applyEnv(complete(client))), saved);
}

export function loadBoard(): BoardState {
  const empty = boardFrom(cloneSeed().map(applyEnv), {});
  const raw = localStorage.getItem(KEY);
  if (!raw) return empty;
  try {
    return withSeed(JSON.parse(raw) as BoardState);
  } catch {
    return empty;
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
    actorEmail: "",
  };
}

export function newContact(input: Omit<ClientContact, "id">): ClientContact {
  return { ...input, id: crypto.randomUUID() };
}
