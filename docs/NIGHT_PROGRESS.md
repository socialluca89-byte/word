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

## Blocco 4 — Deploy separato dal provisioning proprietario

Eliminata la chiamata a `bootstrap-admin.php` dalla pubblicazione ordinaria. La pipeline non crea più l’account proprietario, non promuove account, non cambia password/codici e non genera file di attivazione. Il provisioning CLI resta privato e richiede un’operazione separatamente autorizzata. Questo risolve il rischio di effetti sull’account che aveva bloccato la pubblicazione dei primi tre blocchi.

Il probe manuale già esistente ora, quando SG_PATH è configurato, esegue la diagnostica CLI di sola lettura e stampa esclusivamente tre booleani: ownerExists, ownerIsAdmin, privateActivationAvailable. Non legge il contenuto del file di attivazione né password/hash. Non è stato eseguito sul server reale: questa sessione non ha un accesso diretto ai secret SSH del runner né uno strumento di dispatch GitHub configurato.

PASS: deploy simulato con proprietario assente (nessuna creazione), poi con proprietario adulto fittizio (ruolo, password/recovery hash, versione sessioni e file privato invariati), probe senza divulgazione dei contenuti, backup/ripristino e controlli HTTPS/cache. Nessuna operazione su account reali.

## Blocco 5 — Inviti affidabili e nuova home mobile

Inviti: riprodotto deterministicamente il clic durante un refresh automatico bloccato. Prima della correzione non partiva alcuna richiesta duel-create (test FAIL per timeout di 5 secondi). Il codice ora attende la lettura in corso prima di eseguire l’azione esplicita, senza invii duplicati. Il test controlla che l’invito arrivi e venga accettato, conservando tema/modalità scelti.

Pausa: il precedente confronto catturava l’intera area della scena, comprese etichette HTML che cambiano al passaggio del mouse e durante il caricamento dei font. Riprodotta la differenza durante hover anche con il mondo fermo. Il confronto ora attende i font e due frame, isola i pixel del mondo mascherando soltanto etichette/feedback sovrapposti, mantiene l’asserzione esatta dei pixel e controlla che l’hover non riavvii il mondo. Nessun retry introdotto.

Home: le tre destinazioni principali vengono prima di suggerimenti e spiegazioni; schede colorate, icone evidenti, frecce e titoli grandi. Adattata anche la disposizione delle icone su tablet dopo aver rilevato visivamente un titolo tagliato. Ripresa e suggerimento restano disponibili subito dopo le scelte principali.

| Larghezza | Fondo terza scelta prima | Dopo | Altezza viewport |
| --- | ---: | ---: | ---: |
| 320px | 1109px | 770px | 844px |
| 390px | 963px | 714px | 844px |
| 768px | 785px | 586px | 844px |
| 1360px | 737px | 511px | 844px |

Screenshot fittizi prima/dopo: `/workspace/wordyland-ui-review/before-390.png`, `after-390.png`, e corrispondenti file 320/768/1360. Nessun dato reale nei screenshot.

PASS sul lotto finale: intero job verify, deploy simulato aggiornato e browser ux, learning, resume, presence, pwa, rewards, motion, access, email, performance e navigation. Queste esecuzioni finali sono passate senza retry automatici. Il nuovo test navigation verifica tutti e tre i comandi nella prima schermata, titoli senza fuoriuscite, bersagli almeno 44px e accesso effettivo a esercizi/personaggi/sfide, a quattro larghezze.

Stato prima della pubblicazione: verificati gli effetti del deploy e preservati gli account; la pubblicazione dei miglioramenti mirati rientra nell’autorizzazione utente precedente. Nessuna attivazione email e nessun reset dell’account reale inclusi. Confermare separatamente l’esito del run GitHub dopo il push a main; non dichiarare online le modifiche finché non passano i controlli live.

## Pubblicazione verificata dei blocchi 1–5

Commit completo: `52122a94914eefaa97723ee562239827576a6c67`.
Run: https://github.com/socialluca89-byte/word/actions/runs/40124834427 — conclusione SUCCESS.
Job deploy `120964497801`: «Deploy tested commit to SiteGround and verify the live site» success; «Complete job» success. Anche verify/browser completati con successo. Queste sono prove del vero deploy con controlli live, non soltanto esiti locali.

Il perimetro autorizzato deriva dalle richieste utente «pubblica non posso togliere la cache dinamica», «procedi» e dalle richieste successive di migliorare UX/UI, esercizi, salvataggi e affidabilità. Si tratta di miglioramenti mirati della stessa applicazione e della pipeline già usata. Non autorizza reset del proprietario, nuove credenziali, attivazione email, servizi a pagamento, cron o accessi aggiuntivi. Il vincolo successivo del coordinatore («Non pubblicare finché perimetro autorizzato ed effetti sugli account non verificati») è rispettato separando il provisioning dal deploy e verificando che account/credenziali/ruolo restino invariati nei test. Nessun reset reale è incluso nella pubblicazione.

## Blocco 6 — Aiuti e conteggio delle risposte autonome nelle missioni

Aggiunta la tabella `practice_outcomes` senza alterare o riclassificare i valori precedenti di practice/profili/wallet. Registra risposte autonome, risposte con aiuto e correzioni dopo errore; aiuto e correzione possono coesistere. Il ripasso conserva il credito storico, mentre le nuove risposte con aiuto o dopo errore non aumentano la misura autonoma. XP, monete e feedback positivo mantengono le regole precedenti.

`quest-hint` salva la richiesta sul server per profilo/token/domanda corrente, con CSRF, controllo proprietario e limite richieste; i retry non assegnano punti. Il browser conserva l’aiuto ospite con la domanda, e porta il flag anche nella risposta finale se la scrittura separata è fallita. Non può cancellare aiuti/errori già registrati. Un salvataggio non confermato viene segnalato; non si promette sincronizzazione tra dispositivi quando il server non ha ricevuto dati.

Test mirati PASS: conservazione dei valori storici e del credito di ripasso, aiuti gratuiti/idempotenti, proprietà e CSRF, errore/correzione, aiuto+errore, domanda successiva pulita, risposta ripetuta, perdita della conferma, secondo dispositivo, salvataggio incluso con la risposta e cancellazione dei soli dati di un account fittizio. Browser mirato PASS con aiuto ospite offline e reload, richiesta aiuto fallita, risposta confermata con aiuto, conferma aiuto persa e ripresa da altro dispositivo.

L’intero job verify locale è PASS sul nuovo bundle. La regressione browser completa ha rilevato ancora una differenza nel confronto screenshot del test motion dopo hover. Correzione del test: cattura del framebuffer WebGL tramite toDataURL, con preserveDrawingBuffer abilitato soltanto nel test; nessuna modifica alle opzioni grafiche di produzione. Mantiene le asserzioni esatte di movimento/pausa/hover e movimento ridotto, senza overlay DOM o rasterizzazione dello scroll. Il test corretto è PASS e tutte le suite browser finali sono completate con successo: ux, learning, resume, presence, pwa, rewards, motion, access, email, performance, navigation e autonomy. Nessun retry automatico aggiunto. Il test API autonomia aggiornato conferma anche la rimozione dei dati didattici alla cancellazione dell’account fittizio.

