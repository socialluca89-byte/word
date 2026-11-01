# Revisione completa dei percorsi WordyLand

La revisione parte dai gesti effettivi di un bambino e di un adulto, includendo interruzioni e problemi di rete o spazio. Una suite verde o un'illustrazione caricata non dimostrano da sole che tutte le entrate portino alla stessa esperienza. Non si dichiara perfezione universale: ogni risultato è circoscritto alle prove riportate.

## Stato di pubblicazione

Ultima versione live verificata:901fd989cf79d84e651164af5ccc8f6774e53bf1. Main5d4c6b2 aveva passato verify e38suite browser, ma il run41344585348 è stato fermato dall'anti-bot SiteGround al preflight, prima di SSH/caricamento. Questa revisione prosegue solo sul ramo di lavoro. Nessun nuovo probe al sito, contatto assistenza, cambio IP, credenziale o protezione. [Blocco documentato](RELEASE_BLOCK_2026_11_01_GAMEPLAY.md).

Il workflow ora può verificare il ramo di revisione senza pubblicare: solo verify/browser, permesso contents:read, condizioni main per deploy/probe/rollback invariate. L'esito di CI va letto sul commit esatto in Actions; non è dedotto dalla presenza di questo documento.

## Problemi riprodotti e perimetro delle correzioni

| Area | Difetto effettivo | Comportamento verificato richiesto |
| --- | --- | --- |
| Accesso di ritorno | GETprofilo fallito cancellava i comandi pur avendo sessione valida | Adulto e alunno possono riprovare il caricamento, senza nuovo login o profilo duplicato |
| Ospite→profilo | Backup rifiutato per quota consentiva perdita e mescolamento dei dati | Backup confermato prima di applicare il profilo; ospite vuoto con fallback pulito |
| Uscita | Risposta logout persa dopo commit lasciava un falso accesso, poi403 | GETsession riconcilia l'uscita; niente POST ripetuto automaticamente o cancellazione di un nuovo contesto |
| Identità locale | Marcatore profilo non salvato consentiva sovrascrivere il backup ospite al reload | Conferma di identità persistita prima dell'applicazione del profilo |
| Accesso non verificato | Cache dell'ultimo account appariva come dati ospite | Superfici private in pausa fino a verifica; copie locali conservate e recuperabili solo dal proprietario verificato |
| Home→Allenamento | Pulsanti Isola/Classe cambiavano una scheda nascosta | Destinazione realmente visibile, con stato Allenamento lasciato correttamente |
| Cronologia | Indietro lasciava la home nascosta dal precedente focus di gioco | Indietro/Avanti ripristinano superfici e sessioni riprendibili |
| Identità e collegamenti diretti | La pulizia immediata della vecchia vista precedeva il routing e perdeva `#sfide`/`#allenati` durante il caricamento | Dopo il caricamento del profilo, il router riapre l’ultimo hash effettivo quando i comandi esistono; pause e reload conservano la domanda |
| Nome | Editor ospite non raggiungibile, oppure nome locale confuso con online | Editor nel Box; con profilo attivo si apre il vero modulo account senza rinomina implicita |
| Operazioni in corso | Durante acquisto, un collegamento cambiava hash senza aprire la pagina | L'ultima destinazione richiesta si apre dopo la conferma; esito visibile, nessun doppio addebito |
| Uscita con acquisto pendente | Dopo logout restavano nome e saldo del precedente profilo fino alla risposta rallentata | Il DOM privato scompare immediatamente; il nuovo contesto si carica con i propri dati e ignora la risposta tardiva |
| Sfide | Compariva la volpe anche con altro personaggio equipaggiato | Aspetto del proprio profilo dal server, aggiornato dopo pausa/reload/secondo dispositivo; lettura senza premi o altre scritture |
| Sfide su telefono | Personaggio tagliato, ingresso a metà pagina e risposte tutte sotto il viewport | Scena e accessori interi; ingresso all'inizio, prima risposta visibile; spiegazioni complete nell'aiuto |
| Guardaroba | Distintivi/tavolozze invisibili, azioni ignoravano alcune skin | Tutti97oggetti rappresentati; skin effettivamente equipaggiate e nomi comprensibili |
| Guardaroba | Titoli/controlli coprivano cappello, corona e medaglia | Titolo e controlli fuori immagine, geometria verificata320/390/desktop |
| Zoom | Primo Avvicina non faceva nulla nelle illustrazioni | Primo gesto ingrandisce, successivo ripristina |
| Componi | Ogni tessera eliminava il focus; anche Continua interrompeva la tastiera | Banca stabile, scelta/rimozione/conferma/prossima parola raggiungibili con tastiera |
| Missione ospite | Falsa conferma di salvataggio, premi persi se il browser rifiutava la scrittura | Wallet e missione in unico commit locale; niente avanzamento o premi su errore; vecchi draft compatibili |
| Più schede | RAM vecchia sovrascriveva risposta, acquisto o passo di Allenamento confermati altrove | Conflitti osservabili bloccati prima della scrittura, istruzione chiara per caricare l'ultimo stato |
| Offline | Audio della parola precedente proseguiva sulla domanda nuova | Annullamento su cambio parola/tema/superficie/uscita; callback vecchi ignorati, errori reali mostrati |
| Offline | Scheda vecchia poteva far regredire il percorso pubblico | Conferma persistita conservata e comando reale per ricaricare gli ultimi progressi |

