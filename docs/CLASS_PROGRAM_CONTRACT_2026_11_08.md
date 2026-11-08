# Programmi di classe e schede dell’8 novembre

Base verificata pubblicata:7f03b579c14e647191779df685b6de4c45bd3beb, run42296156096 SUCCESS,49verify/63browser/deploy/live. L’utente autorizza nuovi35casi delle5foto e il modello classe–docente–programma discusso. Il limite dei vecchi lotti «nessun backend/JSON/schema» descriveva quei lotti: questa richiesta autorizza estensioni additive necessarie, preservando contenuti e dati precedenti. Nessun account, iscrizione, incarico o consenso reale viene creato dagli strumenti. Nessun servizio, invio email, credenziale o modifica hosting.

## Proprietà dei file

- Materiali: training.json, grammar.js, test-grammar-content.mjs e nuovi test worksheet. Mantiene invariati tutti i40casi/16nomi precedenti.75casi/30nomi/11percorsi risultanti; gli altri cataloghi legacy rimangono identici.
- Core programma: class-program.php e class-program-catalog.json; API, SQL additivo, resolver, filtri e provenienza/consenso. Helper autonomi senza one/rows/platform disponibili.
- Adapter server: training.php, platform.php, arena.php. Usa SOLO la facciata qui definita; nuovi piani/casi e record esiti server nella transazione del gioco. Nessuna modifica di economia o permessi globali.
- Frontend programma: class-program.js/class-program.css, training.js, quests.js, arena.js. UI adulto e bambino, contesto in RAM, nessun dato privato in cache.
- Classico/offline: app.js/offline.js, solo hook del runtime comune e pacchetti espliciti di contenuti. Nessun token/API/studenti in CacheStorage o nel pacchetto.
- Root: api.php, index.html, versionamento/deploy/allowlist, workflow, documenti, collaudo cumulativo e rilascio. Test indipendenti separati.

## Materiali nuovi: IDs e fasi stabili

I pack aggiunti dopo i5precedenti sono `toys-yes-no`(5), `whats-this`(6), `it-they-choice`(6), `it-they-write`(6), `is-this`(8), `short-answer-gap`(4). Nuovi nomi:bag,rubber,doll,car,ball,puzzle,teddy,rabbit,cat,rat,dog,lizard,hat,pencil-case. bag/rubber mantengono le forme della scheda, senza sostituire book bag/eraser; pencil case è solo il bersaglio di una domanda falsa con immagine desk.11nuove illustrazioni SVG originali coerenti; niente foto o nominativi salvati.

Nuovi task: `short-question`→model,short-answer,short-write; `identify`→model,identify-build,identify-write; `prefix-choice`→model,prefix-choice; `prefix-write`→model,prefix-write; `short-gap`→model,short-gap. Modi backend esistenti: model=grammar-model; build=grammar-build; write=grammar-write; le altre fasi grammar-choice. Dati nuovi curati aggiungono quando necessario `model`(risposta completa),`ending`(parte finale della frase),`frame`(Yes,it___/No,it___). `answer` resta ciò che il bambino deve effettivamente scegliere/scrivere. I nuovi task non vengono classificati falsamente come articles/plurals. Il gap supporta trascinamento e anche tap/tastiera. I vecchi piani restano validi senza rigenerazione.

## Facciata PHP obbligatoria

Il file viene richiesto da api.php dopo userId e WORDYLAND_BOOTSTRAPPED, prima platform.php. Inizializza solo proprie tabelle additive e gestisce le proprie azioni; gli helper rimangono disponibili agli altri moduli.

- `cpResolveContext(PDO $db,int $pid,?array $expected=null): array` →manifest. `expected` è il body/GET dell’azione (campi programClass/programRevision); validare classe/revisione attese per ogni nuovo avvio quando configurato. `null` serve a letture/menu, non bypass. Nessun programma configurato→mode legacy. Programma configurato ma non pubblicato/vuoto→mode blocked; più classi senza scelta→mode selection-required. Gli avvii devono fallire esplicitamente nei due ultimi casi, mai ripiegare sul globale.
- `cpRequirePlayable(array $context):void` blocca blocked/selection-required.
- `cpFilterTrainingContent(array $content,array $context):array` →vista classe. legacy restituisce identico. Filtra parole, pack, lettere/blocchi, casi grammaticali, frasi/consegne/fonetica per IDs autorizzati; metadati grafici e cataloghi per etichette storiche rimangono leggibili. Pool insufficiente non autorizza distractor globale.
- `cpFilterWordPool(array $rows,array $context):array` →intersezione per testo normalizzato approvato, sia risposte sia opzioni. Tutti i pool di missioni/studi/ripasso/feste/sfide passano da qui. legacy restituisce identico. `context.words` contiene righe complete approvate e può alimentare un gruppo indipendente dal mondo grafico.
- `cpBindSession(PDO $db,int $pid,string $kind,string $token,array $context):void` registra provenienza solo se class, dentro transazione chiamante. Nessun BEGIN/COMMIT nel helper. Famiglie training,phonics,quest,holiday,duel.
- `cpSessionMatches(PDO $db,int $pid,string $kind,string $token,array $context):bool` per riuso nuovo start: false se altra classe/revisione; legacy non riusa piani class-bound.
- `cpAssertSessionAccess(PDO $db,int $pid,string $kind,string $token):?array`→contesto congelato e verifica membership esatta attuale, se bound; null per storico legacy. Un vecchio programma può essere ripreso esplicitamente con membership valida; se usciti dalla classe si conservano progressi, ma non si aprono nuovi contenuti privati.
- `cpSessionMetadata(PDO $db,int $pid,string $kind,string $token):?array` per etichetta contesto/storico nel client.
- `cpRecordStep(PDO $db,int $pid,string $kind,string $token,int $step,array $outcome):void` inside tx: upsert idempotente per kind/token/profile/step, associato alla revisione bound. Campi outcome:item,skill,correct(bool),completed(bool),helped(bool),errors(cumulativi),replays. Nessun rawanswer, diagnosi o attribuzione retroattiva degli aggregati globali. Model/explore distinto dalle risposte.
- `cpResolveDuelContext(PDO $db,int $a,int $b,?int $club,?array $expected=null):array` unica classe comune scelta/attesa; stessi contenuti e revisione per entrambi. cpBindSession per entrambi i partecipanti. Access/accept/answer verificano la classe congelata, non qualsiasi classe comune residua.

