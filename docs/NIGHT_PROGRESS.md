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
