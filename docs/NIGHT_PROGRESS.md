# Avanzamento WordyLand — 24 ottobre 2026

Task esistente, coordinato dall’assistente dot; nessun task sostitutivo o cron creato. Base: `a7514b0`, già su main e pubblicata nel run https://github.com/socialluca89-byte/word/actions/runs/40115086960 secondo la precedente verifica del task. Nessun dato reale degli alunni consultato in questo blocco.

## Blocco 1 — Recupero account adulto

Commit: `7143c7f`, salvato sul ramo remoto work.

Problema: il proprietario non dispone dei dati iniziali di accesso; il recupero attuale richiede un codice. Verificato il provisioning nel repository: la password iniziale casuale non è mostrata; viene salvato un link privato di attivazione nella cartella dati su SiteGround. Non è stata verificata la presenza attuale del file reale: questa sessione non dispone di una connessione SSH diretta configurata; quella del deploy risiede nel runner GitHub.

Realizzato:

- Recupero email opzionale con token casuali da 256 bit, memorizzati solo come hash, scadenza 15 minuti, uso singolo, CSRF e limiti per IP/indirizzo. Risposte generiche per indirizzi registrati e sconosciuti; consegna effettiva non garantita dalla risposta.
- Conferma doppia della password, revoca delle sessioni e dei link pendenti, conservazione di profili e premi. Il browser rimuove il token dall’URL e non lo persiste; se un account è già collegato richiede prima un logout esplicito, così non perde progressi da salvare.
- Interfaccia chiara quando la posta non è attiva. Invio disattivato per impostazione predefinita. Nessun servizio, credenziale o configurazione reale aggiunti; nessuna email reale inviata.
- Diagnostica CLI privata di sola lettura: tre booleani sull’account proprietario e sul file di attivazione. Non legge password, hash o contenuto del link. Provata soltanto con database fittizio.
- Documentazione operativa in ACCOUNT_RECOVERY.md, test API/browser dedicati e inclusione nelle verifiche CI.

Verifiche:

- PASS: tutte le verifiche del job verify (sintassi, bundle, contenuti, apprendimento, premi, PWA, API, accesso, classe, avventure, amministrazione, presenza, ripresa, cache, deploy simulato).
- PASS: nuovo test API email, flusso disattivato, casella fittizia, hash, scadenza, CSRF, link invalidati da cambio password, riuso rifiutato, revoca sessioni, conservazione profilo/codice e limiti anche su indirizzo inesistente.
- PASS: nuovo browser email, richiesta, pulizia URL, nessun token in localStorage, password discordanti, recupero/accesso, logout esplicito, link già usato, viewport 320/390/1360px.
- PASS: browser UX, apprendimento, ripresa, PWA e premi.
- PRESENZA: prima esecuzione fallita per timeout aspettando «Accetta ⚡»; ripetizione isolata PASS. Possibile instabilità non ancora attribuita a una causa. Non dichiarata risolta.
- PASS: browser movimento e accesso, completati dopo PWA e premi.
- NON ESEGUITI: diagnostica su hosting reale, recupero del vero account, invio/consegna reale della posta, nuova pubblicazione. Nessuna password, codice o autorizzazione reale cambiati.

Limite per pubblicazione: la pipeline corrente esegue anche il provisioning proprietario; se l’account mancasse creerebbe nuove credenziali. L’ultima istruzione richiede conferma specifica prima di tale operazione. Questo blocco resta quindi sul ramo work finché non sia verificato in sola lettura lo stato del proprietario o adeguato esplicitamente il provisioning. Non è un diniego automatico degli strumenti.

Intervento minimo: il proprietario verifica dal proprio SiteGround se esiste `.wordyland-data/admin-activation.txt` e usa personalmente il link già presente. Non incollarlo in chat. Se il file manca, predisporre una procedura di recupero assistito da confermare specificamente; non consentire reset dal solo indirizzo email.

## Blocco 2 — Inizializzazione delle scene fuori schermo

Commit: `0eeb497`, salvato sul ramo remoto work.

Problema misurato: la mappa dell’isola si trovava sotto la prima schermata (top 1866px a 390px di larghezza, 1199px a 1360px; viewport alta 844px), ma allocava comunque WebGL e veniva ricostruita dagli aggiornamenti iniziali del profilo.

