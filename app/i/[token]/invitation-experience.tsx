"use client";

import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";

type Phase = "intro" | "ready" | "letter" | "answered";
type TrickChoice = "no" | "maybe";

export function InvitationExperience({ token, name }: { token: string; name: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [showFold, setShowFold] = useState(false);
  const [converted, setConverted] = useState<Record<TrickChoice, boolean>>({ no: false, maybe: false });
  const [responseError, setResponseError] = useState("");
  const noRef = useRef<HTMLButtonElement>(null);
  const maybeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setPhase("ready"), reducedMotion ? 0 : 2100);
    return () => window.clearTimeout(timer);
  }, []);

  function openLetter() {
    setShowFold(true);
    setPhase("letter");
    window.setTimeout(() => setShowFold(false), 950);
    void fetch(`/api/invites/${token}/open`, { method: "POST" });
  }

  function convert(choice: TrickChoice) {
    setConverted((current) => (current[choice] ? current : { ...current, [choice]: true }));
  }

  function handleProximity(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;

    const targets: Array<[TrickChoice, HTMLButtonElement | null]> = [
      ["no", noRef.current],
      ["maybe", maybeRef.current],
    ];

    for (const [choice, element] of targets) {
      if (!element || converted[choice]) continue;
      const bounds = element.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
      if (distance < 92) convert(choice);
    }
  }

  async function choose(choice: "yes" | TrickChoice) {
    if (choice !== "yes" && !converted[choice]) {
      convert(choice);
      return;
    }

    setPhase("answered");
    setResponseError("");

    try {
      const response = await fetch(`/api/invites/${token}/respond`, { method: "POST" });
      if (!response.ok) throw new Error("response failed");
    } catch {
      setResponseError("La risposta non è partita, ma il sì resta valido. Riprova tra poco.");
    }
  }

  return (
    <main
      className={`invite-scene phase-${phase}`}
      id="main-content"
      onPointerMove={phase === "letter" ? handleProximity : undefined}
    >
      <div className="sky-field" aria-hidden="true">
        <span className="sky-spark">✦</span>
        <span className="sky-arc" />
      </div>

      {phase === "intro" || phase === "ready" ? (
        <section className="invite-intro" aria-labelledby="invite-greeting">
          <div className="greeting-block">
            <h1 id="invite-greeting">Ciao,<br />{name}.</h1>
            <p>C’è un messaggio per te.</p>
          </div>

          <button
            className="envelope-trigger"
            type="button"
            onClick={openLetter}
            disabled={phase !== "ready"}
            aria-label={phase === "ready" ? "Apri il messaggio" : "Il messaggio sta arrivando"}
          >
            <span className="envelope" aria-hidden="true">
              <span className="envelope-back" />
              <span className="envelope-letter" />
              <span className="envelope-pocket" />
              <span className="envelope-flap" />
              <span className="envelope-seal">✦</span>
            </span>
            <span className="envelope-label">{phase === "ready" ? "Tocca per aprire" : "Sta arrivando…"}</span>
          </button>
        </section>
      ) : null}

      {phase === "letter" ? (
        <section className="letter-screen" aria-labelledby="letter-question">
          {showFold ? <span className="letter-fold" aria-hidden="true" /> : null}
          <span className="letter-spark" aria-hidden="true">✦</span>
          <div className="letter-content">
            <p className="letter-to">Per {name}</p>
            <h1 id="letter-question">Questa settimana usciamo?</h1>
            <div className="choice-group" aria-label="Scegli una risposta">
              <button className="choice choice-primary" type="button" onClick={() => choose("yes")}>Sì</button>
              <button
                ref={noRef}
                className={`choice choice-trick${converted.no ? " is-converted" : ""}`}
                type="button"
                onPointerEnter={() => convert("no")}
                onPointerDown={(event) => event.pointerType === "touch" && convert("no")}
                onFocus={() => convert("no")}
                onClick={() => choose("no")}
              >
                {converted.no ? "Sì, certo" : "No"}
              </button>
              <button
                ref={maybeRef}
                className={`choice choice-trick${converted.maybe ? " is-converted" : ""}`}
                type="button"
                onPointerEnter={() => convert("maybe")}
                onPointerDown={(event) => event.pointerType === "touch" && convert("maybe")}
                onFocus={() => convert("maybe")}
                onClick={() => choose("maybe")}
              >
                {converted.maybe ? "Sì, certo" : "Non so"}
              </button>
            </div>
            <p className="trick-hint" aria-live="polite">
              {converted.no || converted.maybe ? "Ops. Sembra che il sito abbia già deciso." : "Scegli liberamente. Più o meno."}
            </p>
          </div>
        </section>
      ) : null}

      {phase === "answered" ? (
        <section className="answer-screen" aria-labelledby="answer-title">
          <span className="answer-spark" aria-hidden="true">✦</span>
          <p>Risposta ricevuta</p>
          <h1 id="answer-title">Lo sapevo.</h1>
          <span className="answer-note">Ci vediamo questa settimana.</span>
          {responseError ? <p className="field-error answer-error" role="alert">{responseError}</p> : null}
        </section>
      ) : null}
    </main>
  );
}