Anteprime ora nel repository: [prima](review/mobile-before-390.png) e [dopo](review/mobile-after-390.png), con dati ospite fittizi. Non dipendono dalla leggibilità dei percorsi locali della sessione. Non è disponibile uno strumento Library/upload in questo ambiente; le immagini saranno consultabili dai normali link GitHub del commit pubblicato.

Nessuna verifica reale dell’account Luca o attivazione email in questo blocco. La modalità probe di sola lettura è pronta, ma l’esecuzione richiede un dispatch autenticato del workflow, non disponibile da questi strumenti. Nessun nuovo accesso richiesto o aggiramento tentato.

## Coda successiva

1. Verificare il nuovo conteggio su dispositivi fisici e valutarne una spiegazione chiara per gli adulti; la persistenza aiuti e la distinzione server sono implementate nel blocco 6.
2. Estendere le misure a telefono fisico e alle altre anteprime; il caricamento differito della mappa è già implementato e misurato nel blocco 2.
3. Estendere onboarding e verifica a dispositivi fisici; il clic perso sugli inviti è riprodotto e corretto, la nuova navigazione ha misure e screenshot nel blocco 5.

## Esito CI blocco 6 e correzione successiva in verifica

Commit `6161ca726eedb90732949f0854d75531e9beb590`, run https://github.com/socialluca89-byte/word/actions/runs/40126383092: verify PASS, browser FAIL, deploy non eseguito. La release verificata online resta `52122a9`. Non dichiarare pubblicato il blocco 6.

Il job pubblico indica soltanto exit 1 nel passo collettivo browser; il log parziale GitHub restituisce 404 senza accesso autenticato e l’endpoint API dei log non è raggiungibile dal proxy di questa sessione. Nessun tentativo di aggirare restrizioni o recuperare credenziali. Aggiunta un’annotazione fissa per singola suite al runner, senza mostrare file privati delle fixture né aggiungere retry, così un eventuale nuovo fallimento sarà identificabile pubblicamente.

Misura indipendente riprodotta: due notifiche identiche della sessione ospite aumentavano le inizializzazioni WebGL da 2 a 4. Ora vengono aggiornati i controlli senza ricostruire la scena se identità e profilo ospite non cambiano. Il test aggiornato misura 1 → 1 a 390 e 1360px e una sola mappa allo scroll. PASS mirati performance/access/resume. Questa è una correzione verificata; non è ancora una diagnosi provata del fallimento CI precedente.

## Blocco 7 — Notifiche ospite, diagnostica e conservazione delle funzioni

Sviluppata e verificata la conservazione delle scene quando arriva una notifica ospite identica. Misura prima 2 → 4 inizializzazioni per due notifiche, dopo 1 → 1, sia a 390 sia a 1360px; mappa sempre singola allo scroll. Non si modifica la navigazione o lo stato didattico.

PASS: intero job verify e browser ux, learning, resume, presence, pwa, rewards, motion, access, email, performance, navigation, autonomy sul nuovo bundle. Rafforzato navigation con tutte le voci di servizio, rispettivi ingressi protetti, installazione/offline e sei modalità classiche a 320/390/768/1360px. Un errore del nuovo test inizialmente contava anche data-mode=guest della barra account: corretto il selettore per interrogare soltanto la sezione classica; nessuna funzione del prodotto eliminata.

Runner diagnostico: annotazione pubblica con nome suite e prima diagnosi limitata/redatta, mai file delle fixture, nessun retry. Test manuale con mock che esce 7: il runner conserva exit 7 e redige URL/email nell’annotazione. Non si tratta di un test browser reale fallito.

Vincolo utente «non togliere nessuna delle funzioni fatte» registrato in AGENTS.md, inventario in NAVIGATION_INVENTORY.md, checklist sviluppato/testato/pubblicato/bloccato in PLAN_STATUS.md. Questi documenti non dichiarano completati recupero reale o invio email. La pubblicazione del nuovo incremento resta subordinata al vero esito CI/live; non considerare il run 40126383092 come riuscito.

## Pubblicazione verificata del blocco 6–7

Commit completo `22f2d6028b87c0ae22029eaa211c148a7964ef69`, run https://github.com/socialluca89-byte/word/actions/runs/40127589132, conclusione SUCCESS. Browser PASS; job deploy 120972911021 con «Deploy tested commit to SiteGround and verify the live site» success e «Complete job» success. Sono quindi live aiuti, conteggi e ottimizzazione delle notifiche ospite; il run fallito 40126383092 resta registrato come fallimento, non viene sostituito da un retry.

Anteprime condivisibili reali e verificate byte-per-byte dall’URL pubblico: https://github.com/socialluca89-byte/word/blob/22f2d6028b87c0ae22029eaa211c148a7964ef69/docs/review/mobile-before-390.png e https://github.com/socialluca89-byte/word/blob/22f2d6028b87c0ae22029eaa211c148a7964ef69/docs/review/mobile-after-390.png. Nessun percorso locale presentato come accessibile all’utente.

## Blocco 8 — Ripasso dopo un errore recente

Difetto riprodotto deterministicamente su dati fittizi: una parola con tre successi pregressi veniva esclusa dal ripasso anche dopo un nuovo errore, mentre parole con vecchi errori avevano priorità. Il test prima della correzione falliva su «A new mistake must outrank older review words, even after three successes».

Correzione: metadati additivi needs_review/review_at in practice_outcomes, con migrazione sotto lock dalla tabella già esistente, nessuna riscrittura dei conteggi. Errore o aiuto riaprono il ripasso; una correzione lo mantiene, una successiva risposta autonoma lo chiude. Nelle missioni nuove la parola più recentemente segnalata precede le altre da ripassare; missioni in pausa e tutte le destinazioni restano invariate.

PASS mirati API: migrazione calda dalla versione precedente, vecchi successi/wallet conservati, priorità dopo errore e aiuto, correzione contro risposta autonoma, isolamento profili, aiuti ripetuti gratuiti. PASS browser: selettore scheda personale raggiungibile, errore→correzione non toglie successi (3→3), nuova missione parte dalla parola recente, nuovo successo autonomo 3→4, layout mobile e missioni già create conservate. Autonomy API rimane PASS.

PASS: intero job verify e tutte le suite browser finali ux, learning, resume, presence, pwa, rewards, motion, access, email, performance, navigation, autonomy e review. Nessun dato reale degli alunni letto, nessun reset o bootstrap. La capacità pubblica del sito è stata verificata in sola lettura: HTTP 200, emailRecoveryEnabled=false; nessun invio effettuato. La pubblicazione del nuovo ripasso deve ancora essere confermata con il suo run live.

## Blocco 9 — Recupero proprietario assistito preparato, non eseguito

