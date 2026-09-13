"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Non siamo riusciti ad accedere. Riprova.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Non riusciamo a raggiungere il server. Controlla la connessione e riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="field-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby={error ? "login-error" : undefined}
          aria-invalid={Boolean(error)}
          required
        />
        {error ? <p className="field-error" id="login-error" role="alert">{error}</p> : null}
      </div>
      <button className="button button-primary" type="submit" disabled={loading || !password}>
        {loading ? "Accesso in corso…" : "Accedi"}
      </button>
    </form>
  );
}
