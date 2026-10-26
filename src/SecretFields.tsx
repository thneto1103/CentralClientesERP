import { useEffect, useState } from "react";

export type SecretSlot = {
  id: string;
  label: string;
  value: string;
  onCommit?: (value: string) => void;
};

export function SecretFields({ slots, note }: { slots: SecretSlot[]; note: string }) {
  return (
    <div className="secrets">
      <p className="hint">{note}</p>
      {slots.map((slot) => (
        <SecretRow key={slot.id} slot={slot} />
      ))}
    </div>
  );
}

function SecretRow({ slot }: { slot: SecretSlot }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState(slot.value);
  const editable = Boolean(slot.onCommit);
  useEffect(() => setDraft(slot.value), [slot.value]);
  const empty = !draft;

  async function copy() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
  }

  return (
    <div className="secret-row">
      <label htmlFor={slot.id}>{slot.label}</label>
      <input
        id={slot.id}
        type={visible ? "text" : "password"}
        autoComplete="off"
        readOnly={!editable}
        value={draft}
        placeholder={empty ? (editable ? "Cole a senha do Supabase" : "Não está no .env") : ""}
        data-testid={`secret-${slot.id}`}
        onChange={(event) => {
          if (editable) setDraft(event.target.value);
        }}
        onBlur={() => {
          if (editable && draft !== slot.value) slot.onCommit?.(draft);
        }}
      />
      <button
        type="button"
        className="choice"
        disabled={empty}
        data-testid={`show-secret-${slot.id}`}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? "Ocultar" : "Mostrar"}
      </button>
      <button type="button" className="choice" disabled={empty} onClick={() => void copy()}>
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
