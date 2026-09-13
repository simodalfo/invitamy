"use client";

import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";

type Phase = "intro" | "ready" | "letter" | "answered";
type TrickChoice = "no" | "maybe";
type Choice = "yes" | TrickChoice;

const choiceCopy: Record<Choice, string> = {
  yes: "Sì",
  no: "No",
  maybe: "Non so",
};

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="m4.5 10.4 3.4 3.4 7.6-8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

export function InvitationExperience({ token, name }: { token: string; name: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [showFold, setShowFold] = useState(false);
  const [nearbyChoice, setNearbyChoice] = useState<TrickChoice | null>(null);
  const [confirmingChoice, setConfirmingChoice] = useState<Choice | null>(null);
  const [responseError, setResponseError] = useState("");
  const noRef = useRef<HTMLButtonElement>(null);
  const maybeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setPhase("ready"), reducedMotion ? 0 : 1450);
    return () => window.clearTimeout(timer);
  }, []);

  function openLetter() {
    setShowFold(true);
    setPhase("letter");
    window.setTimeout(() => setShowFold(false), 950);
    void fetch(`/api/invites/${token}/open`, { method: "POST" });
  }

  function isTricked(choice: TrickChoice) {
    return nearbyChoice === choice || confirmingChoice === choice;
  }

  function getChoiceLabel(choice: Choice) {
    if (choice !== "yes" && isTricked(choice)) return "Sì, certo";
    return choiceCopy[choice];
  }

  function handleProximity(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "touch" || confirmingChoice) return;

    const targets: Array<[TrickChoice, HTMLButtonElement | null]> = [
      ["no", noRef.current],
      ["maybe", maybeRef.current],
    ];

    let closestChoice: TrickChoice | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const [choice, element] of targets) {
      if (!element) continue;
      const bounds = element.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
      if (distance < closestDistance) {
        closestChoice = choice;
        closestDistance = distance;
      }
    }

    setNearbyChoice(closestDistance < 104 ? closestChoice : null);
  }

  function choose(choice: Choice) {
    if (confirmingChoice !== choice) {
      setConfirmingChoice(choice);
      setNearbyChoice(null);
      return;
    }

    void submitChoice();
  }

  async function submitChoice() {
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
            <h1 id="invite-greeting">
              <span className="greeting-hello">Ciao,</span>
              <span className="greeting-name">{name}.</span>
            </h1>
            <p className="greeting-message">C’è un messaggio per te.</p>
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
            <div
              className="choice-group"
              aria-label="Scegli una risposta"
            >
              {(["yes", "no", "maybe"] as const).map((choice) => {
                const isTrickChoice = choice !== "yes";
                const isConverted = isTrickChoice && isTricked(choice);
                const isConfirming = confirmingChoice === choice;

                return (
                  <div className={`choice-row${isConfirming ? " is-confirming" : ""}`} key={choice}>
                    <button
                      ref={choice === "no" ? noRef : choice === "maybe" ? maybeRef : undefined}
                      className={`choice${choice === "yes" ? " choice-primary" : " choice-trick"}${isConverted ? " is-converted" : ""}${isConfirming ? " is-confirming" : ""}`}
                      type="button"
                      onFocus={() => isTrickChoice && setNearbyChoice(choice)}
                      onBlur={() => isTrickChoice && !isConfirming && setNearbyChoice(null)}
                      onClick={() => choose(choice)}
                      aria-label={isConfirming ? `Conferma: ${getChoiceLabel(choice)}` : getChoiceLabel(choice)}
                    >
                      <span className="choice-copy" key={isConfirming ? "confirm" : getChoiceLabel(choice)}>
                        {isConfirming ? <CheckIcon /> : null}
                        {isConfirming ? "Conferma" : getChoiceLabel(choice)}
                      </span>
                    </button>
                    <button
                      className={`choice-cancel${isConfirming ? " is-visible" : ""}`}
                      type="button"
                      onClick={() => {
                        setConfirmingChoice(null);
                        setNearbyChoice(null);
                      }}
                      disabled={!isConfirming}
                      tabIndex={isConfirming ? 0 : -1}
                      aria-hidden={!isConfirming}
                      aria-label="Annulla la scelta"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="trick-hint" aria-live="polite">
              {confirmingChoice ? (
                <>
                  Confermi la tua scelta? <strong>{getChoiceLabel(confirmingChoice)}</strong>
                </>
              ) : nearbyChoice ? (
                "Ops. Sembra che il sito abbia già deciso."
              ) : (
                "Scegli liberamente. Più o meno."
              )}
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
