# WordyLand: quadro verificato del 30 ottobre 2026

Questo documento distingue le funzioni presenti dalle dipendenze ancora da verificare. Le vecchie roadmap e diagnosi conservano la cronologia, non descrivono lo stato corrente.

## Base pubblicata e percorso di rilascio

Il secondo lotto di revisione parte da `e6f2a75e011de048aa458fe27d72dff4da5c87ee`, pubblicato con successo dal [run 41092906001](https://github.com/socialluca89-byte/word/actions/runs/41092906001). La prova include verify, 30 suite browser, deploy realmente eseguito, health JSON SQLite pronto, homepage ordinarie e 41 file statici confrontati byte per byte. Anche il controllo indipendente di health e dei sette file statici modificati e la pagina Best 2 nel browser hanno avuto esito positivo. Questa evidenza non attribuisce una causa al vecchio incidente anti-bot e non modifica le protezioni.

Ogni nuovo lotto deve ripetere la CI e il normale deploy. Lo stato di un rilascio successivo è documentato dal relativo run di `main`, con deploy concluso e verifiche pubbliche riuscite; un test locale o il solo merge non equivalgono alla pubblicazione.

## Funzioni disponibili da conservare

- Link stabile di classe, iscrizione con soprannome, ritorno con credenziali esistenti, recupero con codice e profili già appartenenti all'account. Amministrazione delle iscrizioni senza accesso manuale al server.
- Giochi e mondi, missioni, sfide private, presenza, ripresa, guardaroba, premi e progressi isolati per profilo.
- Allenamento lettere/parole e spelling, lettura quando la voce non è disponibile, attività fonetiche guidate dichiarate come tali.
- Riepiloghi riservati all'adulto dei profili che gestisce; il link classe non concede accesso ai progressi privati di account separati.
- Programmi da testo e PDF testuale, OCR locale di immagini stampate e di una pagina PDF selezionata, con revisione dell'adulto prima del salvataggio.
- Installazione PWA e ripasso ospite offline. L'offline è un percorso locale condiviso nel browser, separato dai profili e dai crediti online.

## Secondo lotto UX/UI

Il lavoro si concentra su problemi riproducibili: operazioni tardive fra profili/sessioni, chiarezza ingresso/ritorno alla classe, conservazione del codice di recupero, ricerca e conferme amministrative, tastiera e leggibilità, avanzamento dopo conferma server e aggiornamento dell'app soltanto quando è sicuro ricaricare. I test usano dati sintetici e server temporanei. Nessun reset reale, invio email, promozione di ruoli o modifica alla sicurezza hosting fa parte del lotto.

## Ciò che manca davvero

| Area | Passo necessario | Limite attuale |
| --- | --- | --- |
| Genitore e alunno con account separati | Progettare e provare invito verificabile, scadenza, consenso, revoca e isolamento; verificare il rapporto prima di associazioni reali | I report riguardano solo i profili già posseduti. Non si collega un bambino per soprannome, email o possesso del link classe |
| Recupero tramite email reale | Configurare e verificare trasporto e mittente autorizzato, poi provare la consegna con autorizzazione specifica | Le fixture email provano il codice, non la consegna. Il codice di recupero resta il meccanismo disponibile |
| Audio fonemico e qualità didattica | Clip affidabili e con diritti per /s/, /p/, /b/, /n/, revisione qualificata e successivi contenuti confermati dall'insegnante | TTS di lettere/parole e prove sintetiche non dimostrano fonemi corretti o valutazione della pronuncia |
| Dispositivi e materiali reali | Collaudo su Safari/iOS/Android e tablet fisici, voci effettive, fotografie e materiali confermati dall'adulto | Chromium e fixture non garantiscono tutti i dispositivi, accenti o fotografie; il vecchio tablet era stato rinviato |
| Estensione dei contenuti | Allineare nuove attività al programma effettivo della classe e inventariare competenze coperte/mancanti | Il catalogo è finito: 35 parole in sei percorsi e il primo set fonetico guidato non costituiscono un curriculum completo né una preparazione Cambridge certificata |

Non sono presenti sincronizzazione privata offline, collegamento automatico fra familiari o correzione automatica della calligrafia. Non vengono dichiarati completi perché esiste una simulazione o un'interfaccia.

## Evidenza e documenti

Per il primo lotto: [UX/UI del 30 ottobre](UX_UI_2026_10_30.md). Per le regole di rilascio: [deployment](DEPLOYMENT.md). Le roadmap del 25-27 ottobre e le diagnosi degli incidenti restano consultabili come documenti storici.
