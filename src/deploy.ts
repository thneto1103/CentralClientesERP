import type { ClientRecord } from "./types";

export const BRIDGE = "http://127.0.0.1:8765";

export const KNOWN_SLUGS = new Set(["mix-parfum", "hara-perfumes", "tabacaju", "elo"]);

export const KNOWN_REFS = [
  "gqrfzsgcfwpadyvfnbes",
  "aepwxmawlifqkfczoicc",
  "ylcfqmnowjewynsvtxqc",
  "zxfvaawfbrfjuxsjbvif",
];

export function clientFolder(slug: string): string {
  return `C:\\Users\\Thnet\\Desktop\\SaaSProjects\\clientes\\${slug}`;
}

export function dbReady(client: ClientRecord): boolean {
  return [client.supabaseHost, client.dbUser, client.secrets.dbPassword, client.dbPort, client.dbName].every(
    (value) => (value ?? "").trim().length > 0,
  );
}

export function isKnownStore(client: ClientRecord): boolean {
  if (KNOWN_SLUGS.has(client.slug)) return true;
  const blob = `${client.dbUser} ${client.supabaseHost ?? ""}`.toLowerCase();
  return KNOWN_REFS.some((ref) => blob.includes(ref));
}

export function deployBody(client: ClientRecord) {
  return {
    slug: client.slug,
    tradeName: client.tradeName,
    dbUser: client.dbUser.trim(),
    dbHost: (client.supabaseHost ?? "").trim(),
    dbPassword: client.secrets.dbPassword,
    dbPort: client.dbPort.trim(),
    dbName: client.dbName.trim(),
    cnpj: (client.cnpj ?? "").replace(/\D/g, ""),
    focusHomolog: client.secrets.focusHomolog,
    focusProduction: client.secrets.focusProduction,
    focusToken: client.secrets.focusToken,
    smtpHost: client.smtpHost.trim(),
    smtpPort: client.smtpPort.trim(),
    smtpUser: client.smtpUser.trim(),
    smtpPassword: client.secrets.smtpPassword,
    smtpFrom: client.smtpFrom.trim(),
    smtpTls: client.smtpTls.trim(),
    smtpSsl: client.smtpSsl.trim(),
    printerName: client.printerName.trim(),
  };
}

export async function bridgePost(path: string, body: unknown): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch(`${BRIDGE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { ok?: boolean; message?: string };
    return {
      ok: Boolean(data.ok),
      message: data.message || (response.ok ? "Pronto." : "O gerador recusou o pedido."),
    };
  } catch {
    return {
      ok: false,
      message: "O gerador local não está rodando. No PowerShell, na pasta central-clientes: python scripts/bridge.py",
    };
  }
}

export async function bridgeStatus(slug: string): Promise<{ exeExists: boolean; zipExists: boolean; folderExists: boolean }> {
  try {
    const response = await fetch(`${BRIDGE}/status?slug=${encodeURIComponent(slug)}`);
    const data = (await response.json()) as { exeExists?: boolean; zipExists?: boolean; folderExists?: boolean };
    return {
      exeExists: Boolean(data.exeExists),
      zipExists: Boolean(data.zipExists),
      folderExists: Boolean(data.folderExists),
    };
  } catch {
    return { exeExists: false, zipExists: false, folderExists: false };
  }
}
