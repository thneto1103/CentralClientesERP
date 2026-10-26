import { useEffect, useMemo, useState } from "react";
import { Agenda } from "./Agenda";
import { bridgePost, bridgeStatus, deployBody, isKnownStore } from "./deploy";
import { Dossier } from "./Dossier";
import { slugify } from "./month";
import { blankChecklist } from "./seed";
import { loadBoard, newDate, newEvent, saveBoard } from "./store";
import {
  STATUSES,
  STATUS_LABEL,
  type BoardState,
  type CalendarDate,
  type CheckKey,
  type ClientRecord,
  type ProjectStatus,
} from "./types";

export function App() {
  const [board, setBoard] = useState<BoardState>(() => loadBoard());
  const [view, setView] = useState<"clientes" | "agenda">("clientes");
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProjectStatus | "todos">("todos");
  const [creating, setCreating] = useState(false);
  const [deployMessage, setDeployMessage] = useState("");
  const [packageState, setPackageState] = useState({ zipExists: false, exeExists: false, folderExists: false });

  useEffect(() => {
    saveBoard(board);
  }, [board]);

  useEffect(() => {
    if (!selected) return;
    let cancel = false;
    void bridgeStatus(selected).then((state) => {
      if (!cancel) setPackageState(state);
    });
    return () => {
      cancel = true;
    };
  }, [selected, deployMessage]);

  const visible = useMemo(
    () => board.clients.filter((client) => filter === "todos" || client.status === filter),
    [board.clients, filter],
  );
  const current = board.clients.find((client) => client.slug === selected) ?? null;
  const history = board.events.filter((event) => event.slug === current?.slug);

  function patchClient(slug: string, patch: Partial<ClientRecord>, label: string) {
    setBoard((prev) => ({
      ...prev,
      clients: prev.clients.map((client) => (client.slug === slug ? { ...client, ...patch } : client)),
      events: [newEvent(slug, label), ...prev.events],
    }));
  }

  function setStatus(slug: string, status: ProjectStatus) {
    const client = board.clients.find((item) => item.slug === slug);
    if (!client || client.status === status) return;
    patchClient(slug, { status }, `Status: ${STATUS_LABEL[client.status]} → ${STATUS_LABEL[status]}`);
  }

  function toggleCheck(slug: string, key: CheckKey) {
    const client = board.clients.find((item) => item.slug === slug);
    const item = client?.checklist.find((check) => check.key === key);
    if (!item) return;
    const done = !item.done;
    setBoard((prev) => ({
      ...prev,
      clients: prev.clients.map((row) =>
        row.slug === slug
          ? {
              ...row,
              checklist: row.checklist.map((check) => (check.key === key ? { ...check, done } : check)),
            }
          : row,
      ),
      events: [newEvent(slug, `${item.label}: ${done ? "feito" : "desmarcado"}`), ...prev.events],
    }));
  }

  function createClient(input: { tradeName: string; repoName: string; cnpj: string }) {
    const base = slugify(input.tradeName) || "loja";
    let slug = base;
    let n = 2;
    while (board.clients.some((client) => client.slug === slug)) {
      slug = `${base}-${n}`;
      n += 1;
    }
    const digits = input.cnpj.replace(/\D/g, "").slice(0, 14);
    const client: ClientRecord = {
      slug,
      tradeName: input.tradeName.trim(),
      repoName: input.repoName.trim(),
      repoPath: "",
      status: "nao_iniciado",
      summary: "",
      cnpj: digits || null,
      supabaseRef: null,
      supabaseHost: null,
      focusHomolog: false,
      focusProduction: false,
      focusEmail: "",
      focusPanelUrl: "",
      focusAmbiente: "",
      dbUser: "",
      dbPort: "",
      dbName: "",
      smtpHost: "",
      smtpPort: "",
      smtpUser: "",
      smtpFrom: "",
      smtpTls: "",
      smtpSsl: "",
      printerName: "",
      secrets: {
        dbPassword: "",
        databaseUrl: "",
        focusToken: "",
        focusHomolog: "",
        focusProduction: "",
        smtpPassword: "",
      },
      checklist: blankChecklist(),
    };
    setBoard((prev) => ({
      ...prev,
      clients: [...prev.clients, client],
      events: [newEvent(slug, "Cliente criado"), ...prev.events],
    }));
    setCreating(false);
    setSelected(slug);
    setView("clientes");
    void bridgePost("/pasta", { slug, tradeName: client.tradeName }).then((result) => setDeployMessage(result.message));
  }

  async function packageClient(client: ClientRecord) {
    setDeployMessage(isKnownStore(client) ? "Empacotando…" : "Gerando instalador…");
    const result = await bridgePost(isKnownStore(client) ? "/empacotar" : "/gerar", deployBody(client));
    setDeployMessage(result.message);
    if (result.ok) {
      setBoard((prev) => ({
        ...prev,
        events: [newEvent(client.slug, "Instalador gerado na pasta do cliente"), ...prev.events],
      }));
    }
  }

  async function openClient(client: ClientRecord) {
    const result = await bridgePost("/abrir", { slug: client.slug });
    setDeployMessage(result.message);
  }

  async function recompile() {
    setDeployMessage("Recompilando o executável. Isso leva alguns minutos.");
    const result = await bridgePost("/recompilar", {});
    setDeployMessage(result.message);
  }

  function saveDate(input: Omit<CalendarDate, "id" | "done"> & { id?: string }) {
    setBoard((prev) => {
      if (input.id) {
        return {
          ...prev,
          dates: prev.dates.map((date) =>
            date.id === input.id
              ? { ...date, clientSlug: input.clientSlug, kind: input.kind, day: input.day, amountCents: input.amountCents, note: input.note }
              : date,
          ),
          events: [newEvent(input.clientSlug, `Data atualizada (${input.day})`), ...prev.events],
        };
      }
      const date = newDate({ ...input, done: false });
      return {
        ...prev,
        dates: [...prev.dates, date],
        events: [newEvent(input.clientSlug, `Data marcada (${input.day})`), ...prev.events],
      };
    });
  }

  function toggleDate(id: string) {
    const date = board.dates.find((item) => item.id === id);
    if (!date) return;
    setBoard((prev) => ({
      ...prev,
      dates: prev.dates.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
      events: [newEvent(date.clientSlug, date.done ? "Data reaberta" : "Data marcada como feita"), ...prev.events],
    }));
  }

  function removeDate(id: string) {
    const date = board.dates.find((item) => item.id === id);
    if (!date) return;
    setBoard((prev) => ({
      ...prev,
      dates: prev.dates.filter((item) => item.id !== id),
      events: [newEvent(date.clientSlug, `Data removida (${date.day})`), ...prev.events],
    }));
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">Sócios</p>
          <h1>Central de clientes</h1>
        </div>
        <nav className="nav" aria-label="Seções">
          <button type="button" className={view === "clientes" ? "choice on" : "choice"} data-testid="nav-clientes" onClick={() => setView("clientes")}>
            Clientes
          </button>
          <button type="button" className={view === "agenda" ? "choice on" : "choice"} data-testid="nav-agenda" onClick={() => setView("agenda")}>
            Agenda
          </button>
        </nav>
        <p className="banner">
          Banco, SMTP e tokens Focus que já estavam no .env de cada loja aparecem na ficha. Senha da conta Focus, certificado e acesso remoto não estão nesses arquivos.
        </p>
      </header>

      {view === "agenda" ? (
        <Agenda clients={board.clients} dates={board.dates} onSave={saveDate} onToggle={toggleDate} onRemove={removeDate} />
      ) : (
        <>
          <div className="filters" role="toolbar" aria-label="Filtrar por status">
            <FilterChip active={filter === "todos"} label={`Todos ${board.clients.length}`} onClick={() => setFilter("todos")} />
            {STATUSES.map((status) => (
              <FilterChip
                key={status}
                active={filter === status}
                label={`${STATUS_LABEL[status]} ${board.clients.filter((client) => client.status === status).length}`}
                onClick={() => setFilter(status)}
              />
            ))}
            <button type="button" className="choice on" data-testid="new-client" onClick={() => { setCreating(true); setSelected(null); }}>
              Novo cliente
            </button>
          </div>
          <main className={current || creating ? "desk has-detail" : "desk"}>
            <section className="list" aria-label="Clientes">
              {visible.length === 0 ? (
                <p className="empty">Nenhum cliente neste status.</p>
              ) : (
                visible.map((client) => (
                  <button
                    key={client.slug}
                    type="button"
                    className={client.slug === selected ? "card selected" : "card"}
                    data-testid="client-card"
                    data-slug={client.slug}
                    onClick={() => { setSelected(client.slug); setCreating(false); }}
                  >
                    <span className="card-title">{client.tradeName}</span>
                    <span className={`badge status-${client.status}`}>{STATUS_LABEL[client.status]}</span>
                    <span className="meta">{client.repoName || "Sem repositório"}</span>
                  </button>
                ))
              )}
            </section>
            <section className="dossier" aria-live="polite">
              {creating ? (
                <NewClientForm onCreate={createClient} onCancel={() => setCreating(false)} />
              ) : current ? (
                <>
                  <button type="button" className="back" onClick={() => setSelected(null)}>
                    Voltar à lista
                  </button>
                  <Dossier
                    client={current}
                    history={history}
                    onPatch={patchClient}
                    onStatus={setStatus}
                    onCheck={toggleCheck}
                    deployMessage={deployMessage}
                    packageState={packageState}
                    onPackage={(client) => void packageClient(client)}
                    onOpen={(client) => void openClient(client)}
                    onRecompile={() => void recompile()}
                  />
                </>
              ) : (
                <p className="empty">Escolha um cliente para editar, ou crie um novo.</p>
              )}
            </section>
          </main>
        </>
      )}
    </div>
  );
}

function NewClientForm({
  onCreate,
  onCancel,
}: {
  onCreate: (input: { tradeName: string; repoName: string; cnpj: string }) => void;
  onCancel: () => void;
}) {
  const [tradeName, setTradeName] = useState("");
  const [repoName, setRepoName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="date-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!tradeName.trim()) {
          setError("Informe o nome da loja.");
          return;
        }
        onCreate({ tradeName, repoName, cnpj });
      }}
    >
      <h2>Novo cliente</h2>
      <label className="field">
        Nome
        <input data-testid="new-name" value={tradeName} onChange={(event) => setTradeName(event.target.value)} />
      </label>
      <label className="field">
        Repositório
        <input data-testid="new-repo" value={repoName} onChange={(event) => setRepoName(event.target.value)} />
      </label>
      <label className="field">
        CNPJ
        <input data-testid="new-cnpj" value={cnpj} onChange={(event) => setCnpj(event.target.value)} />
      </label>
      {error ? <p className="warn">{error}</p> : null}
      <div className="row-actions">
        <button type="submit" className="choice on" data-testid="create-client">
          Criar cliente
        </button>
        <button type="button" className="choice" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={active ? "chip on" : "chip"} aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );
}