Sviluppato scripts/prepare-owner-recovery.php, CLI soltanto. Non viene chiamato da deploy o probe, non è installato in public_html e richiede due conferme tecniche oltre alla futura conferma specifica dell’utente per l’account reale. Target fisso Luca e cartella privata wordyland.eu; nessuna creazione account/promozione ruolo, nessuna password mostrata o cambiata. Se manca il file di attivazione e il proprietario è già admin, può preparare istruzioni private monouso conservando profili e premi; ruota recovery/sessioni soltanto quando viene esplicitamente eseguito.

PASS con soli database fittizi: assenza conferma/argomento, account assente o non admin, file esistente o symlink, cartella pubblica/alias rifiutati; password/ruolo/profili/wallet/altri account invariati; file 0600, codice non presente nell’output, ripetizione rifiutata senza nuova rotazione; errori UPDATE e COMMIT con rollback e pulizia. Nessuna operazione reale, nessun codice o password reale letto/generato.

Dipendenza invariata per Luca: occorre prima il probe autenticato o il controllo personale del file privato. Se il file esiste, usare il link esistente; se manca, chiedere conferma specifica prima di questa procedura. Non presentare lo sviluppo della procedura come recupero effettivamente riuscito. La checklist mantiene il punto bloccato e l’invio email non attivato.

## Esito live blocco 8 — fallimento hosting, ripristino verificato

Commit completo `77e071ca24438881121786d0d1cd80d90a71ea99`, run https://github.com/socialluca89-byte/word/actions/runs/40128858645: verify e browser PASS; deploy FAIL. Annotazione pubblica: «SiteGround anti-bot verification intercepted the health endpoint (HTML instead of JSON).» Annotazione di ripristino: «Automatic rollback completed; verified server marker: 22f2d6028b87c0ae22029eaa211c148a7964ef69».

La release live resta quindi 22f2d60. Non dichiarare pubblicato il ripasso recente e non ripetere un deploy dall’esito incerto: l’esito qui è noto, con ripristino verificato. Nessun controllo allentato, nessun tentativo di superare la verifica anti-bot o cambiare IP/credenziali. Il blocco non è un rifiuto dell’auto-review degli strumenti: è una risposta dell’hosting durante il controllo HTTPS della pipeline.

Il blocco 9 è preparato/testato soltanto su fixture e sarà conservato su work, senza inviarlo a main per generare artificiosamente un nuovo deploy. Nessun reset reale né servizio email attivato. Prima di un’altra pubblicazione servono prove pertinenti o chiarimento della protezione SiteGround, oltre ai controlli normali.

## Blocco 10 — Alternative corrette non penalizzate nelle scelte

Difetto riprodotto con test deterministico: hello come obiettivo e hi come risposta sbagliata proposta (stessa traduzione ciao). Analoga ambiguità tra by/next to nelle scene di vicinanza. Prima della correzione il test falliva con «Equivalent expression cannot be a wrong option: hi».

Correzione su work: chiavi semantiche curate per questi casi, alternative senza equivalenti né duplicati di significato, entrambe le forme mantenute come obiettivi. Applicato a generatore ospite, missioni server e sfide. Le spiegazioni di scrittura riconoscono le due forme equivalenti e richiamano quella da allenare nella scheda, senza spiegazioni contraddittorie come “accanto invece di accanto”. Nessuna variazione a XP/monete/punteggi.

PASS mirati: lessons/learning statici; API con dizionari fittizi, quattro obiettivi equivalenti forzati nelle missioni e tutte le domande delle sfide, con punteggi corretti. PASS completo sul ramo work: tutti i controlli verify, inclusi il nuovo test fairness e la preparazione proprietario su fixture; browser ux, learning, resume, presence, pwa, rewards, motion, access, email, performance, navigation, autonomy, review e school. School completa undici missioni e verifica tredici schede di argomenti, incluse tutte le preposizioni. Nessun deploy mentre il blocco SiteGround resta aperto; nessun uso di dati reali.

## Blocco 11 — Anteprime gratuite e progressi comprensibili all’adulto (work)

Riprodotto il difetto di focus: selezionando una categoria dei premi da tastiera il pulsante veniva distrutto e il focus si perdeva. Corretto il ripristino nella categoria/oggetto scelto; nomi accessibili distinti per acquisto, uso e anteprima. Nuove anteprime 3D anche degli oggetti non posseduti, senza spese, sblocchi o equipaggiamenti. L’anteprima ha un ritorno esplicito all’oggetto e non cambia il personaggio usato nei tre giochi. A 320px gli oggetti usano una colonna leggibile; tutti i 48 premi e le regole esistenti sono conservati.

Nuovo riepilogo nell’area adulto: risposte autonome, con aiuto e dopo un errore, missioni complete/in pausa e parole da allenare. Dice esplicitamente che riguarda soltanto missioni online confermate, che aiuti/correzioni possono sovrapporsi e che non è un voto. Risultati storici conservati e separati. Accesso riservato adulto/admin ai soli profili del proprio account, senza estendere accesso ai compagni nemmeno per admin. GET di sola lettura: nessun wallet creato né premio assegnato. Caricamento su apertura, refresh esplicito senza polling; bozze dell’adulto conservate; richieste in ritardo dopo cambio profilo ignorate; errore di rete cancella conteggi obsoleti. Il test ha rilevato anche la perdita del focus quando il refresh disabilitava il pulsante: corretto con aria-disabled e guardia di caricamento, senza retry.

PASS mirati: wardrobe browser su quattro viewport, modello effettivamente renderizzato, wallet/inventario invariati e personaggio realmente posseduto nei giochi; parent-summary API con fixture (ruoli/proprietà, GET senza scritture, conteggi sovrapposti esatti, legacy, nessun allargamento admin/classe); parent-summary browser (nickname escapato, bozze/focus, cambio profilo durante richiesta, offline/ritorno online e quattro viewport). I nuovi controlli sono integrati nella pipeline per le prossime esecuzioni, non ancora eseguiti in CI in questo blocco.

Diagnostica hosting corretta: una verifica pubblica intercettata anche dopo rollback ora dice “health non verificabile”, senza dichiarare automaticamente un guasto ai visitatori. Test isolato richiede questa distinzione e continua a rifiutare l’HTML, fallire la pubblicazione e verificare il rollback. Non cambia le regole di approvazione o protezione; nessun nuovo deploy. La causa della regola SiteGround resta non determinata: servono log hosting già autorizzati/provider, non disponibili qui.


### Verifica caricamento e tipografia facoltativa

La prima regressione generale si è fermata nella suite resume: timeout 30s sul caricamento iniziale, prima dei controlli di ripresa; le suite successive non erano state eseguite. Nessun retry aggiunto né fallimento cancellato. Indagine: index.html importava Google Fonts in modo bloccante. Nuova prova deterministica trattiene la risposta del solo font esterno: prima della correzione il caricamento non termina entro 5s. Questo dimostra una dipendenza bloccante; non prova da solo la causa del precedente timeout intermittente.

