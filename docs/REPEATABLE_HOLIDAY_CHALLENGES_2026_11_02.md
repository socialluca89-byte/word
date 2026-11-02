# Più sfide per conquistare i personaggi

Richiesta dell'utente: il vincolo di una sola sfida al giorno rallenta gli sblocchi. Durante il periodo dell'evento devono essere disponibili altri esercizi per continuare a conquistare personaggi e accessori, conservando tutti i premi e le funzioni precedenti.

## Comportamento

- La prima missione giornaliera resta disponibile e compatibile con gli storici.
- Dopo tre prove confermate, **Un’altra sfida** apre altre tre prove. È una scelta esplicita, senza conto alla rovescia, penalità o avvio automatico.
- Tutti gli esercizi confermati dei giri dell'evento fanno avanzare gli sblocchi a esercizi. Gli attuali dodici personaggi natalizi sono raggiungibili nella stessa data completando le relative soglie (fino a30esercizi), senza attendere dieci giorni.
- I distintivi per1/3/5giornate richiedono ancora date distinte. Fare più giri non simula nuove giornate.
- Il premio si ottiene una sola volta e resta utilizzabile dopo la chiusura dell'evento; nessuna nuova moneta/XP o modifica alle classifiche.
- Finestre annuali del server Europe/Rome, Birillo e gli altri giochi rimangono invariati. La missione annuale del Passaporto conserva la propria cadenza giornaliera.
- Una sfida incompleta si può riprendere nello stesso giorno e da un altro dispositivo. Come nella versione precedente, a mezzanotte italiana la sfida dell'evento scade: gli esercizi già confermati restano conteggiati, e la nuova giornata offre una nuova missione.

## Salvataggio e sicurezza

La nuova `holiday_rounds` è aggiuntiva; nessuna riscrittura o cancellazione delle righe `holiday_days`, dell'inventario o degli account. I premi a esercizi sommano entrambe le fonti; i distintivi delle date usano le giornate originali completate.

Il client invia `another:true` e `after:tokenCompletato`. Il server verifica proprietà, evento/data, completamento del predecessore e giro corrente dentro `BEGIN IMMEDIATE`. Un doppio clic o un retry tardivo non apre un ulteriore giro se quello successivo è già stato creato o completato. Un giro sospeso ha priorità. Risposta corretta, passo e premio condividono la transazione; replay e aiuti non duplicano crediti.

In caso di risposta persa, il bambino usa **Verifica e riprendi**: solo GET, nessun nuovo POST automatico. Richieste tardive di un altro profilo non ridisegnano la vista corrente. Cache offline, confini delle classi e collegamenti genitori non cambiano.

## Prove e limiti

Verifiche locali completate:

- Tutti i quattro blocchi del job `verify` (39gruppi di controllo), comprese le regressioni di distribuzione/rollback.
- API festività estesa:30risposte nello stesso giorno, tutti i personaggi a esercizi, doppio avvio su due worker PHP, retry dopo completamento su altro dispositivo, aiuti/errori, storici, badge, chiusura e proprietà permanente.
- Nuovo browser `holiday-rounds`:9risposte tramite UI nella stessa data, premio reale, doppio clic e risposta di apertura persa con un solo POST, GET di recupero, tastiera, pausa/reload, secondo dispositivo, cambio profilo durante risposta, offline e uso dopo chiusura.
- API Passaporto ed elfo preesistenti passate. La revisione statica indipendente non ha rilevato problemi bloccanti.
- Tutte sette le regressioni browser pertinenti sono passate sugli stessi byte: festività, calendario, personaggi Natale, elfo, Passaporto, illustrazioni e guardaroba. Nessun retry, soglia alzata o asserzione rimossa. Digest applicativo: `f6a961a0aba6008490c10426fbc3e8d77afb0212ff01b5767b54756f0ed1e68e`.

[Anteprima390px](review/holiday-rounds-390.png), [320px](review/holiday-rounds-320.png), [desktop](review/holiday-rounds-1360.png): catture reali con dati sintetici, non account reali. Il runtime locale è PHP8.4.24/SQLite, Playwright1.62.1 e Chromium del sistema. Non provano compatibilità del vecchio tablet fisico o qualità dell'audio reale.

La CI completa sul commit finale stabilisce il risultato cumulativo. Il workflow richiede51suite browser, inclusa la nuova, e conserva tutte le precedenti. Le prove locali non equivalgono alla pubblicazione: il normale deploy e la verifica dei file online restano necessari. Nessun utente reale, credenziale, nuova integrazione o impostazione hosting viene modificato dagli strumenti.

Il Grinch resta una richiesta separata non completata: la sua bozza grafica non fa parte di questo rilascio. Vedi [registro delle aggiunte](REQUESTS_FOLLOWUP_2026_11_02.md).

## Prima CI e stabilizzazione del controllo password

Il primo run [41515283881](https://github.com/socialluca89-byte/word/actions/runs/41515283881), commit `9967f837`, ha superato verify e tutte26suite del gruppo mondi/eventi, ma si è fermato nel gruppo successivo a `test-access-browser.cjs:13:384`. Il deploy è stato saltato prima del preflight e di SSH; il live è rimasto `f99e498`.

La riproduzione controllata ha mostrato che il test attendeva l'errore della password nel messaggio globale, sostituito legittimamente dalla sincronizzazione automatica. Il risultato nel modulo dedicato restava corretto. Il codice applicativo di account/API era invariato. Un vero salvataggio avviato al comparire dell'errore riproduce sia il caso password errata sia quello di conferma discordante, senza attendere artificialmente il timeout.

Il test ora attende il risultato persistente del modulo, verifica con MutationObserver che il messaggio globale sia stato comunque emesso e controlla un autosave reale nei tre esiti. Mantiene tutti i percorsi precedenti e aggiunge401/200, identità/profilo invariati, campi conservati o azzerati, pulsante disponibile, nessun POST per conferma discordante e attributi/focus di accessibilità. La suite `access` corretta è passata al primo avvio; nessun timeout o retry modificato. I byte dell'applicazione e il digest restano identici. La nuova CI completa, non un tentativo invariato del vecchio run, stabilisce l'esito finale.
