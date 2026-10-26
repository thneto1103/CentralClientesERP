import { useState, type FormEvent } from "react";
import { supabase } from "./supabaseClient";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setPending(true);
    setError("");
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setPending(false);
    if (signError) {
      setError(signError.message === "Invalid login credentials" ? "E-mail ou senha não conferem." : signError.message);
    }
  }

  return (
    <form className="login" onSubmit={(event) => void submit(event)}>
      <h2>Entrar</h2>
      <p className="hint">A ficha é a mesma para os dois sócios.</p>
      <label className="field">
        E-mail
        <input data-testid="login-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="field">
        Senha
        <input data-testid="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      {error ? <p className="warn">{error}</p> : null}
      <button type="submit" className="choice on" disabled={pending} data-testid="login-submit">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
