# Backup e ripristino privati dei dati WordyLand

Questo strumento CLI prepara un backup verificabile di SQLite e degli allegati referenziati. Non è un endpoint web, non è installato in `public_html` e non viene eseguito da deploy, cron o workflow. **È stato provato soltanto con dati sintetici locali.** Non dimostra che i backup SiteGround siano configurati o ripristinabili.

## Cosa contiene

Uno snapshot contiene esclusivamente:

- `wordyland.sqlite`: copia consistente tramite l’API SQLite backup, incluse tutte le tabelle originali;
- `materials/<32 caratteri esadecimali>.bin`: soltanto file presenti nei riferimenti `studies.file` della copia del database;
- `manifest.json`: versione formato, data UTC, dimensioni e SHA256 dei file.

Non vengono copiati configurazioni mail, istruzioni di attivazione, chiavi SSH, file arbitrari della directory dati, sessioni PHP o allegati non referenziati. Il database contiene gli hash di accesso e gli altri dati dell’applicazione: va protetto come il database originale. Lo strumento non genera credenziali e non modifica password, ruoli, profili o progressi nella sorgente.

SHA256 rileva differenze rispetto al manifest; **non è una firma crittografica** e non rende attendibile uno snapshot ricevuto da una fonte sconosciuta. Snapshot e manifest devono rimanere nello stesso archivio privato controllato.

## Requisiti e percorsi

Python 3.8+ con modulo `sqlite3`, filesystem POSIX con `O_NOFOLLOW`, un database WordyLand già inizializzato. La compatibilità del runtime Python del vero hosting non è stata verificata.

Tutti i percorsi devono essere assoluti, senza `..`, symlink o componenti `public_html`. La sorgente deve chiamarsi `.wordyland-data`. Le directory private coinvolte devono appartenere all’utente CLI e non essere accessibili al gruppo/altri utenti. La directory genitore dell’output deve già esistere con permessi `0700`.

Gli antenati esistenti devono appartenere a root o all’utente CLI e non essere scrivibili da gruppo/altri, salvo directory condivise protette dal bit sticky come un `/tmp` di proprietà di root. I percorsi devono restare sotto il controllo dell’operatore: l’esecuzione non protegge da sostituzioni ostili delle directory da parte di processi con lo stesso UID.

Il nuovo snapshot è creato in modo esclusivo: un percorso già esistente, anche vuoto, viene rifiutato. I file vengono creati `0600`, le directory `0700`. Nessun file temporaneo viene scritto nel document root.

La copia non viene pubblicata atomicamente: la directory esclusiva può essere visibile durante il lavoro, ma `manifest.json` viene scritto per ultimo. Usare soltanto snapshot per cui `backup` e il successivo `verify` terminano con successo; un’interruzione brusca può lasciare un output incompleto che `verify` rifiuta.

## Creare e verificare uno snapshot

Esempi con percorsi segnaposto, da eseguire solo come operazione privata autorizzata:

```sh
python3 scripts/data-snapshot.py backup \
  --data-dir /percorso/privato/wordyland.eu/.wordyland-data \
  --snapshot /percorso/privato/backup/snapshot-univoco

python3 scripts/data-snapshot.py verify \
  --snapshot /percorso/privato/backup/snapshot-univoco
```

Scegliere un nome nuovo per ogni snapshot. Il risultato JSON contiene soltanto esito, operazione, numero di allegati e versione formato. Non stampa percorsi, nomi di utenti, contenuti, hash di password, token o configurazioni. Gli errori sono codici fissi redatti; non vengono riversati traceback o messaggi SQLite con dati applicativi.

## Coerenza mentre l’app è aperta

Il tool acquisisce un breve `BEGIN IMMEDIATE` da una connessione separata, senza eseguire scritture SQL sulla sorgente. Una seconda connessione legge il database tramite SQLite backup, includendo eventuali dati già confermati nel WAL. Il lock impedisce che nuove modifiche del database cambino l’insieme dei riferimenti mentre viene fotografato.

Prima di rilasciare il lock vengono aperti, senza seguire symlink, tutti gli allegati referenziati. La copia pesante degli allegati avviene **dopo** il rilascio. Un file immutabile già aperto resta leggibile anche se l’applicazione completa successivamente `DELETE` + `unlink`: snapshot del database e file conservano lo stesso stato precedente. Un file mancante prima dell’apertura, una modifica in-place rilevata o un errore di copia fanno fallire e pulire il solo nuovo output.

L’attesa per un altro writer è limitata a 2 secondi; il lavoro protetto ha budget di 3 secondi, controllato tra i passi SQLite e le aperture dei file. Non è una scadenza assoluta per una syscall del filesystem bloccata. Un dataset o filesystem troppo lento, troppi file per i limiti del processo o contesa possono far fallire l’operazione: il tool non dichiara riuscito un backup parziale. Non alza i limiti e non riavvia servizi. Le scritture dell’app possono attendere durante questo breve lock; la copia degli allegati non lo prolunga.

Le operazioni normali dell’app creano file casuali nuovi o li eliminano; non modificano in-place gli allegati salvati. Il tool verifica identità/dimensioni/mtime dei file durante la copia. Non è un protocollo contro un attaccante che controlli contemporaneamente filesystem e manifest con lo stesso utente.

## Ripristinare solo in una directory nuova o vuota

```sh
python3 scripts/data-snapshot.py restore \
  --snapshot /percorso/privato/backup/snapshot-univoco \
  --target-dir /percorso/privato/prova-ripristino
```

Lo strumento verifica prima di scrivere: layout esatto, allowlist, permessi, SHA256/dimensioni di tutti i file, integrità SQLite, foreign key e corrispondenza esatta fra `studies.file` e allegati. Rifiuta file aggiuntivi, percorsi incorporati nel manifest, symlink, file mancanti e checksum errati.

Poi costruisce una directory di staging privata nuova nello stesso genitore e copia soltanto database e allegati. Ripete la verifica del database e pubblica il risultato con rename. Se il target diventa non vuoto nel frattempo, il rename viene rifiutato e il contenuto altrui rimane intatto. Il cleanup riguarda soltanto lo staging creato dal tool. Il manifest del backup non viene copiato nella directory dati ripristinata.

**Non esiste un ripristino sul posto.** La directory dati attiva, non vuota, viene rifiutata. Nessun cambio di percorso dell’app, sostituzione del database attivo o cutover è automatico. Il risultato è una prova/copia separata da controllare. La sua eventuale adozione reale è un’operazione distinta, con valutazione dei dati successivi allo snapshot, configurazioni private e sessioni correnti. Il tool non migra o reimposta gli accessi: la copia riproduce lo stato degli hash e dei ruoli presente nello snapshot.

## Verifica locale e limiti di consegna

```sh
python3 scripts/test-data-snapshot.py
```

Fixture sintetiche: account/ruolo/hash, profili, progressi, inventario e allegati; roundtrip; directory nuova e vuota; output esistente/non vuoto; source/target pubblici o sovrapposti; symlink; traversal; file/config aggiuntivi; tamper; foreign key invalide; sorgente mancante o mutante; due connessioni vive con WAL non checkpointato; writer concorrente; eliminazione allegato dopo apertura dei descriptor; target riempito durante il rename; errori senza contenuti privati.

Questa verifica dimostra il comportamento del tool sui casi sintetici. Restano da verificare separatamente disponibilità sul vero hosting, politica/retention dei backup del provider, trasferimento/conservazione privata fuori dal server e una procedura autorizzata di recupero in caso di incidente. Non sono stati letti né esportati dati reali in questo lavoro.
