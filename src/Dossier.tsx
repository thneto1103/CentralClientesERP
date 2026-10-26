import { useEffect, useState } from "react";
import { clientFolder, dbReady, isKnownStore } from "./deploy";
import { SecretFields } from "./SecretFields";
import {
  STATUSES,
  STATUS_HINT,
  STATUS_LABEL,
  type CheckKey,
  type ClientRecord,
  type HistoryEvent,
  type ProjectStatus,
} from "./types";

function formatCnpj(value: string): string {
  return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function Dossier({
  client,
  history,
  onPatch,
  onStatus,
  onCheck,
  deployMessage,
  packageState,
  onPackage,
  onOpen,
  onRecompile,
}: {
  client: ClientRecord;
  history: HistoryEvent[];
  onPatch: (slug: string, patch: Partial<ClientRecord>, label: string) => void;
  onStatus: (slug: string, status: ProjectStatus) => void;
  onCheck: (slug: string, key: CheckKey) => void;
  deployMessage: string;
  packageState: { zipExists: boolean; exeExists: boolean };
  onPackage: (client: ClientRecord) => void;
  onOpen: (client: ClientRecord) => void;
  onRecompile: () => void;
}) {
  const doneCount = client.checklist.filter((item) => item.done).length;
  const ready = dbReady(client);
  const known = isKnownStore(client);

  return (
    <>
      <h2>{client.tradeName}</h2>
      <Field
        label="Nome"
        value={client.tradeName}
        testId="edit-name"
        onCommit={(value) => onPatch(client.slug, { tradeName: value }, "Nome atualizado")}
      />
      <Field
        label="Notas"
        value={client.summary}
        testId="edit-notes"
        multiline
        onCommit={(value) => onPatch(client.slug, { summary: value }, "Notas atualizadas")}
      />
      <div className="form-grid">
        <Field
          label="CNPJ"
          value={client.cnpj ? formatCnpj(client.cnpj) : ""}
          testId="edit-cnpj"
          onCommit={(value) => {
            const digits = value.replace(/\D/g, "").slice(0, 14);
            onPatch(client.slug, { cnpj: digits || null }, "CNPJ atualizado");
          }}
        />
        <Field
          label="Repositório"
          value={client.repoName}
          testId="edit-repo"
          onCommit={(value) => onPatch(client.slug, { repoName: value }, "Repositório atualizado")}
        />
        <Field
          label="Pasta"
          value={client.repoPath}
          testId="edit-path"
          onCommit={(value) => onPatch(client.slug, { repoPath: value }, "Pasta atualizada")}
        />
        <Field
          label="Supabase (ref)"
          value={client.supabaseRef ?? ""}
          testId="edit-supabase"
          onCommit={(value) => onPatch(client.slug, { supabaseRef: value || null }, "Supabase atualizado")}
        />
        <Field
          label="Host do banco"
          value={client.supabaseHost ?? ""}
          testId="edit-host"
          onCommit={(value) => onPatch(client.slug, { supabaseHost: value || null }, "Host atualizado")}
        />
        <Field
          label="Usuário do banco"
          value={client.dbUser}
          testId="db-user"
          onCommit={(value) => onPatch(client.slug, { dbUser: value }, "Usuário do banco atualizado")}
        />
        <Field
          label="Porta"
          value={client.dbPort}
          testId="db-port"
          onCommit={(value) => onPatch(client.slug, { dbPort: value }, "Porta do banco atualizada")}
        />
        <Field
          label="Nome do banco"
          value={client.dbName}
          testId="db-name"
          onCommit={(value) => onPatch(client.slug, { dbName: value }, "Nome do banco atualizado")}
        />
      </div>
      <SecretFields
        note="Senha do banco. Cole aqui a senha do Supabase quando a loja ainda não tem .env."
        slots={[
          {
            id: "supabase-banco",
            label: "Senha do banco",
            value: client.secrets.dbPassword,
            onCommit: (value) =>
              onPatch(client.slug, { secrets: { ...client.secrets, dbPassword: value } }, "Senha do banco atualizada"),
          },
        ]}
      />
      <h3>App da loja</h3>
      <p className="hint" data-testid="deploy-path">
        {clientFolder(client.slug)}
      </p>
      <p className="hint">
        {packageState.zipExists ? "O zip está na pasta." : "O zip ainda não foi gerado."}
        {packageState.exeExists ? " O executável está na pasta." : ""}
      </p>
      <p className="hint">
        {known
          ? "Esta loja já existe. Empacotar copia o executável e o .env, sem migrar o banco."
          : "Gerar grava o .env, copia o executável e aplica as migrações nesse banco novo."}
      </p>
      <div className="row-actions">
        <button
          type="button"
          className="choice on"
          data-testid="deploy-gerar"
          disabled={!ready}
          onClick={() => onPackage(client)}
        >
          {known ? "Empacotar" : "Gerar instalador"}
        </button>
        <button type="button" className="choice" data-testid="deploy-abrir" onClick={() => onOpen(client)}>
          Abrir app
        </button>
        <button
          type="button"
          className="choice"
          data-testid="deploy-recompile"
          onClick={() => {
            if (window.confirm("Recompilar o ERP agora? Isso leva alguns minutos.")) onRecompile();
          }}
        >
          Recompilar código
        </button>
      </div>
      {ready ? null : <p className="hint">Preencha host, usuário, senha, porta e nome do banco.</p>}
      {deployMessage ? (
        <p className={deployMessage.startsWith("O gerador") || deployMessage.includes("não") ? "warn" : "hint"} data-testid="deploy-message">
          {deployMessage}
        </p>
      ) : null}

      <h3>SMTP</h3>
      <div className="form-grid">
        <Field label="Host" value={client.smtpHost} testId="smtp-host" onCommit={(value) => onPatch(client.slug, { smtpHost: value }, "SMTP host atualizado")} />
        <Field label="Porta" value={client.smtpPort} testId="smtp-port" onCommit={(value) => onPatch(client.slug, { smtpPort: value }, "SMTP porta atualizada")} />
        <Field label="Usuário" value={client.smtpUser} testId="smtp-user" onCommit={(value) => onPatch(client.slug, { smtpUser: value }, "SMTP usuário atualizado")} />
        <Field label="Remetente" value={client.smtpFrom} testId="smtp-from" onCommit={(value) => onPatch(client.slug, { smtpFrom: value }, "SMTP remetente atualizado")} />
        <Field label="TLS" value={client.smtpTls} testId="smtp-tls" onCommit={(value) => onPatch(client.slug, { smtpTls: value }, "SMTP TLS atualizado")} />
        <Field label="SSL" value={client.smtpSsl} testId="smtp-ssl" onCommit={(value) => onPatch(client.slug, { smtpSsl: value }, "SMTP SSL atualizado")} />
      </div>
      <SecretFields
        note={client.smtpHost ? "Senha SMTP lida do .env da loja." : "Esta loja não tem SMTP no .env."}
        slots={[{ id: "smtp", label: "Senha SMTP", value: client.secrets.smtpPassword }]}
      />

      <h3>Focus NFe</h3>
      <p className="hint">
        {client.focusHomolog ? "Token de homologação está no .env." : "Token de homologação não está no .env."}
        {client.focusProduction ? " Token de produção está no .env." : " Token de produção não está no .env."}
      </p>
      <div className="form-grid">
        <Field
          label="E-mail da conta Focus"
          value={client.focusEmail}
          testId="edit-focus-email"
          onCommit={(value) => onPatch(client.slug, { focusEmail: value }, "E-mail Focus atualizado")}
        />
        <Field
          label="Link do painel"
          value={client.focusPanelUrl}
          testId="edit-focus-url"
          onCommit={(value) => onPatch(client.slug, { focusPanelUrl: value }, "Painel Focus atualizado")}
        />
        <label className="field">
          Ambiente em uso
          <select
            data-testid="edit-focus-ambiente"
            value={client.focusAmbiente}
            onChange={(event) =>
              onPatch(
                client.slug,
                { focusAmbiente: event.target.value as ClientRecord["focusAmbiente"] },
                "Ambiente Focus atualizado",
              )
            }
          >
            <option value="">Não informado</option>
            <option value="homologacao">Homologação</option>
            <option value="producao">Produção</option>
          </select>
        </label>
      </div>
      <SecretFields
        note="Tokens lidos do .env. Senha da conta Focus, certificado e acesso remoto não estão nesses arquivos."
        slots={[
          { id: "focus-homolog", label: "Token Focus homologação", value: client.secrets.focusHomolog },
          { id: "focus-producao", label: "Token Focus produção", value: client.secrets.focusProduction },
          { id: "focus-token", label: "Token Focus genérico", value: client.secrets.focusToken },
          { id: "focus-senha", label: "Senha da conta Focus", value: "" },
          { id: "certificado", label: "Senha do certificado A1", value: "" },
          { id: "remoto", label: "Senha de acesso remoto", value: "" },
        ]}
      />

      <h3>Status do projeto</h3>
      <p className="hint">{STATUS_HINT[client.status]}</p>
      <div className="status-row" role="radiogroup" aria-label="Status do projeto">
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={client.status === status}
            className={client.status === status ? `choice on status-${status}` : "choice"}
            data-testid={`status-${status}`}
            onClick={() => onStatus(client.slug, status)}
          >
            {STATUS_LABEL[status]}
          </button>
        ))}
      </div>

      <h3>
        Implantação <span className="nums">{doneCount}/{client.checklist.length}</span>
      </h3>
      <ul className="checks">
        {client.checklist.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className={item.done ? "check done" : "check"}
              aria-pressed={item.done}
              data-testid={`check-${item.key}`}
              onClick={() => onCheck(client.slug, item.key)}
            >
              <span className="box" aria-hidden="true" />
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      <h3>Histórico</h3>
      {history.length === 0 ? (
        <p className="empty">Nenhuma mudança ainda.</p>
      ) : (
        <ol className="history">
          {history.map((event) => (
            <li key={event.id}>
              <time className="nums" dateTime={event.at}>
                {formatWhen(event.at)}
              </time>
              <span>{event.text}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onCommit,
  testId,
  multiline = false,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  testId: string;
  multiline?: boolean;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => {
    if (text !== value) onCommit(text);
  };
  return (
    <label className="field">
      {label}
      {multiline ? (
        <textarea data-testid={testId} value={text} rows={3} onChange={(event) => setText(event.target.value)} onBlur={commit} />
      ) : (
        <input data-testid={testId} value={text} onChange={(event) => setText(event.target.value)} onBlur={commit} />
      )}
    </label>
  );
}
