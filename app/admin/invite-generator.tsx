"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  formatInviteDate,
  formatInviteDayMonth,
  formatInviteWeekday,
  inviteScheduleDates,
  MAX_INVITE_RANGE_DAYS,
  type InviteSchedule,
  normalizeInviteSchedule,
} from "@/lib/invite-schedule";
import { MAX_PERSONAL_MESSAGE_LENGTH } from "@/lib/invite-message";

type GeneratedInvite = { url: string; name: string };
type BackgroundTone = "light" | "dark";
type ScheduleMode = InviteSchedule["mode"];
type PreparedPhoto = {
  blob: Blob;
  previewUrl: string;
  tone: BackgroundTone;
};

const maxPhotoBytes = 4_000_000;

function shiftDate(value: string, days: number) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function loadPhoto(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("photo decode failed"));
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function detectTone(canvas: HTMLCanvasElement): BackgroundTone {
  const sample = document.createElement("canvas");
  sample.width = 24;
  sample.height = 24;
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) return "dark";

  context.drawImage(canvas, 0, 0, sample.width, sample.height);
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
  let luminance = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    const red = pixels[index] * alpha + 255 * (1 - alpha);
    const green = pixels[index + 1] * alpha + 255 * (1 - alpha);
    const blue = pixels[index + 2] * alpha + 255 * (1 - alpha);
    luminance += (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  }

  return luminance / (pixels.length / 4) < 0.56 ? "dark" : "light";
}

