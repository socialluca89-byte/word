# Parole e spelling senza connessione — primo lotto R7

Stato: sviluppato su **work**, non pubblicato. Main resta3473591, il sito pubblico verificato resta b3ca230; il deploy è fermo al preflight SiteGround. Non aprire un nuovo deploy per questo lotto.

## Perimetro finito

La pagina `offline.html` conserva i cinque temi di ripasso illustrato e aggiunge una seconda attività ospite: sei percorsi, le35parole originali del catalogo R2, due parole/sessione e nove passi (modello, riconoscimento, composizione, scrittura per ciascuna parola, poi una frase). Le opzioni vengono mescolate e conservate alla ripresa. Le parole già incontrate ruotano in base alle attività locali confermate. I suggerimenti possono mostrare prima l'iniziale, poi tutta la parola; due errori propongono il modello senza penalità.

Si riprendono separatamente tutti e sei i temi. Restano salvati passo, aiuto, errori correnti, singole tessere scelte e testo parziale. Le tessere ripetute hanno posizioni distinte; tastiera e annullamento mantengono il focus. Il corretto viene salvato prima del feedback; doppio click non conta due sessioni. Un errore di quota non registra un avanzamento e dichiara il mancato salvataggio. Le sessioni offline locali non scadono dopo sette giorni; sono un percorso separato dalle sessioni online e non le modificano.

## Separazione da account e profili

Memoria dedicata `wordylandOfflineTrainingV1`: non richiede né associa nome, email, identificativo profilo o classe; non salva token d'accesso, voce registrata o code di sincronizzazione. Conserva però anche la risposta scritta parziale dell'esercizio (sole lettere, massimo 30 caratteri) e le posizioni delle tessere per permettere la ripresa: un nome digitato liberamente potrebbe quindi restare nella risposta locale. Questi dati e i risultati dell'ospite non sono cifrati né isolati fra persone che condividono il browser; chi usa lo stesso browser può vederli. Il testo esplicita questa proprietà, anche se prima si era entrati in un account. Non si inferisce l'identità e non si importano attività nel profilo online o nel report dei genitori. Saldi, XP, inventario, classifiche, progressi degli altri giochi e adesivi del percorso online restano invariati. Qui non si aggiungono punti o premi trasferibili.

CacheStorage contiene dieci soli asset pubblici, uno in più: il catalogo statico `training.json`. Nessuna API, file privato, HTML di account o risultato locale entra nella cache. Si mantengono controllo di origine/metodo/query, rifiuto API/POST, installazione con credenziali omesse, attivazione su scelta utente e pulizia delle sole cache WordyLand obsolete. Il caricamento iniziale deve avvenire con rete e attendere “ripasso pronto”; se manca il catalogo cache la pagina spiega cosa manca senza fingere che il percorso sia disponibile. Non è possibile installare questo lotto su un dispositivo mai collegato al sito.

## Audio e limiti didattici

Solo voce inglese dichiarata locale dal browser; nessun microfono o provider nuovo. Senza voce la modalità è dichiarata di lettura, con pronuncia non valutata. Nel percorso parole il pulsante legge la parola intera. Nel percorso lettere i pulsanti IT/EN leggono i nomi curati delle lettere, non fonemi. I comandi di cambio area, pausa, fine risposta e uscita fermano l'audio; niente riproduzione automatica o evidenziazioni temporizzate simulate.

**Estensione successiva: lettere IT/EN offline implementate su work**,26lettere/13blocchi. Il percorso ospite pubblico include ora lettere, parole e spelling. Restano esclusi sincronizzazione account, invio al report genitore, collegamenti guardian–learner e progressione adattiva2→3→4 offline (questa rimane online). La qualità delle voci sui dispositivi reali richiede ancora controllo umano, come email/recupero, OCR e copertura Cambridge restano distinti.

## Verifiche locali

