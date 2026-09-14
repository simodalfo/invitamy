# Invitamy

Un invito personale che si comporta come un piccolo gioco. L'area privata consente a un solo amministratore di inserire un nome, aggiungere una frase personale, scegliere un giorno o un periodo, aggiungere facoltativamente una foto e generare un link univoco. Il destinatario conferma il giorno proposto oppure ne sceglie uno tra quelli disponibili.

## Avvio locale

1. Installa le dipendenze con `npm install`.
2. Copia `.env.example` in `.env.local`.
3. Imposta una password amministratore lunga, una chiave casuale di almeno 32 caratteri e il token di un archivio Vercel Blob privato.
4. Per ricevere le risposte, aggiungi il token del bot Telegram e il Chat ID privato.
5. Avvia con `npm run dev` e apri `http://localhost:3000`.

Per questa cartella di sviluppo è già presente un `.env.local` escluso da Git. La password demo locale è `invito-demo` e va sostituita prima della pubblicazione.

## Pubblicazione su Vercel

Configura nel progetto Vercel le variabili segrete `ADMIN_PASSWORD`, `SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN`, `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`. I link sono stateless: nome, disponibilità, riferimento alla foto e tema di contrasto vengono cifrati e autenticati nel token con AES-256-GCM. Le foto sono conservate in un archivio Blob privato e vengono consegnate solo dopo la verifica del token dell'invito.

La risposta non viene conservata in un database: nome e giorno vengono inviati direttamente alla chat Telegram configurata.

## Sicurezza

- Cookie di sessione HttpOnly, SameSite Strict e Secure in produzione.
- Sessione firmata con scadenza a 12 ore.
- Confronto password a tempo costante e limite ai tentativi di accesso.
- Controllo same-origin per tutte le richieste che modificano stato.
- Token invito casuale e cifrato; il nome non è leggibile nell'URL.
- Foto compresse nel browser, archiviate come Blob privati e servite da una route che verifica il token cifrato.
- Header di sicurezza, pagine escluse dai motori di ricerca e nessuna telemetria esterna.
