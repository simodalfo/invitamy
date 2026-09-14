"use client";

import {
  type CSSProperties,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { BackgroundTone } from "@/lib/invites";
import {
  formatInviteDate,
  formatInviteDayMonth,
  formatInviteWeekday,
  inviteScheduleDates,
  type InviteSchedule,
} from "@/lib/invite-schedule";
import { MAX_RESPONSE_MESSAGE_LENGTH } from "@/lib/invite-message";

type Phase = "intro" | "ready" | "letter" | "answered";
type LetterStep = "choice" | "schedule" | "message";
type TrickChoice = "no";
type Choice = "yes" | "no" | "maybe";
type SubmissionStatus = "idle" | "sending" | "success" | "error";

const choiceCopy: Record<Choice, string> = {
  yes: "Sì",
  no: "No",
  maybe: "Sì, ovvio",
};

const confettiColors = [
  "oklch(0.63 0.23 25)",
  "oklch(0.60 0.18 253)",
  "oklch(0.68 0.18 145)",
  "oklch(0.82 0.17 88)",
  "oklch(0.61 0.20 305)",
  "oklch(0.72 0.19 52)",
];

function ConfettiBurst() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(false), 5_200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="confetti-layer" aria-hidden="true">
      {Array.from({ length: 72 }, (_, index) => {
        const style = {
          left: `${(index * 47 + 9) % 100}%`,
          width: `${6 + (index % 3) * 2}px`,
          height: `${10 + (index % 4) * 2}px`,
          backgroundColor: confettiColors[index % confettiColors.length],
          animationDelay: `${((index * 19) % 90) / 100}s`,
          animationDuration: `${2.7 + ((index * 13) % 14) / 10}s`,
          "--confetti-drift": `${((index * 31) % 91) - 45}px`,
          "--confetti-spin": `${540 + ((index * 43) % 540)}deg`,
        } as CSSProperties;

        return <span className={`confetti-piece shape-${index % 3}`} style={style} key={index} />;
      })}
    </div>
  );
}

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