- `scripts/test-offline-training-browser.cjs`: avvio a rete disattivata da service worker reale, catalogo35parole/6temi, ripresa6percorsi, quota fallita senza credito, doppio click, tessere/testo/aiuto conservati dopo reload, tastiera/annulla, frase tradotta, notebook8lettere e320/390/768/1360px, archiviazione corrotta neutralizzata, vecchi5temi preservati, nessuna API/POST o modifica ad altre chiavi locali, cache mancante gestita.
- `scripts/test-pwa.mjs` e test browser PWA: allowlist10asset, training.json pubblico esplicito, API e query arbitrarie escluse, nessun risultato in cache, account sintetico isolato, cold start, vecchio ripasso, aggiornamento in attesa e altre cache preservate.
- Regressioni correlate con esito finalePASS: foundations (anche posizioni ospite variabili/congelate), training, letter-progression, compatibility, navigation, performance, access, oltre alla PWA e alla nuova offline-training (nove suite complessive). Per performance restano registrati i fallimenti precedenti e il limite indicato sotto.
- Batteria verify completa:57comandi locali, incluse privacy/account/ruoli, giochi, hash del bundle e deploy finto. Nessun deploy reale o CI nuova sul lotto work.
- Screenshot locale `docs/review/offline-training-390.png`, dati sintetici e voce assente, ispezionato visivamente; non è un'anteprima del sito live.

Nel primo giro parallelo il testperformance ha chiuso la pagina lasciando rifiutare la promessa dell'osservatore font senza handler; questa eccezione nascondeva l'errore originario, che non è ricostruibile dal log prodotto. Ora navigazione e osservatore sono entrambi attesi immediatamente con Promise.all; le soglie e le assertion restano identiche (load5secondi), senza retry. Una seconda esecuzione ha esposto un timeout reale di page.goto/load dopo5secondi. Aggiunta una diagnostica delle sole risorse pendenti, il test successivo è passato senza modificare le soglie:1contestoWebGL iniziale, mappa fuori schermo0, dopo scroll2totali/1mappa, su390e1360px. Il PASS finale non dimostra retroattivamente la causa del primo errore o una stabilità dei tempi già risolta: il timeout locale resta una osservazione da approfondire. I log dei fallimenti non sono cancellati e non vengono nascosti con retry automatici.

## Lettere IT/EN — estensione finita

Ogni blocco ha quattro passi: modello e scelta fra due per ciascuna lettera. Si confrontano maiuscola/minuscola e nome italiano/inglese; il modello non viene eliminato sulla base di una singola risposta. Tutti13blocchi sono raggiungibili, i primi3in evidenza e gli altri in un pannello espandibile. Non ci sono timer, penalità, XP o classifiche.

La voce deve dichiararsi locale e avere la lingua corretta. I pulsanti nominano la lettera con il mapping curato già usato online; non sintetizzano un fonema a partire dalla grafia. L'adulto può confermare il nome inglese soltanto dopo la fine dell'ascolto, per quella lettera e per quella voce. Il controllo è una preferenza didattica locale, non un'autenticazione dell'adulto o una garanzia di correttezza acustica. Un'altra voce non eredita il controllo. I test con voci simulate non validano la pronuncia reale.

Finché il nome non è verificato o la voce non è disponibile, il gioco è etichettato come lettura e mostra la lettera. Nella modalità ascolto le risposte attendono la conclusione dell'audio; annullamento non equivale ad ascolto concluso. Si può sempre scegliere di leggere, usare il nome italiano come aiuto o tornare al modello. Due errori propongono il modello; aiuti ed errori correnti restano alla ripresa. Errore audio e cambio motore/voce non fingono una prova d'ascolto. Pausa, cambio area, fine risposta e uscita annullano il parlato, con callback obsolete ignorate.

La memoria offline versione1 viene estesa in modo additivo con `letterSessions`, `letterCompleted` e `voiceChecks`, limitati a blocchi/lettere del catalogo e16voci. Non vengono modificati `wordylandTrainingGuest`, `wordylandLetterVoiceCheck`, account, progressi parole o saldi. I controlli vocali offline restano nell'ospite offline. È memoria anonima del browser, visibile su un dispositivo condiviso, senza isolamento fra utenti del medesimo browser o sincronizzazione atomica fra schede. Usare un solo percorso aperto per volta; non viene promessa sincronizzazione multischeda.