Correzione in `dist/island.js`: inizializzazione quando la mappa arriva entro 120px dalla finestra, o subito se viene usato un comando della scena. Prima dell’avvio gli aggiornamenti conservano l’ultimo personaggio/progresso senza costruire scene inutili. Navigazione, rotazione, zoom, animazioni e feedback restano disponibili. Il fallback senza IntersectionObserver resta immediato.

Misura ripetibile nel nuovo test `scripts/test-performance-browser.cjs` (browser Chromium locale, movimento ridotto, account ospite sintetico):

| Viewport | Prima: inizializzazioni WebGL all’ingresso | Dopo: inizializzazioni all’ingresso | Mappa prima dello scroll | Mappa dopo lo scroll |
| --- | ---: | ---: | ---: | ---: |
| 390×844 | 4 | 1 | 0 | 1 |
| 1360×844 | 4 | 2 | 0 | 1 |

Sono conteggi di chiamate di inizializzazione WebGL riuscite nel test, non una misura di velocità di rete o una promessa di FPS su telefoni reali. L’inizializzazione della mappa viene differita; il peso scaricato degli asset non è diminuito.

Verifiche:

- PASS: nuovo test performance su mobile/desktop; avvio singolo della mappa allo scroll, calcio interattivo, ritorno all’isola e otto destinazioni.
- PASS: intero job verify rieseguito sul nuovo bundle, inclusi recupero email e deploy simulato.
- PASS: browser UX e personaggi (sei modelli/accessori, kart/calcio/spazio, persistenza ospite/account, secondo dispositivo, fallback senza WebGL).
- MOVIMENTO: prima prova fallita nel confronto screenshot «Pause should freeze world»; ripetizione isolata PASS, inclusi pausa, movimento ridotto, gol, missione e pulizia scene. Instabilità del confronto da approfondire; nessuna protezione o asserzione disattivata.
- Le altre suite browser erano passate nel blocco 1; non ripetute tutte dopo questa modifica circoscritta al caricamento della mappa.
- NON ESEGUITI: misura su telefono fisico, verifica account reale, invio email reale e pubblicazione. Resta applicabile il limite sul provisioning proprietario descritto sopra.

## Blocco 3 — Conservare gli errori dopo la ripresa

Difetto riprodotto: il browser azzerava `questionFailed` quando ridisegnava una domanda; i salvataggi non ricordavano gli errori. Chiudere e riaprire dopo un errore permetteva di contare la correzione come successo autonomo nelle statistiche locali.

Correzione: il server conserva `hadErrors` nel JSON della domanda quando rifiuta una risposta; la ripresa da un altro dispositivo restituisce quel flag. L’ospite salva lo stesso flag con la domanda corrente e lo ripristina alla riapertura. La domanda successiva non eredita gli errori della precedente. Nessuna migrazione distruttiva, nessuna modifica ai saldi o ai premi.

Verifiche:

- PASS: API ripresa con errore → riapertura e secondo dispositivo → correzione; nessun errore trasportato sulla domanda successiva.
- PASS: browser ospite errore → reload → ripresa → risposta corretta; il contatore di successi autonomi resta zero, il salvataggio della domanda successiva è pulito. Passano anche le regressioni già presenti: premi singoli, risposta confermata persa in rete, isolamento profili e sfide riprese con punteggio.
- PASS: sintassi, contenuti, bundle e test API completi rieseguiti. Anche il deploy simulato è passato, inclusi ripristino, cache obsoleta e protezione anti-bot.
- NON ESEGUITI: esercizi di utenti reali e pubblicazione.

Limiti espliciti: `practice.good` sul server continua a rappresentare anche risposte corrette dopo errore; questo blocco non ridefinisce tutta la misura di padronanza. La persistenza degli aiuti resta da implementare e testare. Le missioni già salvate prima della correzione non possono ricostruire errori che non erano stati registrati.

## Coda successiva

1. Completare la persistenza degli aiuti e la distinzione server tra risposte autonome e correzioni; la memoria degli errori alla ripresa è già corretta nel blocco 3.
2. Estendere le misure a telefono fisico e alle altre anteprime; il caricamento differito della mappa è già implementato e misurato nel blocco 2.
3. Riprodurre l’instabilità del test inviti con diagnostica mirata, poi migliorare navigazione/onboarding e verificare nuovamente mobile/desktop.