export function InvitationExperience({
  token,
  name,
  message,
  schedule,
  backgroundPath,
  backgroundTone,
}: {
  token: string;
  name: string;
  message?: string;
  schedule?: InviteSchedule;
  backgroundPath?: string;
  backgroundTone?: BackgroundTone;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [letterStep, setLetterStep] = useState<LetterStep>("choice");
  const [showFold, setShowFold] = useState(false);
  const [nearbyChoice, setNearbyChoice] = useState<TrickChoice | null>(null);
  const [revealedChoice, setRevealedChoice] = useState<TrickChoice | null>(null);
  const [confirmingChoice, setConfirmingChoice] = useState<Choice | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>("idle");
  const [responseError, setResponseError] = useState("");
  const noRef = useRef<HTMLButtonElement>(null);
  const ignoredTouchClickRef = useRef<TrickChoice | null>(null);
  const hasPhoto = Boolean(backgroundPath && backgroundTone);
  const backgroundUrl = hasPhoto ? `/api/invites/${token}/background` : undefined;
  const dateOptions = schedule?.mode === "range" ? inviteScheduleDates(schedule) : [];
  const responseDate = schedule?.mode === "single" ? schedule.date : selectedDate ?? undefined;

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
    return nearbyChoice === choice || revealedChoice === choice || confirmingChoice === choice;
  }

  function getChoiceLabel(choice: Choice) {
    if (choice === "no" && isTricked(choice)) return "Sì, certo!";
    return choiceCopy[choice];
  }

  function handleProximity(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === "touch" || confirmingChoice) return;

    const targets: Array<[TrickChoice, HTMLButtonElement | null]> = [["no", noRef.current]];

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
    if (choice === "no" && !isTricked(choice)) {
      setRevealedChoice(choice);
      setNearbyChoice(null);
      return;
    }

    if (confirmingChoice !== choice) {
      setConfirmingChoice(choice);
      setNearbyChoice(null);
      setRevealedChoice(choice === "no" ? choice : null);
      return;
    }

    if (schedule) {
      setLetterStep("schedule");
      setConfirmingChoice(null);
      setNearbyChoice(null);
      setRevealedChoice(null);
      ignoredTouchClickRef.current = null;
      return;
    }

    openMessageStep();
  }

  function prepareTouchChoice(event: ReactPointerEvent<HTMLButtonElement>, choice: Choice) {
    if (event.pointerType !== "touch" || choice !== "no" || isTricked(choice)) return;

    ignoredTouchClickRef.current = choice;
    setRevealedChoice(choice);
    setNearbyChoice(null);
  }

  function handleChoiceClick(choice: Choice) {
    if (choice === "no" && ignoredTouchClickRef.current === choice) {
      ignoredTouchClickRef.current = null;
      return;
    }

    choose(choice);
  }

  function chooseDate(date: string) {
    setSelectedDate(date);
    setResponseError("");
  }

  function openMessageStep() {
    setLetterStep("message");
    setConfirmingChoice(null);
    setNearbyChoice(null);
    setRevealedChoice(null);
    ignoredTouchClickRef.current = null;
    setResponseError("");
  }

  async function submitChoice() {
    if ((schedule?.mode === "range" && !selectedDate) || submissionStatus === "sending") return;

    setPhase("answered");
    setSubmissionStatus("sending");
    setResponseError("");

    try {
      const response = await fetch(`/api/invites/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedDate: responseDate,
          message: replyMessage.trim() || undefined,
        }),
      });
      if (!response.ok) throw new Error("response failed");
      setSubmissionStatus("success");
    } catch {
      setSubmissionStatus("error");
      setResponseError("La risposta non è partita. Tocca Riprova per inviarmela.");
    }
  }

  return (
    <main
      className={`invite-scene phase-${phase}${hasPhoto ? ` has-photo on-${backgroundTone}` : ""}`}
      id="main-content"
      onPointerMove={phase === "letter" && letterStep === "choice" ? handleProximity : undefined}
    >
      {backgroundUrl ? (
        <div
          className="invite-photo"
          style={{ backgroundImage: `url(${JSON.stringify(backgroundUrl)})` }}
          aria-hidden="true"
        />
      ) : null}
      <div className="sky-field" aria-hidden="true" />

      {phase === "intro" || phase === "ready" ? (
        <section className="invite-intro" aria-labelledby="invite-greeting">
          <div className="greeting-block">
            <h1 id="invite-greeting">
              <span className="greeting-hello">Ciao,</span>
              <span className="greeting-name">{name}!</span>
            </h1>
            <div className="greeting-copy">
              <p className="greeting-message">C’è un messaggio per te da Simo</p>
              {message ? <p className="greeting-personal-message">{message}</p> : null}
            </div>
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
        <section
          className={`letter-screen${letterStep !== "choice" ? " is-scheduled" : ""}${letterStep === "schedule" && schedule?.mode === "range" ? " is-date-picker" : ""}${letterStep === "message" ? " is-message" : ""}`}
          aria-labelledby="letter-question"
        >
          {showFold ? <span className="letter-fold" aria-hidden="true" /> : null}
          <div className={`letter-content${letterStep === "schedule" ? " schedule-step" : ""}`}>
            {letterStep === "choice" ? (
              <>
                <p className="letter-to">Per {name}</p>
                <h1 id="letter-question">Questa settimana usciamo?</h1>
                <p className="acceptance-hint">Doppio click per confermare ;)</p>
                <div className="choice-group" aria-label="Scegli una risposta">
                  {(["yes", "no", "maybe"] as const).map((choice) => {
                    const isTrickChoice = choice === "no";
                    const isConverted = choice === "no" && isTricked(choice);
                    const isConfirming = confirmingChoice === choice;

                    return (
                      <div className={`choice-row${isConfirming ? " is-confirming" : ""}`} key={choice}>
                        <button
                          ref={choice === "no" ? noRef : undefined}
                          className={`choice${choice === "no" ? " choice-trick" : " choice-primary"}${isConverted ? " is-converted" : ""}${isConfirming ? " is-confirming choice-confirm" : ""}`}
                          type="button"
                          data-choice={choice}
                          onPointerDown={(event) => prepareTouchChoice(event, choice)}
                          onPointerCancel={() => {
                            ignoredTouchClickRef.current = null;
                            setRevealedChoice((current) => current === choice ? null : current);
                          }}
                          onBlur={() => isTrickChoice && !isConfirming && setNearbyChoice(null)}
                          onClick={() => handleChoiceClick(choice)}
                          aria-label={isConfirming ? `Conferma: ${getChoiceLabel(choice)}` : getChoiceLabel(choice)}
                        >
                          <span
                            className="choice-copy"
                            aria-live={isTrickChoice ? "polite" : undefined}
                            key={isConfirming ? "confirm" : getChoiceLabel(choice)}
                          >
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
                            setRevealedChoice(null);
                            ignoredTouchClickRef.current = null;
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
                {confirmingChoice ? (
                  <p className="trick-hint" aria-live="polite">
                    <span>Confermi la tua scelta!</span>
                    <strong>“{getChoiceLabel(confirmingChoice)}”</strong>
                  </p>
                ) : null}
              </>
            ) : letterStep === "schedule" && schedule ? (
              <>
                <p className="letter-to">Perfetto, {name}</p>
                <h1 id="letter-question">
                  {schedule.mode === "range" ? "Scegli il giorno" : "Ti va questo giorno?"}
                </h1>

                {schedule.mode === "range" ? (
                  <div className="date-choice-flow">
                    <div className="date-choice-grid" aria-label="Scegli il giorno">
                      {dateOptions.map((date) => {
                        const isSelected = selectedDate === date;
                        return (
                          <button
                            className={`date-choice${isSelected ? " is-selected" : ""}`}
                            type="button"
                            data-date={date}
                            aria-pressed={isSelected}
                            onClick={() => chooseDate(date)}
                            key={date}
                          >
                            <span>{formatInviteWeekday(date)}</span>
                            <strong>{formatInviteDayMonth(date)}</strong>
                          </button>
                        );
                      })}
                    </div>

                    {selectedDate ? (
                      <div className="date-confirmation" aria-live="polite" key={selectedDate}>
                        <p>
                          <span>Confermi questo giorno:</span>
                          <strong>“{formatInviteDate(selectedDate)}”</strong>
                        </p>
                        <button className="choice choice-primary choice-confirm" type="button" onClick={openMessageStep}>
                          <span className="choice-copy"><CheckIcon /> Conferma</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="date-confirmation single-date-confirmation">
                    <p>
                      <span>Il giorno proposto è:</span>
                      <strong>“{formatInviteDate(schedule.date)}”</strong>
                    </p>
                    <button className="choice choice-primary choice-confirm" type="button" onClick={openMessageStep}>
                      <span className="choice-copy"><CheckIcon /> Conferma il giorno</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="letter-to">Ultima cosa, {name}</p>
                <h1 id="letter-question">Vuoi lasciarmi un messaggio?</h1>
                <form
                  className="reply-message-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitChoice();
                  }}
                >
                  <div className="reply-message-field">
                    <label htmlFor="reply-message">Il tuo messaggio · facoltativo</label>
                    <textarea
                      id="reply-message"
                      name="message"
                      rows={4}
                      maxLength={MAX_RESPONSE_MESSAGE_LENGTH}
                      placeholder="Scrivi qui…"
                      value={replyMessage}
                      onChange={(event) => {
                        setReplyMessage(event.target.value);
                        setResponseError("");
                      }}
                      aria-describedby="reply-message-help"
                    />
                    <p id="reply-message-help">
                      <span>Arriverà insieme alla tua risposta.</span>
                      <span>{replyMessage.length}/{MAX_RESPONSE_MESSAGE_LENGTH}</span>
                    </p>
                  </div>
                  <button className="choice choice-primary choice-confirm" type="submit">
                    <span className="choice-copy">
                      <CheckIcon /> {replyMessage.trim() ? "Invia risposta" : "Continua senza messaggio"}
                    </span>
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      ) : null}

      {phase === "answered" ? (
        <section className="answer-screen" aria-labelledby="answer-title">
          {submissionStatus === "success" ? <ConfettiBurst /> : null}
          <div className="answer-content">
            <p>
              {submissionStatus === "sending"
                ? "Invio in corso…"
                : submissionStatus === "error"
                  ? "Invio non riuscito"
                  : "Risposta ricevuta"}
            </p>
            <h1 id="answer-title">
              {submissionStatus === "sending"
                ? "Un attimo."
                : submissionStatus === "error"
                  ? "Quasi."
                  : "Lo sapevo :)"}
            </h1>
            <span className="answer-note">
              {submissionStatus === "sending"
                ? "Sto mandando la tua risposta."
                : submissionStatus === "error"
                  ? "La scelta è pronta, manca solo l’invio."
                  : responseDate
                    ? `Ci vediamo ${formatInviteDate(responseDate)}.`
                    : "Ci vediamo questa settimana."}
            </span>
            {responseError ? (
              <>
                <p className="field-error answer-error" role="alert">{responseError}</p>
                <button className="button choice-primary answer-retry" type="button" onClick={() => void submitChoice()}>
                  Riprova invio
                </button>
              </>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