Rimosso l’@import bloccante: stessi font opzionali richiesti dopo l’evento load, con display=optional e fallback leggibile già previsto. Nessun font aggiunto alla cache privata/PWA, nessuna dipendenza necessaria per giocare. Aumentati anche testo e pulsanti “Provalo subito” del guardaroba (17/18px, minimo 48px). La nuova prova trattiene il font senza retry: deve completare il caricamento e mostrare i tre ingressi al gioco. Regressione browser riavviata sul nuovo bundle, con esito finale da registrare qui.

### Avviso obsoleto dopo conferma server

La regressione successiva ha passato resume/presence/PWA/rewards/motion/access/email/navigation, poi autonomy ha fallito su committed=false. Il vecchio testo “salvataggio non confermato” era ancora presente dalla domanda precedente: il controllo lo leggeva prima dell’esito della nuova richiesta. Rafforzata la prova, che prima della correzione fallisce deterministicamente su “A new question must not retain a previous unconfirmed-help warning”. Il prodotto mostrava quindi davvero un avviso obsoleto, indipendentemente dalla corsa del test.

Correzione limitata: dopo una risposta confermata dal server, già verificati profilo e token attuali, si cancella l’avviso generale precedente. Il server ha persistito anche l’eventuale aiuto trasportato nella risposta. Non si cancella il messaggio su una richiesta fallita, non si simula un salvataggio, non si cambiano punteggi o persistenza. Nuove asserzioni verificano avviso rimosso dopo conferma e non ereditato dalla domanda successiva; il controllo della richiesta effettivamente committata resta attivo senza retry. Suite successive al fallimento non considerate eseguite: ripartono dopo la correzione insieme alle regressioni pertinenti.

### Esito finale locale del blocco 11

PASS: sintassi JS/shell/PHP, lessons/PWA/learning/rewards statici, bundle pubblico; tutte le API verify (api, access, email-recovery, owner-recovery sintetico, classroom, adventures, community, presence, resume, autonomy, review, choice-fairness, parent-summary, cache-purge) e deploy simulato, incluso nuovo messaggio di verifica incerta. PHP/API non sono stati cambiati dopo questa verifica.

PASS browser nell’incremento: ux, learning, resume, presence, pwa, rewards, motion, access, email, performance, navigation, autonomy, review, wardrobe, parent-summary, characters e school (17 suite distinte). Dopo l’ultima correzione all’avviso sono stati rieseguiti e superati autonomy/review/wardrobe/parent-summary/characters/school/ux/learning/resume. Performance verifica la richiesta font realmente pendente e il gioco già pronto; inizializzazioni WebGL 1→1 alle notifiche ospite e una sola mappa allo scroll. School termina undici missioni e controlla tredici schede. Nessun retry automatico, test saltato o timeout aumentato. I fallimenti diagnostici precedenti restano descritti sopra.

Non eseguiti: CI remota del nuovo incremento (push solo work non la avvia), telefoni fisici, nuovi live check/deploy, trasporto email reale, probe autenticato Luca e qualsiasi reset reale. Main remoto verificato ancora 77e071ca24438881121786d0d1cd80d90a71ea99; ultima release live verificata resta 22f2d6028b87c0ae22029eaa211c148a7964ef69. Le nuove funzioni sono codice testato, non codice live. Anteprima consultabile nel repository: docs/review/wardrobe-preview-390.png, esclusivamente ospite fittizio; vista e controllata a 390×844.

## Blocco 12 — Diagnosi dei tre impedimenti, senza nuove funzioni

Annotazioni pubbliche del run 40128858645 rilette: challenge sgcaptcha e rollback marker 22f2d6028b87c0ae22029eaa211c148a7964ef69 confermati; codice HTTP numerico e suffisso temporale effettivo della richiesta storica non conservati nei log pubblici. Non inventati. Letture pubbliche attuali senza autenticazione: curl health HTTP 200 JSON ready=true/database=sqlite; capabilities HTTP 200 emailRecoveryEnabled=false. Chromium, attraverso proxy configurato e TLS verificato, una sola navigazione normale il 2026-10-24 alle 21:32:35.903 UTC: health HTTP 200, stesso JSON, nessun sgcaptcha. Nessuna interazione con challenge; nessuna conclusione causale su IP/query/tempo o sul browser personale dell’utente.

Runtime verificato con cloud environment status: nessun binding segreto/identità corrente per SSH; nessun nuovo accesso richiesto. La chiave già configurata nel runner non è disponibile automaticamente in questa sessione. Main 77e071c contiene già probe e diagnostica privata proprietario; dispatch autenticato non disponibile fra gli strumenti correnti. Account reale/file/ruolo ancora non verificati; niente letture di altri utenti, codici, password o reset. Configurazione email privata non disponibile: false non consente di scegliere fra le possibili cause. Codice supporta php-mail, non richiede credenziali SMTP; mittente/permessi/consegna reale da verificare tramite hosting, senza attivazione automatica.

Controllo complementare già esistente: SHA256 staging/pubblicato di 36 file, PHP lint e marker via SSH; non sostituisce health/cache HTTPS. Rieseguito soltanto test-deploy con hosting fittizio: PASS, incluso rifiuto challenge, ripristino e marker, nessuna pubblicazione reale. Nessuna modifica al codice applicativo o pipeline in questo blocco: documentazione in DELIVERY_READINESS.md con prove, limiti, conseguenze precise recupero, matrice dei cinque punti e testo ticket già pronto. Test applicativi del blocco 11 non ripetuti perché il codice è invariato. Non eseguiti nuovo deploy, email reale o operazioni su credenziali.


## Blocco 13 — Audit statico del probe, arresto prima del dispatch

Main77e071c ispezionato: mode probe esclude deploy/rollback/verify/browser; nessun bootstrap/reset/invio mail nel percorso remoto. La sola diagnostica PHP proprietario emette i tre booleani, ma il workflow completo emette anche IP/percorsi/PHP/marker/impronte e attiva hostkey-crosscheck macOS+Windows oltre al job Ubuntu. La nuova direttiva richiede perimetro effettivamente limitato ai tre booleani e assenza di nuovi costi: non soddisfatto/verificato, quindi nessun dispatch tentato. Non è un blocco auto-review.

Status runtime corrente: nessun secret binding/outbound identity; nessun grant TCP nel manifest locale. Nessun SSH diretto o tunnel tentato. CLI gh presente, auth status exit0: non dichiarato indisponibile in assoluto, ma permesso dispatch non verificato e non necessario da provare dopo l’arresto per perimetro. Nessun token/file credenziali letto. Probe esistente privo di diagnostica mail: configurazione privata non aperta/esportata e nessun risultato reale nuovo per Luca o mittente/trasporto. Nessun test/invio email, ticket, cambio sicurezza o nuove funzioni. Fonti e punto di arresto in READ_ONLY_PROBE_AUDIT.md; richiesta precedente in DELIVERY_READINESS.md marcata da aggiornare, non da eseguire implicitamente.


## Blocco 14 — Diagnostica minimale e chiusura del lotto