async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (file.size > 25_000_000) throw new Error("photo too large");

  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await loadPhoto(sourceUrl);
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas unavailable");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const tone = detectTone(canvas);
    let blob: Blob | null = null;

    for (const quality of [0.82, 0.7, 0.58]) {
      blob = await canvasBlob(canvas, "image/webp", quality);
      if (blob && blob.size <= maxPhotoBytes) break;
    }

    if (!blob) blob = await canvasBlob(canvas, "image/jpeg", 0.76);
    if (!blob || blob.size > maxPhotoBytes) throw new Error("compressed photo too large");

    return { blob, previewUrl: URL.createObjectURL(blob), tone };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function InviteGenerator() {
  const [name, setName] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("single");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recommendedDates, setRecommendedDates] = useState<string[]>([]);
  const [minimumDate, setMinimumDate] = useState("");
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [invite, setInvite] = useState<GeneratedInvite | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Creo il link…");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const earliestRangeEnd = shiftDate(startDate, 1) || minimumDate;
  const latestRangeEnd = shiftDate(startDate, MAX_INVITE_RANGE_DAYS - 1) || undefined;
  const normalizedRange = normalizeInviteSchedule({ mode: "range", startDate, endDate });
  const rangeDateOptions = normalizedRange?.mode === "range" ? inviteScheduleDates(normalizedRange) : [];

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    setMinimumDate(localDate.toISOString().slice(0, 10));
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setPreparingPhoto(true);

    try {
      const prepared = await preparePhoto(file);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = prepared.previewUrl;
      setPhoto(prepared);
      setInvite(null);
    } catch {
      setError("Non riesco a leggere questa foto. Provane una in formato JPG, PNG o HEIC.");
    } finally {
      setPreparingPhoto(false);
    }
  }

  function clearPhoto() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPhoto(null);
    setInvite(null);
    setError("");
  }

  function changeScheduleMode(mode: ScheduleMode) {
    setScheduleMode(mode);
    if (mode === "single") setRecommendedDates([]);
    setInvite(null);
    setError("");
  }

  function toggleRecommendedDate(date: string) {
    setRecommendedDates((current) => (
      current.includes(date)
        ? current.filter((currentDate) => currentDate !== date)
        : [...current, date].sort()
    ));
    setInvite(null);
    setError("");
  }

  async function generateInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCopied(false);

    const schedule = normalizeInviteSchedule(
      scheduleMode === "single"
        ? { mode: "single", date: singleDate }
        : { mode: "range", startDate, endDate, recommendedDates },
    );

    if (!schedule) {
      setError(
        scheduleMode === "single"
          ? "Scegli il giorno dell’invito."
          : `Scegli un periodo da 2 a ${MAX_INVITE_RANGE_DAYS} giorni.`,
      );
      return;
    }

    setLoading(true);

    try {
      let backgroundPath: string | undefined;

      if (photo) {
        setLoadingLabel("Salvo la foto…");
        const uploadForm = new FormData();
        const extension = photo.blob.type === "image/jpeg" ? "jpg" : photo.blob.type === "image/png" ? "png" : "webp";
        uploadForm.append("file", photo.blob, `sfondo-invito.${extension}`);

        const uploadResponse = await fetch("/api/backgrounds", {
          method: "POST",
          body: uploadForm,
        });
        const uploadResult = (await uploadResponse.json()) as { pathname?: string; error?: string };

        if (uploadResponse.status === 401) {
          window.location.assign("/login");
          return;
        }

        if (!uploadResponse.ok || !uploadResult.pathname) {
          setError(uploadResult.error ?? "Non siamo riusciti a salvare la foto. Riprova.");
          return;
        }

        backgroundPath = uploadResult.pathname;
      }

      setLoadingLabel("Creo il link…");
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          schedule,
          ...(personalMessage.trim() ? { message: personalMessage } : {}),
          ...(backgroundPath && photo ? { backgroundPath, backgroundTone: photo.tone } : {}),
        }),
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
      setLoadingLabel("Creo il link…");
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
        </div>

        <div className="field-group">
          <label htmlFor="invite-message">Messaggio personale · facoltativo</label>
          <textarea
            id="invite-message"
            name="message"
            rows={3}
            maxLength={MAX_PERSONAL_MESSAGE_LENGTH}
            placeholder="Una frase che capirà solo questa persona"
            value={personalMessage}
            onChange={(event) => {
              setPersonalMessage(event.target.value);
              setInvite(null);
              setError("");
            }}
            aria-describedby="message-help"
          />
          <p className="field-help field-help-count" id="message-help">
            <span>Comparirà subito dopo il saluto.</span>
            <span>{personalMessage.length}/{MAX_PERSONAL_MESSAGE_LENGTH}</span>
          </p>
        </div>

        <fieldset className="schedule-fieldset">
          <legend>Quando?</legend>
          <div className="schedule-mode" role="group" aria-label="Tipo di data">
            <button
              type="button"
              aria-pressed={scheduleMode === "single"}
              onClick={() => changeScheduleMode("single")}
            >
              Giorno preciso
            </button>
            <button
              type="button"
              aria-pressed={scheduleMode === "range"}
              onClick={() => changeScheduleMode("range")}
            >
              Più giorni
            </button>
          </div>

          {scheduleMode === "single" ? (
            <div className="field-group schedule-fields">
              <label htmlFor="invite-date">Giorno dell’invito</label>
              <input
                id="invite-date"
                name="date"
                type="date"
                min={minimumDate || undefined}
                value={singleDate}
                onChange={(event) => {
                  setSingleDate(event.target.value);
                  setInvite(null);
                  setError("");
                }}
                required
              />
              <p className="field-help">Chi riceve il link potrà confermarlo.</p>
            </div>
          ) : (
            <div className="date-range-grid">
              <div className="field-group">
                <label htmlFor="invite-start-date">Dal</label>
                <input
                  id="invite-start-date"
                  name="startDate"
                  type="date"
                  min={minimumDate || undefined}
                  value={startDate}
                  onChange={(event) => {
                    const nextStartDate = event.target.value;
                    const nextEarliestEnd = shiftDate(nextStartDate, 1);
                    const nextLatestEnd = shiftDate(nextStartDate, MAX_INVITE_RANGE_DAYS - 1);
                    setStartDate(nextStartDate);
                    if (
                      endDate
                      && (endDate < nextEarliestEnd || endDate > nextLatestEnd)
                    ) {
                      setEndDate("");
                    }
                    setRecommendedDates([]);
                    setInvite(null);
                    setError("");
                  }}
                  required
                />
              </div>
              <div className="field-group">
                <label htmlFor="invite-end-date">Al</label>
                <input
                  id="invite-end-date"
                  name="endDate"
                  type="date"
                  min={earliestRangeEnd || undefined}
                  max={latestRangeEnd}
                  value={endDate}
                  onChange={(event) => {
                    const nextEndDate = event.target.value;
                    setEndDate(nextEndDate);
                    setRecommendedDates((current) => current.filter(
                      (date) => date >= startDate && date <= nextEndDate,
                    ));
                    setInvite(null);
                    setError("");
                  }}
                  required
                />
              </div>
              <p className="field-help">Fino a {MAX_INVITE_RANGE_DAYS} giorni tra cui scegliere.</p>
              {rangeDateOptions.length ? (
                <div className="recommended-picker">
                  <div className="recommended-picker-copy">
                    <strong>Giorni consigliati · facoltativo</strong>
                    <span id="recommended-days-help">Tocca quelli che preferisci.</span>
                  </div>
                  <div className="recommended-days-grid" role="group" aria-describedby="recommended-days-help">
                    {rangeDateOptions.map((date) => {
                      const isRecommended = recommendedDates.includes(date);

                      return (
                        <button
                          type="button"
                          aria-label={`${formatInviteDate(date)}${isRecommended ? ", consigliato" : ""}`}
                          aria-pressed={isRecommended}
                          onClick={() => toggleRecommendedDate(date)}
                          key={date}
                        >
                          <span>{formatInviteWeekday(date)}</span>
                          <strong>{formatInviteDayMonth(date)}</strong>
                          {isRecommended ? <small>Consigliato</small> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </fieldset>

        <div className="field-group">
          <label htmlFor="invite-photo">Foto di sfondo · facoltativa</label>
          <input
            className="visually-hidden"
            id="invite-photo"
            name="photo"
            type="file"
            accept="image/*"
            onChange={selectPhoto}
            disabled={preparingPhoto || loading}
          />
          <label
            className={`photo-picker${photo ? ` has-preview on-${photo.tone}` : ""}`}
            htmlFor="invite-photo"
            aria-busy={preparingPhoto}
          >
            {photo ? (
              <span className="photo-preview" style={{ backgroundImage: `url(${JSON.stringify(photo.previewUrl)})` }}>
                <span className="photo-preview-shade" aria-hidden="true" />
                <span className="photo-preview-title">Ciao, {name.trim() || "tu"}!</span>
                <span className="photo-change">Cambia foto</span>
              </span>
            ) : (
              <span className="photo-empty">
                <span aria-hidden="true">＋</span>
                <strong>{preparingPhoto ? "Preparo la foto…" : "Scegli una foto"}</strong>
                <small>Oppure usa lo sfondo azzurro</small>
              </span>
            )}
          </label>
          <p className="field-help">Se la salti, l’invito userà lo sfondo azzurro sfumato.</p>

          {photo ? (
            <div className="tone-control" role="group" aria-label="Colore del testo sulla foto">
              <span>Testo sulla foto</span>
              <div>
                <button
                  type="button"
                  aria-pressed={photo.tone === "dark"}
                  onClick={() => setPhoto((current) => current ? { ...current, tone: "dark" } : current)}
                >
                  Chiaro
                </button>
                <button
                  type="button"
                  aria-pressed={photo.tone === "light"}
                  onClick={() => setPhoto((current) => current ? { ...current, tone: "light" } : current)}
                >
                  Scuro
                </button>
              </div>
            </div>
          ) : null}

          {photo ? (
            <button className="text-button photo-remove" type="button" onClick={clearPhoto}>
              Usa lo sfondo predefinito
            </button>
          ) : null}
        </div>

        {error ? <p className="field-error" id="generator-error" role="alert">{error}</p> : null}

        <button
          className="button button-primary"
          type="submit"
          disabled={
            loading
            || preparingPhoto
            || !name.trim()
            || (scheduleMode === "single" ? !singleDate : !startDate || !endDate)
          }
        >
          {loading ? loadingLabel : "Genera link"}
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
