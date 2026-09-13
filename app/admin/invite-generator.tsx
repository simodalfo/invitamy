"use client";

import { FormEvent, useEffect, useState } from "react";

type GeneratedInvite = { url: string; name: string };

export function InviteGenerator() {
  const [name, setName] = useState("");
  const [invite, setInvite] = useState<GeneratedInvite | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => setCanShare(typeof navigator.share === "function"), []);

  async function generateInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCopied(false);
    setLoading(true);

    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = (await response.json()) as GeneratedInvite & { error?: string };

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        setError(result.error ?? "Non siamo riusciti a creare il link. Riprova.");
        return;
      }

      setInvite({ url: result.url, name: result.name });
    } catch {
      setError("Non riusciamo a raggiungere il server. Controlla la connessione e riprova.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!invite) return;

    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
    } catch {
      setError("Il link è pronto, ma non possiamo copiarlo automaticamente. Selezionalo e copialo a mano.");
    }
  }

  async function shareLink() {
    if (!invite || !navigator.share) return;
    await navigator.share({ title: `Un messaggio per ${invite.name}`, url: invite.url });
  }

  return (
    <div className="generator">
      <form className="generator-form" onSubmit={generateInvite} noValidate>
        <div className="field-group">
          <label htmlFor="invite-name">Nome</label>
          <input
            id="invite-name"
            name="name"
            type="text"
            inputMode="text"
            autoComplete="off"
            maxLength={40}
            placeholder="Per esempio, Sofia"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-describedby={error ? "generator-error" : "name-help"}
            aria-invalid={Boolean(error)}
            required
          />
          <p className="field-help" id="name-help">Comparirà nel saluto iniziale.</p>
          {error ? <p className="field-error" id="generator-error" role="alert">{error}</p> : null}
        </div>
        <button className="button button-primary" type="submit" disabled={loading || !name.trim()}>
          {loading ? "Creo il link…" : "Genera link"}
        </button>
      </form>

      <div
        className={`generated-result${invite ? " is-visible" : ""}`}
        aria-live="polite"
      >
        {invite ? (
          <>
            <div className="result-heading">
              <span className="result-spark" aria-hidden="true">✦</span>
              <div>
                <h2>Pronto per {invite.name}.</h2>
                <p>Mandalo così com’è: la sorpresa farà il resto.</p>
              </div>
            </div>
            <div className="link-row">
              <input aria-label="Link generato" value={invite.url} readOnly onFocus={(event) => event.target.select()} />
              <button className="copy-button" type="button" onClick={copyLink} aria-label="Copia il link">
                <span aria-hidden="true">{copied ? "✓" : "⧉"}</span>
              </button>
            </div>
            <div className="result-actions">
              <button className="button button-secondary" type="button" onClick={copyLink}>
                {copied ? "Link copiato" : "Copia link"}
              </button>
              {canShare ? (
                <button className="button button-quiet" type="button" onClick={shareLink}>Condividi</button>
              ) : null}
              <a className="button button-quiet" href={invite.url} target="_blank" rel="noreferrer">Anteprima</a>
            </div>
          </>
        ) : (
          <div className="result-empty" aria-hidden="true">
            <span>✦</span>
            <p>Qui apparirà il tuo link segreto.</p>
          </div>
        )}
      </div>
    </div>
  );
}