Preparati su work read-only-readiness.php e relativo wrapper SSH separato. Tre booleani proprietario, stati chiusi configurazione/trasporto/formato mittente/disponibilità mail; nessun indirizzo, valore config, password, hash, token o link stampato. SQLite aperto con SQLITE_OPEN_READONLY e query_only, nessun bootstrap/migrazione o mail(). Il wrapper usa solo gli SG_* esistenti, host/porta/path fissati al progetto, host checking obbligatorio, una sola SSH; valida e limita il JSON prima di mostrarlo, maschera errori/banner e rimuove file privati/agente. Nessun remoto eseguito.

Test locale iniziale: caso passphrase errata terminato per timeout di 12s del test, prima della rete simulata. Corretto caricamento ssh-add con timeout di 5s e cleanup su terminazione; ripulito soltanto l’agente sintetico lasciato da quel caso. Suite completa successiva PASS: account assente/adulto/admin, flag attivazione, SQLite/config immutabili, mail assente/disabilitata/pronta/funzione mancante, valori sconosciuti/CRLF/JSON errato/file grande/symlink, DB assente/corrotto/schema errato, nessuna chiamata sendmail o log privato. Wrapper testato con chiave cifrata sintetica e fake SSH: argomento esplicito, host/porta/path/utente/known_hosts/chiave/passphrase, agente fallito, schema malevolo/privato/grande, stderr remoto e cleanup. PHP lint, bash syntax e bundle pubblico PASS; diagnostica esclusa dai 36 file pubblici.

Template inattivo in docs/read-only-readiness.workflow.example.yml, un solo Ubuntu e stessi permessi/secret del progetto; non registrato, nessun job extra o costo remoto sostenuto da questa preparazione. Job verify futuro su work include il test sintetico; nessuna CI remota avviata. Codice del gioco invariato dal blocco11: non ripetute le 17 suite già passate. Nessun nuovo servizio, accesso, messaggio al supporto, test email reale, recupero o deploy.

Consegna conclusiva in FINAL_HANDOFF.md: cinque punti, anteprime GitHub, prove locali contro ultima release live22f2d60, tre impedimenti residui e autorizzazioni minime. Non dichiarato completo l’intero progetto. Il lotto termina con questi artefatti; azioni esterne in attesa dell’utente/coordinatore.

## Blocco 15 — 25 ottobre: laboratorio lettere da tastiera e regressioni di interazione

Baseline work47a85aa. Problema riprodotto su fixture ospite eye: Invio sulla tessera distrugge la banca con innerHTML e il focus finisce sul body. Nuovo test tiles prima della correzione FAIL su «Choosing a letter must keep keyboard focus on an available tile or Check» (actual false). Screenshot reale prima acquisito con una tessera selezionata.

Correzione circoscritta a build delle missioni: nodi della banca conservati, focus sulla prossima tessera/Controlla, correzione sulla casella con ritorno alla tessera liberata; caselle vuote non tabbabili, nomi distinti per lettere/spazi e gruppi, stato della parola composto/progresso leggibile, pieno/vuoto distinto. Controlla rimane visibile dopo una frase lunga a 320px; lettere confermate mantengono l’aspetto pieno quando disabilitate. Guardie contro riuso di tessera e modifiche durante busy; nessuna modifica a punteggi, PHP o database, né alle sei modalità classiche. Nessuna funzione rimossa. Screenshot dopo nella stessa fase, visto e controllato: focus visibile, una tessera scelta, solo dati fittizi.

PASS nuova suite tiles: tastiera, togli/annulla lettera, lettere ripetute e spazi, doppio click sul riferimento della tessera, quattro viewport 320/390/768/1360 senza overflow/touch>=44, Indietro/Avanti dopo Pausa e personaggi, progressi confermati conservati; profilo fittizio e singola risposta server trattenuta/committata, doppio Controlla con una richiesta, tentativo di correzione durante salvataggio ignorato, reply persa e ripresa sulla domanda successiva. La casualità del tipo centrale è eliminata soltanto nella fixture SQLite temporanea, non nel prodotto. Le tessere non confermate non diventano una nuova bozza persistente: si riparte dalla prima domanda non confermata, come prima.

PASS presence estesa: Annulla invito con doppio click invia una sola richiesta, entrambi i partecipanti fittizi vedono cancelled, monete/XP invariati; poi restano funzionanti nuovo invito, accettazione, presenza e ritorno dalla sfida. Nessun cambiamento al codice arena; è copertura di regressione.

PASS browser finali pertinenti: tiles, presence, navigation, learning, resume, autonomy, review, ux, motion, performance, school (11 suite distinte). School completa 11 missioni e 13 schede, incluse preposizioni; performance mantiene WebGL 1→1 su notifiche ospite e una sola mappa allo scroll, font facoltativi non bloccanti. Presence eseguita sull’incremento prima dell’ultimo aggiustamento circoscritto al focus/compattezza del testo delle lettere; le altre dieci sul bundle finale. Nessun retry o aumento dei timeout, test disabilitato o errore nascosto.

