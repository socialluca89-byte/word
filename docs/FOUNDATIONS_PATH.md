# Allenamento di base — lotto R2

Consegna finita: 35 parole originali in sei percorsi, non un curriculum inglese completo o una simulazione Cambridge. Le sei parole iniziali e i loro identificatori restano invariati. Anche il campo pubblico `words` contiene ancora quelle sei: le versioni precedenti in cache non ricevono parole che non sanno riprendere; le versioni nuove usano `foundationWords` e i gruppi espliciti. Il client e il server mantengono inoltre un percorso iniziale di fallback se durante un aggiornamento ricevono ancora il catalogo precedente.

| Percorso | Parole | Esempio di frase |
| --- | --- | --- |
| Prime parole | cat, pen, dog, sun, book, red | I have a pen. |
| Il mio corpo | ear, eye, nose, mouth, hand, foot | This is an ear. |
| A scuola | pen, book, pencil, bag, ruler, notebook | I have a notebook. |
| I colori | red, blue, green, yellow, pink, purple | The ball is green. |
| Numeri da 1 a 10 | one, two, three, four, five, six, seven, eight, nine, ten | I see three stars. |
| Saluti e risposte | hello, thanks, yes, no | I say thanks. |

Le parole condivise fra percorsi mantengono un unico progresso. I numeri sono rappresentati da cifre con il significato italiano: questa attività associa numero e scrittura inglese, non misura il conteggio di oggetti. Le traduzioni sono sempre leggibili insieme alle immagini; non si deve dedurre la risposta da un'emoji ambigua. Nella frase finale appare anche la traduzione dell'intera frase.

## Sequenza e continuità

Due parole a sessione: modello → riconoscimento → composizione con tessere → scrittura con supporto facoltativo → una piccola frase. Massimo nove attività; il modello può ridursi solo in base alle risposte autonome ripetute in giorni diversi già previste. Gli aiuti non sono penalizzati. Le opzioni appartengono all'argomento scelto; le sessioni server congelano piano e ordine delle opzioni.

Nei profili registrati resta il ripasso delle difficoltà recenti e si conserva un posto per parole ancora da incontrare. Gli ospiti ruotano secondo le attività confermate nel browser; non hanno uno storico dettagliato degli errori equivalente al report online. Non dichiarare sincronizzazione ospite fra dispositivi o sicurezza atomica fra schede del browser.

Il tasto precedente avvia ancora il percorso iniziale `words` con le stesse sei parole; i nuovi temi usano chiavi `words:<id>`. Nessuna migrazione di account, saldi, classi o permessi. Le vecchie sessioni continuano con il loro piano; gli ospiti ricostruiscono etichette e contenuti da identificatori curati, preservando l'ordine valido delle scelte e gli aiuti salvati.

Con sei temi e tredici blocchi di lettere, tutte le 19 sessioni in pausa restano raggiungibili. Rimosso il taglio ospite alle ultime dieci sessioni che avrebbe perso percorsi non conclusi; si conservano le sessioni valide aperte e una coda di nove concluse. L'API restituisce fino a 32 sessioni attive invece di quattro. Rimangono i limiti temporali esistenti: ripresa entro sette giorni e pulizia server delle sessioni dopo trenta; gli aggregati e gli adesivi non vengono cancellati alla scadenza.

Preposizioni: collegamento agli esercizi spaziali illustrati già presenti, non nuove emoji senza una relazione spaziale verificabile. Presentazioni con nome/età e conversazioni: restano nel tema esistente “Saluti e presentazioni”, raggiungibile da “Tutti gli esercizi”. Le tredici schede, giochi, sfide, avatar, ricompense e navigazione restano disponibili. Questo lotto non introduce un secondo corso completo di conversazione o di grammatica.

## Audio, privacy e premi

Si usano solo le voci locali del dispositivo già previste. Senza voce inglese, il percorso dichiara modalità lettura. Le parole intere non sono fonemi; lo spelling lettera per lettera richiede il controllo adulto dei nomi con la voce scelta. Nessun microfono, servizio esterno o nuovo invio di dati. I test audio simulati non attestano la qualità sul dispositivo reale.

Stessi tre adesivi finiti, senza monete, XP, classifiche, timer o penalità. Il report privato mostra attività effettive per parola e competenza solo per profili già autorizzati; nessun collegamento genitore–alunno nuovo viene creato.

## Verifiche

