# Chiusura tecnica WordyLand — 27 ottobre 2026

Revisione cumulativa del codice `6ba13cfa84b9a501832601e03e9942f22a73af6e` rispetto all'ultimo live verificato `b3ca230ff76ee708bde4d2d760e174e012bfb046`. Chiusura senza nuove funzionalità, deploy, comunicazioni, dati di alunni reali o modifiche ad account/hosting. I documenti successivi a 6ba13cf non modificano l'applicazione.

## Versioni e pubblicazione

Main e work riconciliati in sola lettura prima della chiusura: main `347359139b53904c13fad399e871d462062561ce`, work `6ba13cfa84b9a501832601e03e9942f22a73af6e`. Nessun merge/main push o dispatch effettuato.

L'ultimo live dimostrato resta b3ca230: [rilascio 40399687794](https://github.com/socialluca89-byte/word/actions/runs/40399687794), ultimo controllo indipendente del 26 ottobre alle 21:56:19 UTC, otto URL HTTP 200/hash corrispondenti/health SQLite pronto. Non è un controllo live rinnovato oggi.

Il candidato main 3473591 ha passato verify e 23 suite browser in [40404823239](https://github.com/socialluca89-byte/word/actions/runs/40404823239). Il job deploy si è fermato il 26 ottobre fra 21:34:35 e 21:34:36 UTC al `public-health-preflight`, risposta HTML con `sgcaptcha` invece del JSON atteso. I dati pubblici disponibili **non riportano lo status HTTP esatto, gli header o il corpo completo**: non si deducono 200/403/429 né durata/regola/IP responsabili. Non è prova che i visitatori non possano usare il sito.

SSH, caricamento chiave, backup, upload, installazione, marcatore, cache purge e rollback sicuramente non avviati da quel tentativo. Nessun retry, cambio runner/IP, upload alternativo o indebolimento di controlli. [Bozza tecnica SiteGround](SITEGROUND_REQUEST_WORDYLAND.md) non inviata; autorizzazione specifica pendente.

## Revisione cumulativa

Il confronto comprende 40 file prima di questa chiusura documentale. Applicazione modificata: accounts.js, index.html, offline.html/offline.js, pwa.css/pwa.js, sw.js, training.js/training.json/training.php. Bundle pubblico sempre 39 file; cache pubblica da nove a dieci asset, aggiungendo soltanto training.json. API principali, piattaforma, classi, arena, community e script reali di deploy non cambiano rispetto a b3ca230.

| Area | Esito verificato | Limite esplicito |
| --- | --- | --- |
| Isolamento profili | Nuove azioni phonics autenticazione/CSRF/verbi rigorosi e controllo ownedProfile; report adulti/admin solo propri profili, alunno solo proprio percorso. Fixture straniere/admin estraneo rifiutate | Nessun collegamento nuovo genitore–alunno separato. Nessuna verifica di ruoli/account reali |
| Dati dei bambini | Tabelle additive con FK; report di attività guidate, non diagnosi. Risposte errate testuali non salvate nel nuovo SQLite; niente microfono o nuovo invio a provider | Nessuna garanzia didattica/acustica derivata dai mock |
| Cache offline | Allowlist dieci asset pubblici, stessa origine, GET, query controllate, installazione senza credenziali; API/PHP/POST/documenti privati esclusi. Navigazione online non memorizzata come account | Primo caricamento con rete necessario; fonetica autonoma non disponibile al cold-start offline |
| Ospite locale | Namespace offline e phonics separati dai profili online; nessuna importazione/sync automatica. Fallimento quota non accredita avanzamento | Browser condiviso senza isolamento/cifratura; salva anche risposta parziale fino a 30 lettere e tessere. Nessuna garanzia atomica fra schede concorrenti |
| Storici | Vecchie sei parole in words conservate; 35 nuove in foundationWords. Piani/ordine congelati, protocollo phonics separato. Test con storico non vuoto e adesivo già guadagnato | Cambi futuri della sequenza richiedono migrazione esplicita; non reinterpretare passi vecchi |
| Aiuti e ripresa | CAST numerico corregge monotonicità SQLite: aiuto 2 seguito da 1 su altro dispositivo non scende. Deduplica step/nonce, conservazione sessioni e isolamento verificati | Nessuna riparazione retroattiva di aiuti eventualmente persi dichiarata |
| Premi | Tre adesivi finiti preservati; contatori offline/phonics separati da XP, monete, inventario e classifiche. Replay non accredita un secondo completamento dello stesso step; giochi esistenti conservano premi | Nessun nuovo premio trasferibile o cambiamento dell'economia |
| Accessi | Correzione UI mantiene conferma cambio password mentre autosave aggiorna il messaggio globale; endpoint e permessi invariati | Non risolve né verifica Luca, trasporto email o consegna reale |
| Prestazioni | Soglia 5 secondi invariata, osservatori attesi e diagnostica caricamento. Controllo negativo CSS fallisce correttamente senza mascherare errore | Vecchio timeout isolato non spiegato retroattivamente; nessuna garanzia sul tablet |

Non sono emerse ulteriori regressioni riproducibili nella revisione finale. Correzione di questa chiusura: resa precisa la descrizione privacy in OFFLINE_FOUNDATIONS.md, che prima affermava in modo assoluto assenza di nomi pur conservando una risposta libera parziale. Nessuna funzione o salvataggio rimosso per modificare tale descrizione.

## Prove riproducibili

- **58 controlli verify, tutti PASS**, rieseguiti sul codice invariato il 27 ottobre e conclusi alle 00:02:14 UTC: sintassi JS/PHP/shell, bundle e cataloghi, API/accessi/recupero mock/classi/presenza/ripresa/autonomia/ripasso/report, training/phonics/progressione lettere e deploy finto dei 39 file. Il deploy finto non contatta né modifica il server reale.
- **26 suite browser, tutte PASS** nella validazione del codice 6ba13cf: duel-resilience, compatibility, ux, learning, resume, presence, pwa, rewards, motion, access, email, performance, navigation, autonomy, review, wardrobe, parent-summary, tiles, wallet, training, spelling, letter-progression, foundations, offline-training, offline-letters, phonics. Esiti controllati dai codici di uscita, nessun retry automatico.
- **Cinque suite rieseguite in chiusura, tutte exit 0** entro le 00:05:25 UTC: pwa, offline-training, offline-letters, phonics, access. Coprono cache privata esclusa, quota, bozze/tessere, ripresa/doppio click, voce simulata e cambio voce, dati precedenti, report separati e conferma password concorrente con autosave.
- Ambiente locale: PHP 8.4.27, Node 24.19, Playwright 1.62.1, Chromium di sistema 154. Non è nuova CI sul Chromium 151 del workflow. Dati sintetici; nessun invio email reale, account reale o voce di bambino.
- Ultima prova prestazioni del lotto codice: DOM 1669.8 ms/load 1796.3 ms, soglia 5000 ms; cinque precedenti campioni 1.97–2.37 secondi e controllo negativo separati. Non nuova misura live o del dispositivo della famiglia.

Comandi: i controlli del job verify in `.github/workflows/deploy.yml`; `bash scripts/test-browser.sh NOME` avvia soltanto PHP/SQLite temporanei e copie del bundle. Log di sessione in `/tmp/wordyland-phonics-verify-20261026.log`, `/tmp/wordyland-phonics-status-20261026.json`, `/tmp/wordyland-phonics-regressions/` e `/tmp/wordyland-closeout/`; sono prove locali, non link pubblici o nuovi run CI.

## Consegna finita e limiti

Work pronto/testato: 35 parole/sei temi, shuffle ospite persistente, offline parole e 26 lettere IT/EN, conferma password persistente, diagnostica prestazioni, fonetica guidata quattro gruppi/11 parole/24 attività e aiuti numerici corretti. Nessuna parte successiva a b3ca230 viene qui dichiarata online.

Restano cinque passi, dettagliati senza duplicazioni in [REQUIREMENTS_REMAINING.md](REQUIREMENTS_REMAINING.md): risoluzione SiteGround e rilascio verificato; collegamento sicuro genitore–alunno; estrazione locale foto/PDF con anteprima; copertura didattica esplicita e audio fonemico revisionato; validazioni reali audio/email/recupero Luca con le autorizzazioni necessarie. Sync privata e adattività offline sono estensioni escluse, non capacità già disponibili.

Anteprime sintetiche del codice, non live: [parole](review/foundations-390.png), [offline parole](review/offline-training-390.png), [offline lettere](review/offline-letters-390.png), [fonetica guidata](review/phonics-390.png). Nessun curriculum Cambridge completo, valutazione di pronuncia o successo d'esame dichiarato. Vecchio tablet rimandato e Caffè Oro fuori dal task.
