import type { ClientGrant, ClientRecord, Profile } from "./types";

export function Permissions({
  sellers,
  clients,
  grants,
  onToggle,
}: {
  sellers: Profile[];
  clients: ClientRecord[];
  grants: ClientGrant[];
  onToggle: (userId: string, clientSlug: string, granted: boolean) => void;
}) {
  return (
    <section className="dossier" aria-label="Permissões">
      <h2>Permissões</h2>
      {sellers.length === 0 ? <p className="empty">Nenhum vendedor ainda.</p> : null}
      {sellers.map((seller) => (
        <div key={seller.userId}>
          <h3>{seller.email}</h3>
          <ul className="checks">
            {clients.map((client) => {
              const granted = grants.some((grant) => grant.userId === seller.userId && grant.clientSlug === client.slug);
              return (
                <li key={client.slug}>
                  <button
                    type="button"
                    className={granted ? "check done" : "check"}
                    aria-pressed={granted}
                    onClick={() => onToggle(seller.userId, client.slug, !granted)}
                  >
                    <span className="box" aria-hidden="true" />
                    {client.tradeName}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
