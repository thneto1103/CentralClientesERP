import { useState } from "react";
import type { Profile, Role } from "./types";

export function Users({
  profiles,
  selfId,
  onCreate,
  onRole,
  onDelete,
}: {
  profiles: Profile[];
  selfId: string;
  onCreate: (input: { email: string; password: string; role: Role }) => void;
  onRole: (userId: string, role: Role) => void;
  onDelete: (userId: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("vendedor");
  const [error, setError] = useState("");

  return (
    <section className="dossier" aria-label="Usuários">
      <h2>Usuários</h2>
      <form
        className="date-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!email.trim().includes("@") || password.length < 6) {
            setError("Informe um e-mail e uma senha de 6 caracteres.");
            return;
          }
          setError("");
          onCreate({ email: email.trim(), password, role });
          setEmail("");
          setPassword("");
        }}
      >
        <label className="field">
          E-mail
          <input data-testid="user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="field">
          Senha
          <input data-testid="user-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label className="field">
          Nível
          <select data-testid="user-role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="vendedor">Vendedor</option>
            <option value="socio">Sócio</option>
          </select>
        </label>
        {error ? <p className="warn">{error}</p> : null}
        <button type="submit" className="choice on" data-testid="create-user">
          Criar usuário
        </button>
      </form>
      <ul className="history">
        {profiles.map((profile) => (
          <li key={profile.userId}>
            <span>{profile.email}</span>
            <span>
              {profile.userId === selfId ? (
                <span>{profile.role === "socio" ? "Sócio" : "Vendedor"}</span>
              ) : (
                <>
                  <button
                    type="button"
                    className="choice"
                    onClick={() => onRole(profile.userId, profile.role === "socio" ? "vendedor" : "socio")}
                  >
                    {profile.role === "socio" ? "Tornar vendedor" : "Tornar sócio"}
                  </button>
                  <button type="button" className="choice" onClick={() => onDelete(profile.userId)}>
                    Remover
                  </button>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
