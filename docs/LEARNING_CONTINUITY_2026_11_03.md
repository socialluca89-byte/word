# Continuità dell'allenamento e delle festività — 3 novembre 2026

Questo lotto modifica il codice candidato, non costituisce una prova di pubblicazione. Il coordinatore verifica bundle, CI e versione online sul commit integrato. I test descritti qui usano esclusivamente account, documenti e database sintetici locali.

## Ripasso fra attività esistenti

`practiceReviewRows()` unisce in sola lettura le difficoltà delle missioni classiche e le osservazioni dell'Allenamento. Restituisce la provenienza `missions`, `training` o entrambe, senza copiare risposte, aiuti, contatori, crediti, monete o XP fra sistemi. Il riepilogo adulto conserva i totali delle missioni e il suo `scope` precedente; i nuovi campi additivi `reviewScope` e `reviewSources` chiariscono la provenienza del ripasso.

Il ponte dell'Allenamento accetta soltanto gli identificatori esatti delle parole curate in `training.json`, incluse quelle Classroom: non equipara automaticamente `bag` a `bookbag`, né `rubber` a `eraser`. Considera esclusivamente `spelling.recall`, non deduce la capacità di scrivere da riconoscimento, composizione guidata, nomi delle lettere, lettura o ascolto. Una recall attualmente sospesa con errore o aiuto resta candidata al ripasso.

Per gli aggregati giornalieri considera le difficoltà degli ultimi sette giorni UTC, esclusi giorni futuri. Un nuovo errore non viene nascosto dai successi precedenti: servono tre recall autonome registrate in giornate successive all'ultima giornata con errore o aiuto per togliere questa fonte dalla lista. I dati giornalieri non permettono di ordinare i tentativi nella stessa giornata; il ponte conserva quindi il ripasso in quel caso. La scadenza della finestra o l'uscita dalla lista non sono una diagnosi o una certificazione di padronanza. Le osservazioni e gli storici originali restano intatti.

Le missioni classiche danno priorità alle parole effettivamente presenti nel loro materiale. Il Passaporto delle scoperte può includere fino a due parole curate con difficoltà reale, anche fuori dalle prime sei parole del percorso iniziale, preservando il resto della progressione. Il piano di parole dell'Allenamento conserva i propri criteri di ripasso e importa soltanto la fonte `missions`, evitando di contare due volte le proprie difficoltà.

## Missioni festive riprese dopo mezzanotte

Una sfida festiva incompleta conserva token, piano, passo e aiuti e può essere ripresa nelle date successive della **stessa stagione ancora attiva**. Viene proposta prima di aprire un'altra sfida. La chiusura della stagione resta vincolante: il Natale termina il 7 gennaio compreso, secondo il calendario `Europe/Rome`. Una stagione successiva non riprende una sfida della precedente. Il Passaporto mantiene le proprie regole di continuità e di conteggio dei giorni.

Le due tabelle esistenti `holiday_days` e `holiday_rounds` ricevono soltanto la colonna nullable `completed_on`. Il primo completamento nuovo la scrive con la data del server in `Europe/Rome`; i campi data inviati dal client non sono usati. `day` resta la data originaria di avvio. Le vecchie righe non vengono riscritte: per i completamenti privi di metadato si usa `COALESCE(completed_on, day)`.

I distintivi delle festività contano le date effettive di completamento distinte nell'unione delle sfide giornaliere e dei giri aggiuntivi. Più sfide concluse nella stessa data contano come un solo giorno. Gli accessori legati al numero di esercizi mantengono il conteggio degli esercizi, senza richiedere un giorno nuovo. Premi già posseduti, inventario e saldi non vengono rimossi o rivalutati al ribasso. Nessun personaggio Grinch viene attivato da questo lotto.

Il token del predecessore completato preserva l'idempotenza dell'apertura di un nuovo giro. Un retry vecchio non salta una sfida incompleta e non apre un giro aggiuntivo dopo che un'altra richiesta ha già completato quello nuovo. Alla mezzanotte il predecessore della data precedente può aprire soltanto la normale sfida della data corrente; ritentarlo restituisce quella stessa sfida. Le risposte finali concorrenti e i replay non assegnano due volte i premi.

### Limite di downgrade

Lo schema è additivo e il PHP precedente può leggere le vecchie righe e ignorare la colonna nuova. Non è però garantita la stessa semantica dei distintivi dopo un rollback al contatore di `b23e98a`: se più sfide avviate in giorni diversi vengono concluse tutte in una data grazie alla nuova ripresa, il vecchio runtime conterebbe nuovamente le date di avvio. Non riscrivere gli storici e non aggiungere trigger per mascherare il problema. Dopo l'uso della nuova ripresa, preferire un fix-forward che mantenga il conteggio tramite `completed_on`; un eventuale rollback deve esplicitare questa differenza. I premi già ottenuti restano in ogni caso nell'inventario.

## Frasi e consegne di base

