import type { ClientGrant, ClientRecord, Role } from "./types";

export function allowedClients(
  clients: ClientRecord[],
  access: { userId: string; role: Role | null; grants: ClientGrant[] } | null,
  remote: boolean,
): ClientRecord[] {
  if (!remote) return clients;
  if (!access?.role) return [];
  if (access.role === "socio") return clients;
  const mine = new Set(access.grants.filter((grant) => grant.userId === access.userId).map((grant) => grant.clientSlug));
  return clients.filter((client) => mine.has(client.slug));
}