Il confronto fra schede rileva modifiche già persistite e osservabili; non è presentato come transazione CAS garantita fra processi. Il commit wallet+missione è invece un solo valore JSON nella medesima scrittura locale.

## Matrice di accettazione

- **Ingressi e navigazione:** home, sei modalità classiche, otto mondi, Allenamento/Spelling, guardaroba, sfide, classe, villaggi, scoperte e servizi; hash già corrente, Indietro/Avanti, operazione rallentata, touch e tastiera.
- **Esercizi:** modello/ascolto/aiuto, errore, risposta corretta, avanti, completamento, pausa/ripresa, quota e risposte di rete interrotte; grafia e contenuti originali conservati.
- **Profili e dati:** adulto/alunno/ospite, profili dello stesso account, altro account, stesso/secondo dispositivo, backup, sessione scaduta, conflitto e logout. Solo dati sintetici.
- **Personaggi e premi:**97oggetti e accessori, anteprima gratuita e temporanea, uso reale nei tre tipi di sfida, conservazione dell'economia, eventi Roma e calendario tra anni, nessun premio dal semplice gesto dimostrativo.
- **PWA/offline:** installazione e aggiornamento esplicito, salvataggi prima del reload, cache pubblica isolata, cold start, parole e lettere offline, voci simulate e cambio superficie; nessuna API o profilo privato in CacheStorage.
- **Sicurezza funzionale:** autorizzazione del proprio profilo, CSRF, classi private, risposte duplicate, nessun bootstrap o reset reale; deploy con backup e rollback resta invariato.
- **UI:**320/390/1180px e larghezze precedenti, testo grande, azioni visibili e coerenti, immagini reali del renderer, accessori non coperti, movimento ridotto e pausa.

## Verifiche e limiti

Le nuove regressioni account-resilience, game-resilience, journey-navigation, appearance-consistency, duel-identity e offline-audio esercitano il default illustrato reale. Le regressioni dei modelli3D restano distinte e preservate. I file vengono rigenerati prima del collaudo finale, per includere il build effettivo.

Nessun utente reale, dato degli alunni, messaggio o invio email usato. Nessun servizio nuovo, acquisto, registrazione voce o ampliamento degli accessi. Mock vocali non dimostrano pronuncia reale; foto/PDF sintetici non garantiscono lettura della calligrafia. Tablet originale, consegna email reale, recupero dell'account proprietario e legami genitore–alunno non vengono dichiarati verificati da questa revisione. I limiti educativi e il riferimento futuro Cambridge restano quelli documentati, senza certificazione o promessa di un curriculum completo.

## Evidenze del candidato

[Copertura e verifiche](FULL_PRODUCT_REVIEW_VERIFICATION.json) e [schermate reali](review/README.md). La revisione indipendente ha fermato una prima variante non sicura del recupero, in cui identità e dati provenivano da due chiavi diverse: il candidato finale li lega in un unico valore canonico, con migrazione controllata del vecchio formato. Il mirror classico non può più diventare automaticamente dati di un altro profilo. La copia locale sospesa è una sola, limitata e verificata sul proprietario; non esiste uno storico automatico di profili. Nessuna fusione automatica dei contatori.

I file sono stati rigenerati due volte con esito byte-identico prima del candidato. La matrice cumulativa contiene35controlli verify e44suite browser; il risultato finale va verificato sul commit esatto in Actions. Il ramo di revisione non può pubblicare.

## Esiti intermedi conservati

Il primo candidato `d98db8d` ha passato35controlli verify. Il run [41353137047](https://github.com/socialluca89-byte/word/actions/runs/41353137047) e la matrice locale si sono fermati allo stesso controllo del villaggio: la sonda selezionava l’ultima scena creata nella pagina, non quella effettivamente disegnata nel canvas del villaggio. La regressione ora collega ogni frame al suo canvas e verifica sia `#holidayWorld` sia il personaggio nel vero `#missionWorld`; nessuna asserzione è stata eliminata. La suite festività corretta è passata localmente. Il risultato cumulativo finale deve essere letto sul nuovo commit esatto.

La nuova prova di uscita durante un acquisto rallentato controlla nome e saldo **prima** di liberare la risposta già confermata dal server. Dopo la risposta, l’ospite resta separato e il saldo non viene sovrascritto. La ripetizione dei due percorsi di navigazione durante acquisto continua a verificare l’assenza di doppi addebiti.

Il candidato intermedio `d687594` ha passato35controlli verify ma si è fermato, localmente e nel [run41354984446](https://github.com/socialluca89-byte/word/actions/runs/41354984446), alla ripresa della sfida dopo reload. La pulizia immediata del DOM al cambio profilo precedeva il routing di `#sfide`: il comando non esisteva ancora. La correzione richiama il router dopo che la vista del profilo corrente è pronta. Le asserzioni di ripresa e domanda esatta sono conservate; aggiunta copertura del collegamento diretto `#allenati` e del suo reload. Nessun deploy è stato eseguito dai run di revisione.
