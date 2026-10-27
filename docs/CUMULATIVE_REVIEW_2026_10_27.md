> Revisione precedente alla pubblicazione: il codice qui discusso è ora online in3c661f5, verificato dal run40476917297. [Rilascio conclusivo](RELEASE_2026_10_27.md); le indicazioni solo-work/liveb3ca230 sotto sono cronologia.

# Revisione cumulativa — ultimo lotto foto/PDF

Questa revisione chiude soltanto il lotto corrente, non tutta WordyLand. Confronto funzionale con ultimo live verificato `b3ca230`, conservando i checkpoint tecnici precedenti. Sviluppo successivo soltanto su work; main3473591 non coincide col sito verificato. Nessun deploy, ticket, email, account reale o intervento sulla sicurezza hosting.

## Separazione delle consegne

| Stato | Perimetro verificabile |
| --- | --- |
| Ultimo live verificato | b3ca230: giochi/schede/mondi, classi/sfide/presenza/ripresa, avatar/guardaroba/premi, segnalazioni, logout e flussi account già implementati, PWA/ripasso pubblico, lettere IT/EN e alternative2→3→4. Rilascio40399687794; ultimo controllo pubblico26ottobre21:56:19UTC, non aggiornato oggi |
| Main ma non live | 3473591:35parole/sei percorsi; verify+23browser passati, preflight run40404823239 intercettato primaSSH. Nessuna prova di nuova pubblicazione |
| Work soltanto | Rifiniture posizioni ospite, offline parole/lettere, feedback password persistente, diagnostica prestazioni, primo percorso fonetico guidato, PDF testuali/foto/OCR stampato e ora rendering/OCR di pagina PDF scelta. Nessuna preparazione Cambridge completa né verifica reale audio/email/recupero proprietario |
| Codice ancora mancante | R3collegamento sicuro genitore–alunno di account separati; R6inventario esplicito competenze e copertura Cambridge; ulteriori set fonetici. Nessun accesso reale implicito. Batch/unione PDF, crop/rotazione e sync/adattività offline sono estensioni escluse |
| Validazione/materiali/autorizzazione | Materiali e dispositivi reali, didattica/audio fonemico revisionato, invio reale email e recuperoLuca autorizzati; risoluzione SiteGround con prova pertinente e autorizzazione per comunicazioni ancora pendente |

## Controlli cumulativi di privacy e compatibilità

- Nessun ampliamento delle autorizzazioni dei profili: API account/classi/community/arena non modificate dal lotto. Report privati già sviluppati soltanto sui profili posseduti; test negativi sui profili estranei conservati. Non sono stati letti alunni reali o conteggi degli iscritti.
- Lettura materiali locale e salvataggio solo dopo revisione/proposta/conferma adulte. File originale completo allegato soltanto con opt-in; il canvas PDF di una pagina non viene salvato o inviato automaticamente. Test senza account: zeroAPI, nessun POST e niente documento/testo negli URL o in richieste terze.
- Worker/render cancellabili; riferimento al task, epoch e proprietà del profilo impediscono risposte tardive su un altro editor. PDFworker chiuso prima di OCRworker, canvas azzerato; nessuna promessa di limite assoluto RAM.
- Cache pubblica sempre10asset, bundle47file, librerie ufficiali immutate con checksum/licenze conservati. Nessun documento/API/risultato privato aggiunto a CacheStorage. Lettura OCR non dichiarata offline.
- Storici non vuoti, sei parole legacy, sessioni/opzioni congelate e tre adesivi originari conservati. Tabelle fonetiche additive e profili isolati, aiuti numerici monotoni; OCR non registra una risposta didattica o attribuisce punti. Giochi precedenti continuano le loro ricompense.
- L'ospite offline conserva anche risposte parziali nel browser condiviso: non è isolamento tra persone dello stesso dispositivo, né sincronizzazione/importazione automatica in account. Nessuna nuova raccolta di voce o credenziali.

## Difetto nuovo rilevato e corretto

Il controllo negativo aggiunto al modulo adulto ha riprodotto una regressione UI: il CSS delle etichette rendeva visibile il selettore pagina anche con attributo hidden, senza PDF selezionato. Correzione circoscritta `.materialImport [hidden]{display:none!important}`; nessuna modifica ai mondi o alle regole di visibilità degli altri componenti. Il test ora controlla selettore nascosto prima del file e dopo scelta di una foto. Dopo questa correzione viene eseguita nuovamente la sequenza completa verify/browser, senza cancellare il fallimento di riproduzione.

## Community: prova isolata distinta dalla cumulativa

Il timeout register5s del precedente lotto ce7a93d non è stato riprodotto nella prova isolata corrente (register0.386/0.348s, massimo recover0.624s), né nel primo verify cumulativo corrente (register0.310/0.298s, massimo login0.328s). Delta di throttling misurato sulle richieste0in questi contesti. Dopo la correzione CSS, il verify finale cumulativo completo è passato con register0.377/0.378s, massimo class-register0.397s e deltaCPU0: il pass isolato non viene usato al posto del cumulativo.

Mancano misure sufficienti del vecchio singolo evento per dimostrare la causa: non si dichiara un bug API risolto né si attribuisce con certezza al carico. Timeout5s e aspettative invariati, nessun retry automatico. La diagnostica del test misura azione/metodo/status/durata/deltaCPU senza corpi, nomi, codici o token. Non tocca il server di produzione. La riproduzione negativa UI è un difetto distinto, non una spiegazione del timeout community.

**Esito finale sul codice dopo la correzione UI: 64verify e29suitebrowser PASS**, in una sequenza senza prove concorrenti o retry e con prestazioni per ultime. [PDF_SCAN_VERIFICATION.json](PDF_SCAN_VERIFICATION.json) riporta i comandi e i tre contesti community. Campioni finali: PDF1437ms ehome2336.5ms/soglia5000ms, non benchmark reali. Per il prodotto e i soli passi residui fare riferimento a [REQUIREMENTS_REMAINING.md](REQUIREMENTS_REMAINING.md) e [PDF_SCANNED_IMPORT.md](PDF_SCANNED_IMPORT.md). Nessun risultato locale prova che il codice sia live.
