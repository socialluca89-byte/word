# Parole e spelling senza connessione — primo lotto R7

Stato: sviluppato su **work**, non pubblicato. Main resta3473591, il sito pubblico verificato resta b3ca230; il deploy è fermo al preflight SiteGround. Non aprire un nuovo deploy per questo lotto.

## Perimetro finito

La pagina `offline.html` conserva i cinque temi di ripasso illustrato e aggiunge una seconda attività ospite: sei percorsi, le35parole originali del catalogo R2, due parole/sessione e nove passi (modello, riconoscimento, composizione, scrittura per ciascuna parola, poi una frase). Le opzioni vengono mescolate e conservate alla ripresa. Le parole già incontrate ruotano in base alle attività locali confermate. I suggerimenti possono mostrare prima l'iniziale, poi tutta la parola; due errori propongono il modello senza penalità.

Si riprendono separatamente tutti e sei i temi. Restano salvati passo, aiuto, errori correnti, singole tessere scelte e testo parziale. Le tessere ripetute hanno posizioni distinte; tastiera e annullamento mantengono il focus. Il corretto viene salvato prima del feedback; doppio click non conta due sessioni. Un errore di quota non registra un avanzamento e dichiara il mancato salvataggio. Le sessioni offline locali non scadono dopo sette giorni; sono un percorso separato dalle sessioni online e non le modificano.

## Separazione da account e profili

Memoria dedicata `wordylandOfflineTrainingV1`: nessun nome, email, identificativo profilo o classe, token d'accesso, voce registrata o coda di sincronizzazione. Il browser conserva i risultati dell'ospite; chi condivide il dispositivo può vederli. Il testo esplicita questa proprietà, anche se prima si era entrati in un account. Non si inferisce l'identità e non si importano attività nel profilo online o nel report dei genitori. Saldi, XP, inventario, classifiche, progressi degli altri giochi e adesivi del percorso online restano invariati. Qui non si aggiungono punti o premi trasferibili.

CacheStorage contiene dieci soli asset pubblici, uno in più: il catalogo statico `training.json`. Nessuna API, file privato, HTML di account o risultato locale entra nella cache. Si mantengono controllo di origine/metodo/query, rifiuto API/POST, installazione con credenziali omesse, attivazione su scelta utente e pulizia delle sole cache WordyLand obsolete. Il caricamento iniziale deve avvenire con rete e attendere “ripasso pronto”; se manca il catalogo cache la pagina spiega cosa manca senza fingere che il percorso sia disponibile. Non è possibile installare questo lotto su un dispositivo mai collegato al sito.

## Audio e limiti didattici

Solo voce inglese dichiarata locale dal browser; nessun microfono o provider nuovo. Senza voce la modalità è dichiarata di lettura, con pronuncia non valutata. Il pulsante legge la parola intera, non fonemi o nomi delle lettere. I comandi di cambio area, pausa, fine risposta e uscita fermano l'audio; niente riproduzione automatica o evidenziazioni temporizzate simulate.

**R7 resta parziale:** questo lotto copre parole e spelling ospite. Il confronto dei nomi delle26lettere IT/EN e la progressione2→3→4 restano nel modulo online esistente; non vengono dichiarati offline. Non esistono sincronizzazione account delle risposte offline, invio al report genitore o collegamenti guardian–learner nuovi. Questi punti restano distinti, come audio su dispositivi reali, email/recupero, OCR e copertura Cambridge.

## Verifiche locali

- `scripts/test-offline-training-browser.cjs`: avvio a rete disattivata da service worker reale, catalogo35parole/6temi, ripresa6percorsi, quota fallita senza credito, doppio click, tessere/testo/aiuto conservati dopo reload, tastiera/annulla, frase tradotta, notebook8lettere e320/390/768/1360px, archiviazione corrotta neutralizzata, vecchi5temi preservati, nessuna API/POST o modifica ad altre chiavi locali, cache mancante gestita.
- `scripts/test-pwa.mjs` e test browser PWA: allowlist10asset, training.json pubblico esplicito, API e query arbitrarie escluse, nessun risultato in cache, account sintetico isolato, cold start, vecchio ripasso, aggiornamento in attesa e altre cache preservate.
- Regressioni correlate con esito finalePASS: foundations (anche posizioni ospite variabili/congelate), training, letter-progression, compatibility, navigation, performance, access, oltre alla PWA e alla nuova offline-training (nove suite complessive). Per performance restano registrati i fallimenti precedenti e il limite indicato sotto.
- Batteria verify completa:57comandi locali, incluse privacy/account/ruoli, giochi, hash del bundle e deploy finto. Nessun deploy reale o CI nuova sul lotto work.
- Screenshot locale `docs/review/offline-training-390.png`, dati sintetici e voce assente, ispezionato visivamente; non è un'anteprima del sito live.

Nel primo giro parallelo il testperformance ha chiuso la pagina lasciando rifiutare la promessa dell'osservatore font senza handler; questa eccezione nascondeva l'errore originario, che non è ricostruibile dal log prodotto. Ora navigazione e osservatore sono entrambi attesi immediatamente con Promise.all; le soglie e le assertion restano identiche (load5secondi), senza retry. Una seconda esecuzione ha esposto un timeout reale di page.goto/load dopo5secondi. Aggiunta una diagnostica delle sole risorse pendenti, il test successivo è passato senza modificare le soglie:1contestoWebGL iniziale, mappa fuori schermo0, dopo scroll2totali/1mappa, su390e1360px. Il PASS finale non dimostra retroattivamente la causa del primo errore o una stabilità dei tempi già risolta: il timeout locale resta una osservazione da approfondire. I log dei fallimenti non sono cancellati e non vengono nascosti con retry automatici.