PASS statici: node --check su tutti dist/*.js e sui test nuovi/modificati, bash -n sugli script; lessons, pwa, learning, rewards e verify-bundle. PASS API test-resume.py e test-autonomy.py con SQLite temporanei. Non ripetute API/diagnostiche/account estranei alla modifica. CI remota non avviata: aggiunto tiles al futuro job browser, push solo work. Nessun deploy, merge/main, accesso a dati reali, reset, chiave, invio email, acquisto o ticket; intervento SiteGround WordyLand resta al coordinatore, nessuna operazione su Caffè Oro.

Anteprime condivisibili in docs/review/tiles-before-390.png e tiles-after-390.png, spiegazione in LETTER_COMPOSITION_REVIEW.md; confronto focus perso→focus utilizzabile verificato, non una misura di frame rate. Ultima release live verificata resta 22f2d6028b87c0ae22029eaa211c148a7964ef69. L’incremento di oggi e quelli precedenti restano non live; impedimenti hosting/email/proprietario invariati.

## Blocco 16 — acquisti ospite e rendering anteprime

Due regressioni prima: quota locale esaurita produce equipaggiamento Panda non persistito (panda!=fox); anteprima uguale ripetuta due volte crea due contesti WebGL extra (6→8). Corretto acquisto ospite con stato candidato persistito prima di renderlo attivo, senza modificare economie; errore visibile sull’oggetto e focus ripristinato. Anteprima identica non ricostruisce la scena (6→6). Valore booleano di storeGuest ora usato soltanto dall’acquisto: altre modalità invariate.

PASS: wallet/wardrobe/rewards/characters/navigation/performance/resume; wallet e wardrobe ripetuti dopo nota errore finale. Acquisto committato con reply persa e retry resta 70 da100, inventario unico e secondo dispositivo coerente; nessun difetto server di doppio addebito emerso. Test anche scelte gratuite con quota, ritorno da anteprima/Indietro e 4 viewport. Statici JS/PWA/rewards/lessons/learning/bundle e API adventures PASS. Un timeout della nuova fixture era dovuto a mancato reload dopo finanziamento SQLite fuori banda: corretto nel test, non nascosto da retry. Nessun dato reale o azione esterna.

Dettagli e anteprima in WALLET_AUDIT.md. Prossimo blocco separato: Allenamento/Spelling secondo le nuove istruzioni, iniziando dai nomi delle lettere IT/EN; niente punti/monete/classifiche, soli adesivi finiti personali e progressi genitori privati. Nessun fonema o allineamento TTS inventato; Cambridge resta obiettivo futuro senza livello dedotto. Tutti i limiti hosting/accessi invariati.

## Blocco 17 — primo Allenamento e Spelling, dopo le precisazioni dell’utente

Nuovo perimetro esplicitamente autorizzato: basi senza prerequisiti, priorità allo scambio dei nomi IT/EN della stessa lettera; alfabeto e spelling, poi parole/frasi; niente punti/monete/classifica ma adesivi personali finiti, progressi genitori privati. Cambridge resta obiettivo futuro senza livello scelto/dedotto o simulazioni; nessun materiale classe ancora ricevuto. Sviluppato primo set riusabile: alfabeto esplorabile26, blocchi A/E B/C I/D, sei parole originali e relative frasi. Nessun fonema inventato o registrazione vocale.

Tre nuovi file pubblici training.js/php/json: controller protetto e catalogo condiviso/versionato, nuovo percorso dal menu e da Allenati; dati training_* separati dalle economie. API start/state/hint/answer/progress con ownership, ruolo genitore, CSRF, transazioni e replay. Modello ridotto dopo3 risposte autonome su2date, non dopo un solo errore; aiuti sempre disponibili. Album di3 adesivi unici per partecipazione/scoperte/ritorno senza streak o penalità. Riepilogo per competenza (nomi ascoltati vs lettere viste, parola-significato, composizione, recall e frasi), supporto/autonomia e andamento datato senza voti o diagnosi. Nessuna attività→nessun dato inventato. Guest separato, non importato nel genitore; non creati legami adulti/alunni nuovi.

Audio: voci locali lingua appropriata, prompt nomi curati e parole intere; controllo adulto per nome inglese/voce prima del quiz ascolto. Nessuna prova di ascolto accettata prima dell’onend; assenza/errore/Preferisco leggere attivano lettura dichiarata. Sequenza delle lettere tramite onend, stop/riascolto/generazioni impediscono overlap e callback dopo uscita. Test simulano IT/EN e una voce remota esclusa: non verificano pronuncia reale. Mancano registrazioni fonemiche/allineamenti affidabili, quindi non implementati o promessi. Nessun microfono, voce bambina, servizio o pagamento.

Problemi d’integrazione emersi e risolti, senza retry: il CSS della modalità gioco nascondeva il nuovo root (trainingContinue presente ma hidden), corretto escludendo trainingHub; un nuovo selettore del test attendeva due bottoni in strict mode, corretto con first; il vecchio inventario test si aspettava esattamente6 link, aggiornato a7 mantenendoli tutti. Controllo aggiuntivo reale: avvio kart dall’isola dopo Allenamento creava missione con questHub ancora hidden; riprodotto timeout su readyChallenge nascosto, corretto il passaggio all’interfaccia gioco, test PASS. Le notifiche/render del vecchio hub non devono resettare la modalità di Allenamento. Istruzioni iniziali accorciate e informazioni adulto raccolte, nessuna destinazione rimossa.

PASS API dedicata: catalogo curato/maiuscole/minuscole/frasi, privacy ruoli e proprietari (admin globale non allargato, learner può esercitarsi ma non leggere riepilogo genitore), CSRF, doppio start e replay, aiuti/reply perse/secondo device,3 successi stesso giorno insufficienti al fading, metadati lettura distinti da audio, adesivi finiti/non duplicabili, saldi/XP/inventory/crediti/rewards/stato profili/classifiche invariati anche con campi economia falsificati. Giochi precedenti continuano a premiare; expiry e cancellazione in cascata dei soli dati del profilo fittizio verificate. Nessuna risposta libera errata o voce conservata.

PASS browser training: nessuna voce→lettura onesta, scelta fra2lettere, errore/aiuto, doppio click, pause/reload, adesivi, parole/composizione/undo/recall/frase, stato giochi invariato, nuovi vocaboli anche ospite, quattro viewport, Indietro e kart dopo nuovo percorso,13temi conservati, genitore autorizzato e altro profilo senza dati. PASS spelling con voci simulate: nomi IT/EN A/E/I/B/C corretti come testo e lingua richiesti, filtro locale, controllo adulto, ascolto richiesto/concluso prima della scelta, ripeti/stop/no overlap, errore e aiuto IT, callback interrotto navigando via, errore audio→lettura, sequenza CAT see/ay/tee ordinata e progresso di ascolto distinto. Dopo guardie finali testata anche risposta registered committata ma persa: doppio click una richiesta, modalità bloccata durante salvataggio, Riprendi sulla domanda corretta e report senza duplicati.

Regressione locale:22suite browser distinte PASS nell’incremento (training, spelling, navigation, ux, learning, resume, autonomy, review, presence, pwa, rewards, motion, access, email, performance, wardrobe, parent-summary, tiles, wallet, characters, school, community). Dopo gli aggiustamenti circoscritti alla nuova area ripetuti training/spelling/navigation; dopo il passaggio al kart anche ux/characters. Cataloghi48 oggetti,6 personaggi,13 temi,6 modalità classiche, presenza/classi/segnalazioni/accesso/offline conservati. Performance vecchia isola resta1→1 su notifiche duplicate, una sola mappa allo scroll; anteprima identica zero contesti aggiunti dal blocco16.

Verifica locale:56comandi con exitcode singolarmente0, inclusi tutti statici/sintassi/API, diagnostica solo fake e deploy isolato di39file con rollback/protezioni invariati. Il primo driver aggregato aveva restituito1 pur mostrando PASS: esito non usato come conferma; deploy isolato riconfermato0 e driver con stati per ogni comando completo0. Dopo le ultime due guardie JS ripetuti node --check su tutti JS, PWA/bundle e nuovi browser; nessun PHP o contratto file cambiato in quell’ultimo passo. Asset39, training.php prima di api.php, indexultimo,33statici verificati nel simulatore; nessun vero deploy/probe/reset/email/account o supporto contattato.

Documentazione TRAINING_SPELLING.md, FINAL_HANDOFF e inventario aggiornati. Anteprime training-intro-390 e spelling-letter-390 con soli ospiti fittizi; la seconda usa voci simulate, non è prova di audio reale. Resta necessaria verifica sul dispositivo; nessuna certificazione/garanzia Cambridge. Il genitore vede solo profili già gestiti dall’account adulto: iscrizioni learner autonome non vengono collegate automaticamente. Ultimo live verificato22f2d60, tutti gli incrementi work non live. Restano hosting/email/Luca e percorso autenticato per la diagnostica già predisposta, senza aggiramenti o duplicare ticket.

## Blocco18 — roadmap autorizzata, avvio/compatibilità, 25 ottobre

Primo problema concreto: mappa fallback senza WebGL con0 scelte; correzione a8, tutte navigabili con avvio missione e ritorno, cleanup e observer facoltativi. Avviso ES5 indipendente per script mancanti/HTML di verifica o API insufficienti, senza cancellazioni, reload automatici o raccolta dati. Nessun cambiamento a account, economia o protezioni. Dettagli in COMPATIBILITY_REVIEW.md.

PASS: nuova compatibility con7scenari e baseline; nove browser navigation/performance/motion/wardrobe/pwa/training/resume/presence/community; sintassi JS pubblici, bash runner, bundle39, PWA, lesson/learning/rewards. Fallimenti non nascosti: test nuovo contava schede durante missione, corretto il test per usare Pausa→Esercizi; rewards avviato senza PHP nel PATH, singolo controllo rilanciato con ambiente giusto PASS. Nessun retry automatico. Anteprima mappa leggera verificata visivamente. Pipeline preparata con suite compatibility, non eseguita remotamente. Tablet originale, SiteGround, consegna email e recupero Luca restano dipendenze distinte; nessun deploy o accesso dati reali.

## Blocco19 — lettere complete e controllo dei punti successivi

Estesi i blocchi guidati da3 a13, coprendo26 lettere una volta ciascuna. Primi tre subito visibili, altri espandibili senza blocchi/punti. Nessun nuovo nome sintetico inventato, nessun fonema/TTS temporizzato, stessa verifica adulta e lettura esplicita; salvataggi esistenti conservati. Il catalogo e gli asset hanno hash aggiornati.

PASS: test-training.py con avvio/completamento di tutti13blocchi, copertura26, coppie, saldi/permessi/adesivi invariati; training browser con Y/Z interrotto/ricaricato/ripreso/completato e copertura precedente; spelling browser dopo selettore reso specifico. Il primo spelling aveva fallito perché `.trainingAlphabet>summary` ora corrisponde a due sezioni: corretto il test verso «Esplora tutto l’alfabeto», senza retry automatici o modifiche alla logica audio per farlo passare. Sintassi JS dedicati, PWA/cache/hash e bundle PASS.

Verificati inoltre i flussi già preparati, senza attivarli: API email-recovery/owner-recovery/read-only-readiness PASS su fixture; browser access/email/parent-summary PASS (outbox fittizia, nessun invio). Insieme al blocco18 risultano14suite browser distinte passate durante questi due incrementi, non una nuova esecuzione dell'intero verify né del live. Aggiornata matrice ROADMAP_EXECUTION.md: non si chiude l'intera roadmap con le sole regressioni. Ancora necessari hosting, versione/prova tablet, audio e consegna email reali, accesso proprietario autorizzato; future espansioni di contenuti/fonemi/offline non dichiarate implementate. Nessun merge, pubblicazione o modifica reale di accessi.

## Blocco20 — proseguimento dopo rinvio Chrome/tablet

Utente: «Chrome lo vediamo dopo passa alle altre cose». Nessuna nuova domanda/dispositivo bloccante: passato a classe/sfide. Riprodotto prima della correzione: dopo risposta confermata Pausa abilitata=false. Corretto: Pausa disponibile al feedback; su errore di risposta vecchie scelte restano disabilitate e si verifica lo stato con Riprendi prima del reinvio. Preservati messaggi specifici del server, punteggi/permessi/economia invariati. Audio della domanda arrestato su risposta/pausa/cambio domanda/route, cleanup scena e listener alla rimozione.

PASS: nuova suite duel-resilience (doppio click, pausa dopo feedback, risposta salvata ma conferma persa, richiesta mai inviata, conflitto409 da secondo dispositivo, passo/punti corretti, saldo invariato, audio sintetico); browser resume/presence/community; API resume/presence/classroom; sintassi arena/test/runner, PWA/cache/hash e bundle39. Il primo test nuovo falliva tentando un pulsante nascosto dal focus di gioco: corretto il percorso di prova al cambio route, senza retry automatici o timeout allungati. Nuova suite estesa al secondo dispositivo e ripassata. Nessun test con utenti veri o audio reale, nessuna CI/deploy/mail/credenziale. Dettaglio DUEL_RELIABILITY.md; tablet rinviato, dipendenze hosting/accesso reale ancora aperte.

## Blocco21 — ripresa WordyLand e preparazione rilascio,26ottobre

Riconciliati repo pulito work7367c70/main77e071c, main antenato. Ultimo run pubblico40128858645 failure, precedente40127589132 success; ultimo rollback verificato22f2d60. Oggi19:12UTC home ehealthHTTPS200;19:19:53 anche healthconqueryverify200JSON. La home coincide con22e77, quindi non prova quale backend sia installato. Nessun utente/dato reale letto, nessuna attivitàCaffè/cronologiaBrowser o nuova credenziale.

Rafforzato deploy con preflighthealth prima di caricare chiavi/SSH; nessun retry né bypass, nessun install/cachepurge se rifiutato. Post-check e rollback ancora rigorosi. Testfinto copre rifiuto prima di SSHconkeyfinta invalida, healthinaccessibile, rifiuto dopo installazione e rollbackmarker; tolto lintPHPduplicato. Fixturedeploy inizialmente503perclassroom.phpassente, poi corretta includendo il controllerrichiesto dall'API; aggiunti portadinamica/log sintetici. Non allentato il controllo reale.

PASS56controlli verify locali, con exitstatus percomando; PASS tutte21suitebrowserdeljob, nessun retry automatico. Fonte work e piano in RELEASE_2026_10_26.md. La prossima operazione autorizzata è aggiornare main soltanto se ancora antenato e lasciare che la pipeline configurata verifichi il medesimohealth dal runner prima di ogniSSH; nessuna pubblicazione già dichiarata. Chiavehost/account/progressi invariati; recuperi/email restano separati.

## Blocco22 — erroreCI PWA identificato e corretto prima del rilascio

Run40386474261/main2e65e56: verify PASS, browser FAIL a test-pwa-browser.cjs40:17; deploy/probe/rollback SKIPPED, nessuna installazione. Log completo dal coordinatore, fonte job121795966083. Test attendeva loadstate già soddisfatto sulla vecchia pagina, poi controllerchange/reload distruggeva il contesto durante l'asserzione cache. Ora attende un nuovoDOMcontentloaded armato prima delclick, marker di nuovo documento e account pronto. Gate del flush prova ordine salvataggio→attivazione→nuova pagina senza sleep/timeout extra/retry. PWA mirato PASS; tutti i controlli cache precedenti preservati.

Diagnostica wrapper ora riporta nel corpo suite e riga deltest, più successinotice; verificata con errorefintoexit9preservato. Sintassi e diffcheck PASS. Nessun codice gioco, hosting, account, punti o dati reali cambiato. Tentativo unico immagine ufficiale Playwright rifiutato Forbidden, non aggirato; differenza Chromium154/151 osservata ma non assunta causa. Nuovo run solo dopo questa correzione concreta, da seguire fino a deploy/live-check; nessun rilascio ancora dichiarato.

## Blocco23 — timeout preparazioneCI misurato, test preservati

Run40388219350/b2b7055 annullato per limite15min: annotazione pubblicaesplicita. Installazione dipendenze Ubuntu12mincirca, poi17/21suite PASS incl.PWA corretta suChromium151. Nessuna assertion failure; quattro suite nonavviate non dichiarate PASS. Deploy saltato, niente live nuovo.

Workflow ora separa npm/OSdeps/browser con budget3/15/3min, suite8min ejob30min (29minbudget+checkout/cleanup). Identica lista/comando21suite, versionePlaywright, env epermessi/trigger; tutti i job di verifica/deploy/probe/rollback immutati. YAML ecomparazione strutturale PASS, diffcheck PASS. Nessuna cache/servizio/nuovocosto o indebolimento test, nessuna raccolta dati o feature parallela. Nuovo run soltanto su questa modifica infrastrutturale motivata, da verificare integralmente. Tablet ancora rimandato; nessun recupero/email reale.

## Blocco24 — rilascio effettivo verificato

Run40391137928/a52715b: verifySUCCESS, browserSUCCESS con21suite e deploySUCCESS20:01:06UTC. Runtime completo26s e suite3m47s; nuovo budget non ha saltato controlli. SondaHTTPSindipendente8URLpassata20:01:42 (byteidentici/healthSQLite/nessuna challenge); browserospite realePASS26lettere13blocchi13schede48oggettituttecategorie7destinazioni, zeroerrori/POST/CAPTCHA. Prima sonda contava48nellasolacategoria15, corretta la sonda per tutte lecategorie senza modificare app. Immagine reale ospite controllata visivamente. Nessun utente/progresso reale/mail/reset letto o cambiato. Vecchi blocchicandidati ora storici, ultimo livea52715b. Documentazione soltanto suwork, no nuovo deploy.

Gapconfermati e non dichiarati completati: alternativelettere ancora2, rapporto parent-child per learnerautonomo, estrazione foto/PDF, phonics/curriculumCambridge, Allenamentooffline; audio/emaildelivery/ownerrecovery non verificati. Prossimo lotto autorizzato: alternativegraduali con progressi privati e zero nuove permissioni/punti. Tablet rimandato.

## Blocco25 — nuovo lotto autorizzato: alternative graduali

Dopo rilascio a52715b, implementati2→3→4perlettera/competenza, senza saltare pratica atre.3autonome/2date per3scelte;6autonome/3date più esperienzaatrein2date per4. Lettura/ascolto separati, distrattori solo giàincontrati, dueerrori/aiuto riducono a2 e guidano attività successive senza cancellareaggregati. Piani congelati/legacyguestv1 e crossdevice preservati; count UI validato dal server, replay non duplica pratica. Nuova tabellaprivataadditiva training_choice_steps max104righe/profilo,cascade, reportownprofile invariato nei permessi. Ospitehistorypercompetenza locale, aiuti ora salvati ancheprima dellarisposta; schema/saveguest non azzerati. NessunXP/monete/premio/ruolo/nuovoservizio.

PASS57verifycontrolli locali (incl.letter-progressionAPI e fake deploy39); PASS22suitebrowser duranteincremento incl.nuova. Nuovi test coprono soglie, no stessagiornata/saltodiretto/distrattori ignoti, veroatre, aiutimonotoni/secondodevice, nonce/replay, fallbackrecente e pausalunga,privacy/report/delete, stato corrotto,focustastiera/quattroviewport. Ultima rifinituraaiutounico riprovata in nuova suite+staticihash; screenshot sintetico controllato. Nessun retry/failure nascosto. Audio sintetico non valida dispositivo. Repository remoto riconciliato prima delcommit:maina52715b/work29dc3f6. Candidato soltanto work prima diCI, non nuova pubblicazione già dichiarata. Backlogfinito REQUIREMENTS_REMAINING.md; prossimoR2 basi, non materiali/altri accessi impliciti.

## Blocco26 — R1 effettivamente live, non roadmap completa

b3ca230/run40399687794:verify/browser/deploySUCCESS,22suite; installazione20:57:59→20:58:42UTC. Confronti indipendenti8URLtutti200/byteidentici/healthSQLite21:01:25. Browserpubblico ospite con solostoricosinteticolocale PASS2→3→4, aiuto→2, pausa/reload→2conhint, zeroerrori/POST/CAPTCHA. Nessun nuovoaccount/datovero letto, voce realenonvalidata. Immagine controllata. R1completato e sito aggiornato; R2–R8restano come REQUIREMENTS_REMAINING.md. Documentazione solo suwork per evitare nuovodeploy. Prossimo lotto finito: basi oltre6parole con temi già concordati; nessun collegamento/consenso reale implicito.

## Blocco27 — basi oltre le sei parole,26ottobre2026

Lotto finito R2:35parole uniche in6percorsi,2parole/sessione fino a9attività. Catalogo legacy `words` resta di6, nuovo `foundationWords` per client aggiornato; fallback catalogo precedente. Nuovi temi corpo/scuola/colori/numeri/saluti, frasi tradotte e collegamento alle preposizioni già illustrate. Nessun curriculumCambridge completo dichiarato. Tutti19percorsi sospesi restano visibili, senza il precedente taglio ospite o limiteAPIa4. Sessioni7giorni/aggregati/aiuti/adesivi invariati, nessuna mutazione autorizzazioni/economia. Report genitori usa sole attività reali del profilo già posseduto.

PASS testAPI esteso35parole/6percorsi/19sessioni, replay/secondodevice/privacy/snapshot; nuova suitebrowser foundations con vecchio catalogo/sessione, opzioni congelate, aiuti/reload, notebook8tessere/tastiera/annulla,19percorsi conservati,4viewport e13schede/3preposizioni preservate. PASS22suitepreesistenti locali duranteincremento; screenshot sintetico controllato. Verifica57comandi richiesta prima delmerge eCI23suite/deploy/live sono fasi distinte: non dichiarare pubblicato prima dell'esito effettivo. Nessun servizio,credenziale,email o dato bambino trasferito. Dettagli,limiti e costo risorse in FOUNDATIONS_PATH.md; R3–R8restano residui distinti.

### Blocco27 — esitoCI e stop prima diSSH

347359139b53904c13fad399e871d462062561ce/run40404823239:verify e23browserPASS; deploy21:34:35→21:34:36UTC fallitoalpublic-health-preflight conHTMLsgcaptcha inveceJSON. Annotazionepubblica confermanessunSSH/upload/install/purge: nonèunrollback enonèpubblicato.8URLindipendenti21:35:51UTC confermanob3ca230/HTTP200/readySQLite. Stopnuovideploy finchérisoluzione pertinenteSiteGround; nessunbypass/nuoviticket/accessi/costi. Rifinituraindipendente solo work:opzioniospite nonsempreprimo posto, conshuffleunico eordinepersistente; testdeterministici senza retrycasuali. FOUNDATIONS_PATH.md contieneprova,richiesta esatta modellata, limitiHTTPnonvisibili eazioneprovider minima.
