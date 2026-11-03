# Correzioni d'uso quotidiano della classe

Il filtro «Hanno giocato» comprende ora le risposte confermate di feste e Allenamento; le segnalazioni rispettano gli stessi limiti Unicode del modulo. L'accesso al dettato è esplicito dalla home, le illustrazioni Classroom distinguono i dodici oggetti e le sfide festive incomplete si riprendono entro la stagione anche dopo mezzanotte.

Base: `b23e98a74fcccfbb16cf88dd7161b92740a342db`. [WORK_STATUS.md](WORK_STATUS.md) è il registro corrente per sviluppo, collaudo e versione online; i documenti datati precedenti conservano la cronologia.

## Percorsi e comportamento

- **Home → Dettato della classe → Avvia** (`#dettato`): due azioni, avvio esplicito e grafia nascosta nel richiamo audio. Le dodici illustrazioni sono condivise fra modello e riconoscimento, con WebP lossless, PNG e testo italiano di ripiego. Tutti gli ingressi precedenti restano.
- **Allenamento** (`#allenamento`): 53 parole in otto argomenti; aggiunti numeri 11–20 senza sostituire il percorso 1–10. Dodici frasi e otto consegne originali alimentano sessioni brevi realmente giocabili. Premi cosmetici e progressi privati restano separati da punti/classifiche. Le nuove attività ospite hanno un archivio aggiuntivo, così un vecchio client non può eliminarne le sessioni come sconosciute.
- **Villaggio delle feste** (`#festivita`): una sfida incompleta conserva piano, token e risposte passando alla giornata successiva, solo entro la stessa stagione ancora aperta. I distintivi contano date server di completamento distinte. Il pannello finale resta visibile dopo la conferma; ricaricare legge lo stato corrente senza invii automatici. Sfide ripetibili, premi permanenti, calendari e Birillo dall'8 dicembre al 7 gennaio sono conservati.
- **Ripasso e Passaporto**: le difficoltà di richiamo scritto dell'Allenamento possono guidare la scelta delle parole. Modelli, aiuti e riconoscimento non diventano autonomia; nessuna fusione di XP, mastery o vecchi contatori. Successi precedenti o dello stesso giorno non nascondono una nuova difficoltà.
- **Classe → Mostra link di iscrizione → Gestisci iscrizioni e recupero accessi**: il gestore può sospendere/rinnovare nuovi inviti senza impedire il rientro agli iscritti. Recupero assistito solo per alunni autorizzati, con verifica adulta esplicita, codice privato monouso di 15 minuti e nessun reset all'emissione. Nessun dato reale è stato cambiato dagli strumenti. [Dettagli di autorizzazione](CLASS_ACCESS_MANAGEMENT.md).
- **Amministrazione e sfide**: «Hanno giocato» è distinto da «Online»; includere nuove attività non inventa iscrizioni o presenza. L'arena ordina i compagni disponibili prima del limite di 100 mantenendo l'isolamento di classe e profilo.
- **Baia dei tesori**: tre piccoli set alternati, tutti giocabili nei due renderer, con obiettivi e progresso conservati quando si cambia vista. Messaggi, bersagli, didascalia e volto non si coprono nei casi verificati. Gli altri mondi e personaggi restano.

## Prestazioni e dati

Il motore Three.js locale e versionato viene caricato quando serve, con una sola richiesta condivisa e ripiego testuale in caso di errore. Gli script iniziali passano da 1.190.627 a 557.331 byte grezzi; gzip stimato da 325.998 a 167.759 byte. Sono misure dei file, non traffico pubblico o prestazioni garantite sul tablet. La prova locale isolata di caricamento è passata con 532ms e la soglia originale di cinque secondi.

La nuova illustrazione Classroom mantiene gli stessi pixel RGBA nella codifica WebP: 1.028.944 byte invece dei 1.681.740 del PNG. Gli atlanti esistenti di feste e personaggi restano rispettivamente circa 2,70 e 1,92 MB: la consegna per singole celle/risoluzioni è una successiva ottimizzazione da validare, non una riduzione già ottenuta.

Gli errori di servizio hanno un ID casuale correlato nel log applicativo a categoria/versione/classe d'errore. Non vengono introdotti corpo richiesta, password, token, URL o identità nel log. Il codice di assistenza appare soltanto con errori server.

Il nuovo [CLI privato di backup/ripristino](DATA_BACKUP_RESTORE.md) verifica SQLite e allegati referenziati con manifest e checksum, esclude configurazioni/segreti e ripristina soltanto in una directory nuova o vuota. Non è parte del deploy, non è un cron e non è stato eseguito sui dati reali. Il rollback dei file dell'applicazione resta separato. [Limite semantico del downgrade per i distintivi](LEARNING_CONTINUITY_2026_11_03.md#limite-di-downgrade).

## Verifiche e limiti di consegna

Il candidato richiede 47 gruppi verify e 59 suite browser (30+29), conservando tutti i controlli precedenti e le stesse scadenze delle asserzioni. Le prove usano account e documenti sintetici, PHP/SQLite temporanei e Chromium locale. I controlli specifici coprono accessi/CSRF, replay/concorrenza, isolamento, inviti revocati, date di chiusura, ricarica/pausa/indietro, tastiera, 320/390/1360px, fallback e cache privata esclusa. Lo stato cumulativo e l'eventuale run di pubblicazione sono nel registro corrente.

Restano verifiche operative distinte: accesso/ruolo reale di Luca e consegna email; appartenenze effettive Best 2; backup e ripristino sull'hosting; qualità delle voci IT/EN e delle foto reali. Tablet antico rinviato dall'utente. I fonemi isolati restano esplicitamente indisponibili, senza registrazioni curate e revisionate; questo non è un curriculum Cambridge completo.

**Grinch non incluso:** la preparazione API resta separata; il precedente ritratto è stato rifiutato dal generatore, con sola categoria `other` disponibile. Nessun nuovo tentativo o personaggio sostitutivo. Non viene dichiarato completato o pubblicato.

## Memoria dell’aiuto e importazioni ospite

Il follow-up conserva nel solo ActivitiesV1 un marcatore per ogni preview già importata, indipendente dalla retention dei dettagli completati. Il V1 resta intatto e i suoi record migrati non diventano un secondo percorso di ripresa. Se la sorgente cambia in un’altra scheda, il bambino ricarica per leggere il salvataggio più recente.

Il modello completo delle parole da ricordare e delle frasi viene mostrato dopo la conferma dell’aiuto, anche se la voce non è disponibile. Dopo pausa/ricarica la risposta resta guidata; leggere una consegna resta invece una modalità distinta, senza confonderla con la risposta mostrata. La nuova prova copre dieci casi, compresi quota/rete, cambio profilo e altro dispositivo. Nessun ritocco retroattivo alle evidenze precedenti.
