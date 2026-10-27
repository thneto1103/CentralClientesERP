import { useEffect, useMemo, useRef, useState } from "react";
import { allowedClients } from "./access";
import { Agenda } from "./Agenda";
import { bridgePost, bridgeStatus, deployBody, isKnownStore } from "./deploy";
import { Dossier } from "./Dossier";
import { Login } from "./Login";
import { slugify } from "./month";
import { Permissions } from "./Permissions";
import { loadRemote, pushBoard, type SessionAccess } from "./remote";
import { blankChecklist } from "./seed";
import { loadBoard, newContact, newDate, newEvent, saveBoard } from "./store";
import { supabase } from "./supabaseClient";
import {
  STATUSES,
  STATUS_LABEL,
  type BoardState,
  type CalendarDate,
  type CheckKey,
  type ClientFile,
  type ClientRecord,
  type ProjectStatus,
  type Role,
} from "./types";
import { Users } from "./Users";

export function App() {
  const [board, setBoard] = useState<BoardState>(() => loadBoard());
  const [view, setView] = useState<"clientes" | "agenda" | "usuarios" | "permissoes">("clientes");
  const [access, setAccess] = useState<SessionAccess | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProjectStatus | "todos">("todos");
  const [creating, setCreating] = useState(false);
  const [deployMessage, setDeployMessage] = useState("");
  const [packageState, setPackageState] = useState({ zipExists: false, exeExists: false, folderExists: false });
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(supabase === null);
  const [boardReady, setBoardReady] = useState(supabase === null);
  const [syncMessage, setSyncMessage] = useState("");
  const skipSave = useRef(true);
  const pushedAt = useRef(0);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !sessionEmail) return;
    let cancel = false;
    void loadRemote().then((result) => {
      if (cancel) return;
      if (!result.board || !result.access) {
        setSyncMessage(result.error || "Não foi possível ler a ficha. Rode o SQL de acessos na Central.");
        return;
      }
      skipSave.current = true;
      pushedAt.current = Date.now();
      setAccess(result.access);
      setBoard(result.board);
      setBoardReady(true);
      if (!result.access.role) {
        setSyncMessage("Esta conta ainda não tem nível. Peça a um sócio.");
        return;
      }
      setSyncMessage("");
      void pushBoard(result.board).then((message) => {
        if (!cancel && message) setSyncMessage(message);
      });
    });
    return () => {
      cancel = true;
    };
  }, [sessionEmail]);

  useEffect(() => {
    if (!supabase || !sessionEmail || !boardReady) return;
    const client = supabase;
    const pull = () => {
      if (Date.now() - pushedAt.current < 1500) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;
      void loadRemote().then((result) => {
        if (!result.board || !result.access) return;
        skipSave.current = true;
        setAccess(result.access);
        setBoard(result.board);
      });
    };
    const channel = client
      .channel("central-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, pull)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_dates" }, pull)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_events" }, pull)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_contacts" }, pull)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_files" }, pull)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_grants" }, pull)
      .subscribe();
    window.addEventListener("focus", pull);
    return () => {
      window.removeEventListener("focus", pull);
      void client.removeChannel(channel);
    };
  }, [sessionEmail, boardReady]);

  useEffect(() => {
    if (!boardReady) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    if (!supabase) {
      saveBoard(board);
      return;
    }
    if (!access?.role) return;
    const handle = window.setTimeout(() => {
      pushedAt.current = Date.now();
      void pushBoard(board).then((message) => {
        if (message) setSyncMessage(message);
      });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [board, boardReady, access]);

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

  const allowed = useMemo(
    () => allowedClients(board.clients, access, supabase !== null),
    [board.clients, access],
  );
  const visible = useMemo(
    () => allowed.filter((client) => filter === "todos" || client.status === filter),
    [allowed, filter],
  );
  const current = allowed.find((client) => client.slug === selected) ?? null;
  const history = board.events.filter((event) => event.slug === current?.slug);
  const contacts = board.contacts.filter((contact) => contact.clientSlug === current?.slug);
  const files = board.files.filter((file) => file.clientSlug === current?.slug);
  const agendaDates = board.dates.filter((date) => allowed.some((client) => client.slug === date.clientSlug));

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
    if (access?.role === "vendedor") {
      setAccess((prev) => (prev ? { ...prev, grants: [...prev.grants, { userId: prev.userId, clientSlug: slug }] } : prev));
    }
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

  function addContact(input: { name: string; phone: string; roleLabel: string }) {
    if (!current) return;
    const contact = newContact({ ...input, clientSlug: current.slug });
    setBoard((prev) => ({
      ...prev,
      contacts: [...prev.contacts, contact],
      events: [newEvent(current.slug, `Contato adicionado: ${contact.name}`), ...prev.events],
    }));
  }

  function removeContact(id: string) {
    const contact = board.contacts.find((item) => item.id === id);
    if (!contact) return;
    setBoard((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((item) => item.id !== id),
      events: [newEvent(contact.clientSlug, `Contato removido: ${contact.name}`), ...prev.events],
    }));
  }

  async function addFile(file: File) {
    if (!supabase || !current) return;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^\.+/, "").slice(0, 80) || "arquivo";
    const id = crypto.randomUUID();
    const path = `${current.slug}/${id}-${safe}`;
    const uploaded = await supabase.storage.from("client-files").upload(path, file, { upsert: false });
    if (uploaded.error) {
      setSyncMessage(uploaded.error.message);
      return;
    }
    setBoard((prev) => ({
      ...prev,
      files: [...prev.files, { id, clientSlug: current.slug, storagePath: path, fileName: file.name }],
      events: [newEvent(current.slug, `Anexo adicionado: ${file.name}`), ...prev.events],
    }));
  }

  function removeFile(id: string) {
    const file = board.files.find((item) => item.id === id);
    if (!file) return;
    setBoard((prev) => ({
      ...prev,
      files: prev.files.filter((item) => item.id !== id),
      events: [newEvent(file.clientSlug, `Anexo removido: ${file.fileName}`), ...prev.events],
    }));
  }

  async function downloadFile(file: ClientFile) {
    if (!supabase) return;
    const signed = await supabase.storage.from("client-files").createSignedUrl(file.storagePath, 60);
    if (signed.error || !signed.data) {
      setSyncMessage(signed.error?.message ?? "Não abri o arquivo.");
      return;
    }
    window.open(signed.data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function refreshRemote() {
    const result = await loadRemote();
    if (!result.board || !result.access) {
      setSyncMessage(result.error || "Não foi possível ler a ficha.");
      return;
    }
    skipSave.current = true;
    pushedAt.current = Date.now();
    setAccess(result.access);
    setBoard(result.board);
  }

  async function manageUser(body: { action: "create" | "role" | "delete"; email?: string; password?: string; role?: Role; userId?: string }) {
    if (!supabase) return;
    const { data, error } = await supabase.functions.invoke("create-user", { body });
    const payload = data as { ok?: boolean; message?: string } | null;
    if (error || !payload?.ok) {
      setSyncMessage(payload?.message || error?.message || "Não foi possível alterar o usuário. Publique a função create-user.");
      return;
    }
    await refreshRemote();
  }

  async function toggleGrant(userId: string, clientSlug: string, granted: boolean) {
    if (!supabase) return;
    const result = granted
      ? await supabase.from("client_grants").insert({ user_id: userId, client_slug: clientSlug })
      : await supabase.from("client_grants").delete().eq("user_id", userId).eq("client_slug", clientSlug);
    if (result.error) {
      setSyncMessage(result.error.message);
      return;
    }
    await refreshRemote();
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

  if (supabase && !authReady) {
    return <p className="login hint">Conferindo a sessão…</p>;
  }
  if (supabase && !sessionEmail) {
    return (
      <div className="app">
        <header className="top">
          <p className="eyebrow">Sócios</p>
          <h1>Central de clientes</h1>
        </header>
        <Login />
      </div>
    );
  }
  if (supabase && !boardReady) {
    return (
      <div className="app">
        <p className={syncMessage ? "warn login" : "login hint"}>{syncMessage || "Carregando a ficha…"}</p>
        {syncMessage ? (
          <button type="button" className="choice" data-testid="sign-out" onClick={() => { if (supabase) void supabase.auth.signOut(); }}>
            Sair
          </button>
        ) : null}
      </div>
    );
  }

  const banner = !supabase
    ? "Esta cópia fica só neste navegador. Para os dois sócios verem a mesma ficha, faltam as chaves do Supabase da Central."
    : access?.role === "vendedor"
      ? `Ligado como ${sessionEmail ?? ""}. Você vê e edita só as lojas autorizadas.`
      : access?.role === "socio"
        ? `Ligado como ${sessionEmail ?? ""}. Você vê todas as lojas.`
        : `Ligado como ${sessionEmail ?? ""}. Esta conta ainda não tem nível.`;

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">{access?.role === "vendedor" ? "Vendedor" : access?.role === "socio" ? "Sócio" : "Sócios"}</p>
          <h1>Central de clientes</h1>
        </div>
        <nav className="nav" aria-label="Seções">
          <button type="button" className={view === "clientes" ? "choice on" : "choice"} data-testid="nav-clientes" onClick={() => setView("clientes")}>
            Clientes
          </button>
          <button type="button" className={view === "agenda" ? "choice on" : "choice"} data-testid="nav-agenda" onClick={() => setView("agenda")}>
            Agenda
          </button>
          {access?.role === "socio" ? (
            <button type="button" className={view === "permissoes" ? "choice on" : "choice"} data-testid="nav-permissoes" onClick={() => setView("permissoes")}>
              Permissões
            </button>
          ) : null}
          {access?.role === "socio" ? (
            <button type="button" className={view === "usuarios" ? "choice on" : "choice"} data-testid="nav-usuarios" onClick={() => setView("usuarios")}>
              Usuários
            </button>
          ) : null}
          {supabase ? (
            <button type="button" className="choice" data-testid="sign-out" onClick={() => { if (supabase) void supabase.auth.signOut(); }}>
              Sair
            </button>
          ) : null}
        </nav>
        <p className="banner">{banner}</p>
        {syncMessage ? <p className="warn">{syncMessage}</p> : null}
      </header>

      {view === "agenda" ? (
        <Agenda clients={allowed} dates={agendaDates} onSave={saveDate} onToggle={toggleDate} onRemove={removeDate} />
      ) : view === "usuarios" && access?.role === "socio" ? (
        <Users
          profiles={access.profiles}
          selfId={access.userId}
          onCreate={(input) => void manageUser({ action: "create", ...input })}
          onRole={(userId, role) => void manageUser({ action: "role", userId, role })}
          onDelete={(userId) => void manageUser({ action: "delete", userId })}
        />
      ) : view === "permissoes" && access?.role === "socio" ? (
        <Permissions
          sellers={access.profiles.filter((profile) => profile.role === "vendedor")}
          clients={allowed}
          grants={access.grants}
          onToggle={(userId, clientSlug, granted) => void toggleGrant(userId, clientSlug, granted)}
        />
      ) : (
        <>
          <div className="filters" role="toolbar" aria-label="Filtrar por status">
            <FilterChip active={filter === "todos"} label={`Todos ${allowed.length}`} onClick={() => setFilter("todos")} />
            {STATUSES.map((status) => (
              <FilterChip
                key={status}
                active={filter === status}
                label={`${STATUS_LABEL[status]} ${allowed.filter((client) => client.status === status).length}`}
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
                    contacts={contacts}
                    files={files}
                    remote={supabase !== null}
                    onPatch={patchClient}
                    onStatus={setStatus}
                    onCheck={toggleCheck}
                    onAddContact={addContact}
                    onRemoveContact={removeContact}
                    onAddFile={(file) => void addFile(file)}
                    onRemoveFile={removeFile}
                    onDownloadFile={(file) => void downloadFile(file)}
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
