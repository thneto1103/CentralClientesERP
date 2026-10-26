import { useMemo, useState } from "react";
import { formatBrl, formatDay, monthCells, parseBrl } from "./month";
import { DATE_KINDS, DATE_LABEL, type CalendarDate, type ClientRecord, type DateKind } from "./types";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function Agenda({
  clients,
  dates,
  onSave,
  onToggle,
  onRemove,
}: {
  clients: ClientRecord[];
  dates: CalendarDate[];
  onSave: (date: Omit<CalendarDate, "id"> & { id?: string }) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientSlug, setClientSlug] = useState(clients[0]?.slug ?? "");
  const [kind, setKind] = useState<DateKind>("entrega");
  const [day, setDay] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const cells = monthCells(cursor.year, cursor.month);
  const title = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(cursor.year, cursor.month, 1),
  );
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarDate[]>();
    for (const date of dates) {
      const list = map.get(date.day) ?? [];
      list.push(date);
      map.set(date.day, list);
    }
    return map;
  }, [dates]);

  const upcoming = [...dates]
    .filter((date) => !date.done)
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(0, 8);

  function load(date: CalendarDate) {
    setEditingId(date.id);
    setClientSlug(date.clientSlug);
    setKind(date.kind);
    setDay(date.day);
    setSelectedDay(date.day);
    setAmount(date.amountCents != null ? (date.amountCents / 100).toFixed(2).replace(".", ",") : "");
    setNote(date.note);
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setKind("entrega");
    setAmount("");
    setNote("");
    setError("");
  }

  function submit() {
    if (!clientSlug || !day) {
      setError("Escolha a loja e o dia.");
      return;
    }
    const amountCents = kind === "pagamento" ? parseBrl(amount) : null;
    if (kind === "pagamento" && amountCents == null) {
      setError("Informe o valor do pagamento, por exemplo 150,00.");
      return;
    }
    onSave({ id: editingId ?? undefined, clientSlug, kind, day, amountCents, note: note.trim(), done: false });
    resetForm();
  }

  return (
    <section className="agenda" aria-label="Agenda">
      <div className="agenda-head">
        <button type="button" className="choice" onClick={() => setCursor(shift(cursor, -1))} aria-label="Mês anterior">
          Mês anterior
        </button>
        <h2>{title}</h2>
        <button type="button" className="choice" onClick={() => setCursor(shift(cursor, 1))} aria-label="Próximo mês">
          Próximo mês
        </button>
      </div>
      <div className="weekdays">
        {WEEKDAYS.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
      <div className="month" data-testid="month-grid">
        {cells.map((iso, index) =>
          iso ? (
            <button
              key={iso}
              type="button"
              className={iso === selectedDay ? "day selected" : "day"}
              data-testid={`day-${iso}`}
              onClick={() => {
                setSelectedDay(iso);
                setDay(iso);
              }}
            >
              <span className="nums">{Number(iso.slice(8))}</span>
              {(byDay.get(iso) ?? []).slice(0, 2).map((date) => (
                <span key={date.id} className={`dot kind-${date.kind}`}>
                  {DATE_LABEL[date.kind]}
                </span>
              ))}
            </button>
          ) : (
            <span key={`empty-${index}`} className="day empty-day" />
          ),
        )}
      </div>

      <form
        className="date-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <h3>{editingId ? "Editar data" : "Nova data"}</h3>
        <div className="form-grid">
          <label className="field">
            Loja
            <select data-testid="date-client" value={clientSlug} onChange={(event) => setClientSlug(event.target.value)}>
              {clients.map((client) => (
                <option key={client.slug} value={client.slug}>
                  {client.tradeName}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Tipo
            <select
              data-testid="date-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as DateKind)}
            >
              {DATE_KINDS.map((item) => (
                <option key={item} value={item}>
                  {DATE_LABEL[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Dia
            <input data-testid="date-day" type="date" value={day} onChange={(event) => setDay(event.target.value)} />
          </label>
          {kind === "pagamento" ? (
            <label className="field">
              Valor
              <input data-testid="date-amount" inputMode="decimal" value={amount} placeholder="150,00" onChange={(event) => setAmount(event.target.value)} />
            </label>
          ) : null}
        </div>
        <label className="field">
          Observação
          <input data-testid="date-note" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        {error ? <p className="warn">{error}</p> : null}
        <div className="row-actions">
          <button type="submit" className="choice on" data-testid="save-date">
            {editingId ? "Atualizar data" : "Salvar data"}
          </button>
          {editingId ? (
            <button type="button" className="choice" onClick={resetForm}>
              Cancelar edição
            </button>
          ) : null}
        </div>
      </form>

      <h3>Neste mês e próximas</h3>
      {upcoming.length === 0 ? (
        <p className="empty">Nenhuma data em aberto. Use o formulário para marcar um pagamento ou uma entrega.</p>
      ) : (
        <ul className="date-list">
          {upcoming.map((date) => {
            const client = clients.find((item) => item.slug === date.clientSlug);
            return (
              <li key={date.id}>
                <button type="button" className="date-item" onClick={() => load(date)}>
                  <span className="nums">{formatDay(date.day)}</span>
                  <span>
                    {DATE_LABEL[date.kind]} · {client?.tradeName ?? date.clientSlug}
                    {date.amountCents != null ? ` · ${formatBrl(date.amountCents)}` : ""}
                    {date.note ? ` · ${date.note}` : ""}
                  </span>
                </button>
                <button type="button" className="choice" data-testid={`done-${date.id}`} onClick={() => onToggle(date.id)}>
                  Marcar feito
                </button>
                <button type="button" className="choice" onClick={() => onRemove(date.id)}>
                  Remover
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function shift(cursor: { year: number; month: number }, delta: number) {
  const next = new Date(cursor.year, cursor.month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}