- `scripts/test-training.py`: 35 parole e frasi coerenti, tutte le parole raggiungibili nei temi, opzioni corrette, ripresa e aiuto su secondo dispositivo, replay idempotente, 19 sessioni attive, report privato e snapshot invariati di account/giochi/classe/saldi.
- `scripts/test-foundations-browser.cjs`: sei temi, vecchia sessione e ordine conservati, 19 percorsi ospite non persi, otto tessere di notebook con tastiera/annulla, errore/aiuto/pausa/reload, frase tradotta, etichette alterate non eseguite, schermi 320/390/768/1360 e ritorno a preposizioni/tutte le tredici lezioni, fallback con catalogo precedente.
- Regressioni: tutte le 22 suite browser preesistenti passate localmente durante l’incremento, oltre alla nuova foundations (23 totali). La verifica completa e la CI devono precedere ogni dichiarazione di pubblicazione.
- Screenshot `docs/review/foundations-390.png`: anteprima locale con dati sintetici, ispezionata visivamente. Non è una prova di deploy.
- Costo gzip rilevato rispetto al lotto R1: training.json 969→2021 byte; training.js 11910→12497 byte; pwa.css 7335→7438 byte. Nessuna nuova libreria o chiamata esterna.

## Esito del rilascio e dipendenza esterna

Candidato su main: **347359139b53904c13fad399e871d462062561ce**. [Run40404823239](https://github.com/socialluca89-byte/word/actions/runs/40404823239): verify PASS e tutte23suitebrowser PASS; deploy FALLITO al preflight pubblico. [Job121862065796](https://github.com/socialluca89-byte/word/actions/runs/40404823239/job/121862065796), fase deploy21:34:35→21:34:36UTC26ottobre2026.

Messaggi pubblici: “SiteGround anti-bot verification intercepted the health endpoint (HTML instead of JSON)” e “Public health preflight failed; no SSH connection, upload, install or cache purge was attempted.” Richiesta generata dallo script: `GET https://wordyland.eu/api.php?action=health&verify-40404823239-<timestamp>`. Le annotazioni pubbliche non espongono lo stato HTTP del runner o il timestamp esatto; non inventarli. Il preflight non ritenta e precede il caricamento delle chiavi SSH. Non sono avvenuti installazione o rollback.

Controllo indipendente ordinario alle21:35:51UTC: `/`, `/index.html`, health e cinque risorse versionate,8URL totali HTTP200, zerochallenge, hash corrispondenti a **b3ca230ff76ee708bde4d2d760e174e012bfb046**, health ready=true/database=sqlite. Il lotto35parole NON è online. Il rifiuto del runner non dimostra un disservizio dei visitatori; la normale lettura da questo ambiente non dimostra che il runner sia stato sbloccato.

Passo esterno minimo: sullo specifico hosting **WordyLand** far verificare a SiteGround il challenge di questo endpoint/orario/run per il controllo GitHubActions autorizzato, tramite l'assistenza già coordinata. Richiedere una soluzione circoscritta mantenendo TLS e protezioni, senza nuovi accessi o credenziali. Non disabilitare WAF/anti-bot, cambiareIP/runner, superareCAPTCHA, toglierehealth o usare un caricamento alternativo. Nessun nuovo ticket duplicato è stato aperto. Senza evidenza pertinente della risoluzione non viene avviato un altro deploy.

Correzione successiva solo **work**: nell'ospite le opzioni delle parole mettevano sempre la risposta corretta al primo posto. Il nuovo piano ora mescola le tre opzioni una volta e mantiene l'ordine alla ripresa, senza alterare i vecchi piani validi. Testbrowser con due generatori casuali deterministici verifica posizioni diverse e ordine stabile al reload, evitando test probabilistici. Questa rifinitura NON è nel candidato3473591 e non ha avuto una secondaCI o un tentativo di deploy. Sul codice work definitivo sono passati nuovamente tutti57controlli verify e la suitefoundations estesa con le posizioni deterministiche; la regressione browsertraining è ricontrollata separatamente.

Durante lo sviluppo due aspettative dei nuovi test sono state corrette: il tema scuola con parole già allenate richiede una rotazione che tenga conto dello storico, non necessariamente tre sessioni; la vista preposizioni mostra correttamente tre schede, mentre “Tutti gli esercizi” ne mostra tredici. Non sono stati eliminati controlli o aggiunti retry per far passare queste verifiche. L’ispezione visiva ha inoltre evidenziato e corretto la spaziatura da lettere applicata inizialmente ai pulsanti dei temi.