Manifest:
`{mode:'legacy'|'class'|'blocked'|'selection-required',classes:[{id,name,configured}],active:{club,program,revision,title,schoolYear,teacherLabel,method,examGoal}|null,words:[[en,it,icon,meta?]],allowed:{grammarCases:[],wordIds:[],letterIds:[],sentenceIds:[],instructionIds:[],phonicsGroups:[]},units:[{id,title,status}],expected:{programClass:int,programRevision:int}|null}`.

Il resolver valida membership ad ogni uso. Se expected è fornito con classe/revisione diversa dallo stato confermato →409 aggiornare. Quando class, i nuovi avvii senza expected devono fallire con409 (il browser lo aggiunge automaticamente); questo impedisce due dispositivi di scambiarsi silenziosamente il programma. GET menu/progressi possono non inviare expected. Draft non è legacy. Le classi senza record conservano il comportamento precedente fino alla configurazione esplicita.

## API e gestione

`class-program-state` GET(profile), `class-program-context` POST(profile,club), `class-program-manage` GET(club)/senza club per classi gestibili, `class-program-save` POST(club,schoolYear,title,teacherLabel,method,examGoal,units,expectedRevision), `class-program-publish` POST(program,expectedRevision,confirmed:true), `class-program-material-save` POST(club,title,words,confirmed:true).

Unità: pubbliche da catalogo curato o private di classe con revisione adulta. units è [{id,status:'active'|'review'|'planned'}]; solo active/review alimentano giochi, planned rimane nell’area adulta. Publish congela copia delle unità/righe/IDs nella revisione. Aggiornamenti/anno diverso non cancellano storia o premi. Nome docente è metadato e non concede accesso.

`class-program-teacher-invite` POST(club,username,scopes:['program-edit'|'progress-read'],confirmed:true), `...-accept` POST(token,confirmed:true), `...-revoke` POST(club,staff,confirmed:true). Token monouso con hash/scadenza, destinato all’account adulto indicato, senza email o account creati. Owner/admin o incarico accettato program-edit gestiscono programma; incarico progress-read da solo non modifica nulla. Revoca/cambioowner/ruolo invalida ogni richiesta successiva. Nessuna espansione di ownedProfile.

`class-program-consent` POST(club,profile,allowed,confirmed:true) solo adulto titolare o genitore già autorizzato con guardian link accettato e valido; learner non presta consenso. Consenso separato per classe e revocabile. `class-program-progress` GET(club,program?) richiede owner/admin o incarico progress-read, ma mostra il dettaglio soltanto dei profili con consenso valido. Nessuno storico globale viene attribuito a questa classe. `class-program-history` GET(club) per gestori, versioni conservate. Non configurare o leggere utenti/classi reali dagli strumenti.

## Runtime browser

`window.wordylandClassProgram` mantiene stato SOLO in RAM, identity/profile/epoch, risposte tardive scartate. Metodi: `ready()` Promise, `state()` manifest|null, `requestData(data={})` aggiunge expected dopo ready (se legacy non aggiunge campi), `trainingContent(full)` vista filtrata; `filterRows(rows)`; `wordPool()` righe approvate; `isClass()`; `open()` UI; `refresh()`; evento `wordyland-program` a cambio contesto. Nessun fallback globale mentre pending/error/selection-required/blocked. `ready()` guest risolve legacy senza API; profilo usa class-program-state. Dopo errore le azioni mostrano riprova, non avviano quiz globali.

La UI «Programma della classe» permette scelta contesto, gestione/draft/revisione pubblicata, docente, anno, metodo, obiettivo d’esame dichiarato, unità/materiali confermati e incarichi/consensi espliciti. Esame non equivale a livello dedotto o certificazione. Le nuove schede sono un pacchetto pronto da assegnare; nessuna autoassegnazione basata sul nome Best2. Tutti i mondi restano accessibili e cambiano solo i contenuti didattici.

Training/quests/arena passano expected a ogni nuovo start. Il vecchio token si riprende esplicitamente senza ricalcolare piano. Counter/badge giornalieri delle feste restano globali come prima: non duplicare premi cambiando contesto. Mostrare un pending storico se proviene da altra classe e richiedere scelta esplicita prima di riprenderlo.

Classico client è pratica distinta dalle prove server-confermate del registro docente. Offline: esportazione esplicita in localStorage di SOLOcontenuto approvato e fingerprint revisione (senza profilo/account/session/token/teacher/member/APIresponses), URL con identificativo locale non segreto; ripasso offline legge quel pacchetto o mostra indisponibile, mai fallback globale. Cataloghi legacy/offline pubblici rimangono per ospiti/nonconfigurati. Le funzioni precedenti non vengono rimosse.

Published revisions freeze actual filtered `training` records in addition to IDs; manifest.training and cpFilterTrainingContent must use that snapshot so later catalogue edits cannot change a published lesson. Invitation acceptance supports a read-only POST preview with confirmed:false; only confirmed:true grants accepted scopes. Neither preview nor acceptance sends email.