Il catalogo curato comprende 53 parole in otto gruppi, mantenendo tutte le 43 parole e i sette gruppi precedenti, e aggiunge dodici piccole frasi e otto consegne originali. Gli endpoint esistenti accettano due track additivi, senza introdurre livelli d'esame:

| Richiesta `training-start` | Chiave della sessione | Domanda | Competenza registrata |
| --- | --- | --- | --- |
| `track: sentences` | `sentences:basics` | `sentence-build`: frase, significato e parole da riordinare | `sentence.compose` |
| `track: instructions` | `instructions:basics` | `instruction-choice`: consegna e tre scelte illustrate | `instruction-reading.meaning` oppure `heard-instruction.meaning` quando l'audio è effettivamente usato |

Una sessione seleziona tre attività meno praticate, congela il piano e conserva la stessa ripresa posseduta, scadenza, protezione CSRF, aiuti, tentativi e replay dei track esistenti. Le sessioni sospese dei due nuovi track possono essere raccomandate come ripresa. Il motore generale di suggerimento di parole e lettere non attribuisce nuove competenze o nuovi livelli alle frasi.

Gli aiuti, gli errori e il modello visibile si distinguono dalle risposte autonome. In assenza di audio la UI deve dichiarare la lettura; il modello della frase mostrato come alternativa va inviato con `helped: true`. I test API verificano il contratto, non la qualità di una voce su un dispositivo reale. Non si registra la voce dei bambini e non si promette una preparazione Cambridge completa. I piccoli adesivi esistenti possono seguire la partecipazione; nessuna attività nuova modifica XP, monete o classifiche.

## Ingressi da invito

`club-join` usa gli helper condivisi `invitationClass()` e `classroomRegistrationOpen()` della gestione classe. Un nuovo ingresso da un invito sospeso o obsoleto viene rifiutato con 410. Chi risulta già iscritto conserva la risposta idempotente; il controllo di sospensione non espelle un membro né modifica classi o account reali. I relativi test di gestione inviti sono mantenuti nel lotto dell'agente che modifica `classroom.php`.

## Verifiche e limiti

Le nuove suite `scripts/test-holiday-continuity.py` e `scripts/test-learning-bridge.py` coprono migrazione concorrente da schema precedente, ripresa con zero/uno/due passi, due processi PHP, replay, date falsificate, distintivi, chiusura del 7 gennaio, inventario permanente, ponte senza scritture, isolamento dei profili, cronologia degli errori e contratti dei nuovi track. Le suite precedenti delle festività e dell'Allenamento conservano le loro verifiche: sono aggiornate soltanto per la nuova semantica della mezzanotte e per i cataloghi 53 parole/otto gruppi/21 percorsi sospesi.

Un primo controllo ha rilevato una regressione reale della priorità delle parole: importare nel piano Allenamento anche la fonte `training` duplicava la sua priorità e ritardava la copertura delle parole nuove. Il filtro ora importa soltanto `missions`; la copertura precedente e il nuovo caso cronologico sono stati rieseguiti. I log iniziali falliti sono conservati nel rapporto di verifica, non nascosti tramite retry.

Tutte le dieci suite API pertinenti sono passate sullo stesso codice PHP finale: holidays, holiday-continuity, learning-bridge, journey, review, training, parent-summary, training-guidance, letter-progression e phonics. Anche sintassi PHP, AST Python e controllo whitespace sono passati.

La nuova suite `scripts/test-holiday-continuity-browser.cjs`, registrata nel wrapper come `holiday-continuity`, prova il vero frontend illustrato a 390 px: risponde a un esercizio il 3 novembre, ricarica il 4, conserva token/piano/passo, usa pausa/indietro e completa attraverso i controlli reali. Verifica data di completamento, singolo distintivo, saldi/intestazione e partite classiche sospese invariati, assenza di POST automatici e rifiuto 410 dell'ultimo esercizio dopo la chiusura dell'8 gennaio. Il wrapper locale è passato con Chromium e clock sintetico.

Questa prova ha identificato e fatto correggere un difetto del frontend: dopo il completamento della sfida iniziata ieri, un GET senza una nuova sessione iniziata oggi sostituiva con `null` la risposta di completamento appena confermata. `quests.js` ora mantiene quella risposta soltanto nella vista corrente e soltanto se l'evento e la stagione sono ancora attivi, preferendo sempre un'eventuale sessione autorevole presente nel GET. Un reload torna allo stato effettivamente disponibile sul server. Il log della regressione originaria rimane conservato; non è stata allungata la scadenza del test. Lo screenshot `holiday-continuity-mobile.png` mostra il pannello completato e il pulsante per continuare le sfide.

Il rapporto locale del lotto è in `/workspace/wordyland-resolution-2026-11-03/learning/`. La verifica cumulativa del coordinatore rimane necessaria per la UI, i browser, il bundle e la pubblicazione. Non sono stati interrogati account reali, modificati permessi dell'hosting, inviati messaggi email o effettuati deploy da questo lotto.
