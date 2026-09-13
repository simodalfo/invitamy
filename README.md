# Invitamy

Un invito personale che si comporta come un piccolo gioco. L'area privata consente a un solo amministratore di inserire un nome, scegliere una foto e generare un link univoco; il destinatario apre una busta animata e scopre la domanda sullo sfondo preparato per lui.

## Avvio locale

1. Installa le dipendenze con `npm install`.
2. Copia `.env.example` in `.env.local`.
3. Imposta una password amministratore lunga, una chiave casuale di almeno 32 caratteri e il token di un archivio Vercel Blob privato.
4. Avvia con `npm run dev` e apri `http://localhost:3000`.

Per questa cartella di sviluppo è già presente un `.env.local` escluso da Git. La password demo locale è `invito-demo` e va sostituita prima della pubblicazione.

## Pubblicazione su Vercel

Configura nel progetto Vercel le variabili segrete `ADMIN_PASSWORD`, `SESSION_SECRET` e `BLOB_READ_WRITE_TOKEN`. I link sono stateless: nome, riferimento alla foto e tema di contrasto vengono cifrati e autenticati nel token con AES-256-GCM. Le foto sono conservate in un archivio Blob privato e vengono consegnate solo dopo la verifica del token dell'invito.

La risposta finale non viene ancora memorizzata. Se si desidera una dashboard con aperture e risposte, il passo successivo è collegare un database e registrare gli eventi.

## Sicurezza

- Cookie di sessione HttpOnly, SameSite Strict e Secure in produzione.
- Sessione firmata con scadenza a 12 ore.
- Confronto password a tempo costante e limite ai tentativi di accesso.
- Controllo same-origin per tutte le richieste che modificano stato.
- Token invito casuale e cifrato; il nome non è leggibile nell'URL.
- Foto compresse nel browser, archiviate come Blob privati e servite da una route che verifica il token cifrato.
- Header di sicurezza, pagine escluse dai motori di ricerca e nessuna telemetria esterna.