CacheStorage rimane di10asset pubblici: nessun asset privato aggiunto. Il catalogo statico già contiene26lettere e13blocchi, quindi non si scaricano registrazioni o servizi nuovi. I risultati locali non entrano in cache né nella coda online. La sessione aggiorna il passo prima del feedback e non avanza se il salvataggio fallisce. Il ripasso illustrato e i percorsi parole restano raggiungibili.

Test `scripts/test-offline-letters-browser.cjs`: tutte26lettere, verifica adulta per voce, IT/EN distinti e locali, annullamento e callback tardive, assenza di sovrapposizione, gating ascolto, errore audio, errori/aiuti/reload, cambio voce e sola voce remota, quota fallita e stato corrotto, progressi parole/tessere preservati, quattro viewport e risposte visibili insieme alla domanda sui320/390px. Solo dati sintetici; nessuna API/POST o cache di account. L'anteprima `docs/review/offline-letters-390.png` è locale, non live.

La diagnosi prestazioni aggiornata, incluse le cinque prove e il controllo negativo atteso, è in PERFORMANCE_TIMEOUT.md. Le vecchie osservazioni sopra restano storia del primo lotto; non equivalgono a nuove pubblicazioni.

## Difetto collaterale riprodotto nei test accessi

La regressione access ha mostrato un timeout aspettando la conferma di cambio password dell'alunno. Un caso controllato (salvataggio del profilo immediatamente al segnale di conferma) ha riprodotto la sparizione: `accountStatus` diventa “Progressi salvati…”, poi “Progressi sincronizzati…”, coprendo il risultato della password. La correzione client mantiene il risultato nel nuovo `passwordChangeStatus` dentro il modulo, lasciando compatibile anche l'annuncio globale. Nessuna modifica a endpoint, password, sessioni, ruoli o permessi server.

Il test adesso forza quel salvataggio, attende la sincronizzazione e verifica che la conferma password sia ancora visibile. Conserva prove su password errata, conferma diversa, cambio, logout fallito, recupero adulto/alunno e login; raccoglie soltanto messaggi UI, nomi azione e statusHTTP sintetici in caso di errore, senza valori di password/codici/token. Il browser viene sempre chiuso anche se il test fallisce.

I fallimenti precedenti non vengono cancellati: una prima prova controllata si era fermata già alla registrazione (causa non determinata), e la prima versione del diagnostico aveva un errore di scope nel catch, corretto senza toccare l'app. La traccia dello stato password era comunque stata acquisita prima di quell'errore. Il PASS del caso sincronizzazione dopo la correzione dimostra il difetto UI riprodotto; non spiega retroattivamente il singolo timeout di registrazione.

## Esito del lotto lettere offline

PASS57controlli verify locali durante l'incremento, PASS tutte25suitebrowser del workflow con copertura conservata; rifiniture finali riprovate su lettere/parole offline e su hash/PWA/bundle. Test access con sincronizzazione forzata PASS; PWA/email simulata/navigazione ricontrollati dopo la correzione del feedback. Prestazioni finali isolate PASS load2074.2ms, soglia5s invariata;5prove diagnostiche iniziali e controllo negativo sono separati da questo conteggio.

Nella verifica mobile un doppio click sul modello poteva, per lo scroll automatico del focus, colpire anche il successivo Continua: la conferma salvava un solo passo ma la vista avanzava già alla domanda. Ora il focus del feedback usa preventScroll e le conferme restano vicino alle risposte, senza ritardi/timeout aggiuntivi. Il test verifica esplicitamente che dopo il doppio click il feedback/Continua rimangano aperti. Pausa, domanda e risposte sono controllati insieme nel viewport320/390px.

Non è una nuovaCI o pubblicazione: main3473591 e ultimo live verificatob3ca230 restano invariati. I fallimenti prestazioni/accesso e le riproduzioni sono documentati; non viene dichiarata risolta una causa storica non dimostrata. Nessun nuovo account reale, recuperoLuca, invioemail o ampliamento dei permessi. La richiesta SiteGround resta non inviata con autorizzazione specifica pendente.
