# Invitamy

Un invito personale che si comporta come un piccolo gioco. L'area privata consente a un solo amministratore di inserire un nome e generare un link univoco; il destinatario apre una busta animata e scopre la domanda.

## Avvio locale

1. Installa le dipendenze con `npm install`.
2. Copia `.env.example` in `.env.local`.
3. Imposta una password amministratore lunga e una chiave casuale di almeno 32 caratteri.
4. Avvia con `npm run dev` e apri `http://localhost:3000`.

Per questa cartella di sviluppo è già presente un `.env.local` escluso da Git. La password demo locale è `invito-demo` e va sostituita prima della pubblicazione.

## Pubblicazione su Vercel

Configura nel progetto Vercel le variabili segrete `ADMIN_PASSWORD` e `SESSION_SECRET`. I link sono stateless: il nome viene cifrato e autenticato nel token con AES-256-GCM, quindi non serve un database per questa prima versione e il link funziona su qualsiasi istanza serverless.

La risposta finale non viene ancora memorizzata. Se si desidera una dashboard con aperture e risposte, il passo successivo è collegare un database e registrare gli eventi.

## Sicurezza

- Cookie di sessione HttpOnly, SameSite Strict e Secure in produzione.
- Sessione firmata con scadenza a 12 ore.
- Confronto password a tempo costante e limite ai tentativi di accesso.
- Controllo same-origin per tutte le richieste che modificano stato.
- Token invito casuale e cifrato; il nome non è leggibile nell'URL.
- Header di sicurezza, pagine escluse dai motori di ricerca e nessuna telemetria esterna.
