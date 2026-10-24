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
