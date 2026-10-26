# Suoni nelle parole — primo lotto guidato R5

**Solo work, non pubblicato.** Main rimane3473591; ultimo live verificato b3ca230. Nessun deploy, cambiamento di sicurezza, invio a SiteGround o nuovo servizio. La richiesta al provider resta non inviata con autorizzazione specifica pendente.

## Consegna finita e uso didattico

Quattro gruppi, undici parole già comprese nelle35di base, sei attività per gruppo (24totali). È un primo ponte fra nome della lettera usato nello spelling, grafia iniziale e suono nella parola, da usare con un adulto; non un corso completo di fonetica, una diagnosi o una certificazione Cambridge.

| Lettera | Suono iniziale, trascrizione ampia | Parole incluse |
| --- | --- | --- |
| S | /s/ | sun, six, seven |
| P | /p/ | pen, pink, pencil |
| B | /b/ | bag, book |
| N | /n/ | nose, nine, no |

Si parte da un confronto: lettera/nome per lo spelling e parola intera con iniziale evidenziata staticamente. Seguono il concetto di nome nello spelling, un'associazione visiva fra inizi di parole, completamento della prima lettera, un secondo confronto con sostegno ridotto e il concetto di suono nella lettura. Le parole sono scritte: il risultato non dimostra che il bambino abbia discriminato un fonema ascoltandolo. Non viene nascosto questo limite per far sembrare una prova visiva una prova d'ascolto.

Il primo indizio rende esplicita la lettera o richiama lo scopo dello spelling/lettura; il secondo mostra il modello completo e la spiegazione. Due errori rendono disponibile il modello senza penalità. Il bambino può chiedere aiuto subito, fare una pausa e riprendere; nessun timer o classificazione della difficoltà personale. La conferma positiva riguarda un'attività guidata, non una pronuncia valutata. Premi, punti, guardaroba e progressi dei giochi precedenti restano invariati.

## Verifica linguistica e fonti

I fatti sugli inizi sono stati confrontati con **CMU Pronouncing Dictionary**, commit [74790861f652b15e4ac49015a90074ad62a27690](https://github.com/cmusphinx/cmudict/tree/74790861f652b15e4ac49015a90074ad62a27690), `cmudict.dict` scaricato e letto come dati, senza eseguire codice esterno. SHA256 del file esaminato: `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`. Licenza e attribuzione in [CMUDICT_LICENSE.txt](CMUDICT_LICENSE.txt).

Risultati verificati (notazione ARPAbet, non materiale da far leggere al bambino):

| Parola | Voce del lessico |
| --- | --- |
| sun | S AH1 N |
| six | S IH1 K S |
| seven | S EH1 V AH0 N |
| pen | P EH1 N |
| pink | P IH1 NG K |
| pencil | P EH1 N S AH0 L |
| bag | B AE1 G |
| book | B UH1 K |
| nose | N OW1 Z |
| nine | N AY1 N |
| no | N OW1 |

I nomi-cue inglesi già usati nell'alfabeto sono coerenti con le voci `ess EH1 S`, `pee P IY1`, `bee B IY1`, `en EH1 N`: il nome della lettera contiene altri suoni e non va scambiato per il solo suono iniziale. Il lessico è americano; qui si usano soltanto questi quattro inizi consonantici, senza insegnare o valutare le differenze vocaliche/regionali. Sono trascrizioni fonemiche ampie: aspirazione di /p/, dettagli fonetici e competenza produttiva del bambino non vengono valutati. La grafia S/P/B/N non viene dichiarata una regola universale per tutte le parole inglesi; digrammi, lettere mute, altri valori e vocali restano fuori dal lotto.

Questa è una verifica lessicale dei casi selezionati, non una validazione didattica professionale o acustica. Gli esercizi e le spiegazioni sono originali; non sono copiati da esami Cambridge o da materiali personali della famiglia.

## Audio: cosa esiste e cosa manca

- L'app pronuncia solo **parole intere**, con voce inglese dichiarata locale dal browser, oppure il **nome inglese della lettera** già controllato con un adulto nell'alfabeto e per la voce scelta.
- Non vengono inviati al TTS `/s/`, `/p/`, `/b/`, `/n/`, bare grafie come se fossero fonemi o pseudo-sillabe `puh/buh`. Non si taglia una parola secondo tempi presunti e non si simula un'evidenziazione sincronizzata: il colore dell'iniziale è statico.
- L'audio del fonema isolato **non è disponibile**. L'adulto modella il suono nel contesto delle parole, evitando di aggiungere il nome o una vocale ai suoni /p,b/. Non sono registrate voci del bambino, né viene usato il microfono.
- Se la voce manca o fallisce, il percorso rimane utilizzabile in lettura con l'adulto, dichiarandolo. Stop, pausa, cambio percorso/profilo e navigazione interrompono il parlato; callback obsolete non avanzano attività. I riascolti sono richieste associate alle attività confermate, non attestazioni che l'audio sia stato udito bene.

**Dipendenza precisa per un futuro ascolto fonemico autonomo:** quattro registrazioni affidabili dei suoni /s,p,b,n/, con modello inglese scelto, revisione di una persona qualificata, licenza/consenso al riuso e verifica sul dispositivo reale. Non servono registrazioni dei bambini. Prima di chiamarle prove d'ascolto occorrono anche progettazione/validazione delle attività e revisione didattica. Questa parte resta ferma; non è stata sostituita da TTS inaffidabile e non blocca le attività guidate già sviluppate. Per estendere il curriculum oltre il lotto servono altri set curati e confronto con il percorso della classe, senza mappature generate alla cieca.

## Dati, progressi e compatibilità

Il modulo compare in Allenamento senza togliere lettere IT/EN, sei percorsi parole, tredici schede, giochi o navigazione precedente. La scorciatoia all'alfabeto mantiene salvato il passo Suoni nelle parole e permette di controllare il nome della lettera prima di tornare.

Protocollo separato `phonics-state/start/hint/answer/progress`, nello stesso modulo PHP del repository, con gli stessi controlli account/CSRF/ownedProfile. Metodi GET/POST rigorosi; report soltanto per adulto/admin sui propri profili, senza eccezioni per amministratori di altri account o classi. Nessuna associazione genitore–alunno aggiunta. L'alunno può riprendere il proprio percorso, non leggere il report adulto.

Schema additivo: `phonics_sessions`, `phonics_practice`, `phonics_totals`, FK con eliminazione del solo profilo autorizzato. Una sessione per gruppo riprendibile entro7giorni; rimozione delle sole sessioni phonics vecchie oltre30giorni, aggregati conservati fino all'eliminazione del profilo. Il piano e l'ordine delle opzioni sono congelati; nonce/step impediscono doppi avanzamenti e la ripetizione della stessa risposta errata non aumenta gli errori. Gli aiuti confermati sono monotoni anche fra dispositivi.

Il confronto SQLite usa CAST numerico: il binding PDO testuale poteva far preferire a MAX un parametro più basso come testo. La correzione vale per i nuovi aiuti e per quelli dell'allenamento esistente; una regressione specifica verifica livello2 seguito da richiesta livello1 su secondo dispositivo, senza ridurre l'aiuto.

Il report privato mostra soltanto attività guidate confermate per gruppo/tipo, uso esplicito di indizi/correzioni, tentativi da correggere, riascolti richiesti e ultima data. Non ci sono colonne o score di padronanza fonemica, pronuncia o readiness Cambridge: `guidedOnly=true`, `assessesPronunciation=false`, `assessesPhonemeListening=false`; flag inviati dal client per affermare indipendenza/audio validato vengono ignorati. Un report senza attività resta vuoto.

Per l'ospite: chiave separata `wordylandPhonicsGuestV1`, quattro sessioni e aggregati limitati, scelta ricostruita da identificatori curati. Non si toccano la memoria delle lettere/parole, adesivi, backup ospite o economia esistenti. Non si importano risultati ospite in un account. Come gli altri percorsi ospite, è memoria del browser condiviso, non sincronizzazione fra dispositivi né transazione atomica fra schede; usare un percorso aperto alla volta. Un errore di quota non conferma un avanzamento e rimanda al salvataggio effettivo.

Il protocollo separato evita di presentare nuovi tipi di domanda ai vecchi client `training-state`; il loro report e le sessioni esistenti restano identici. Un futuro cambiamento della versione o dell'ordine didattico deve prevedere migrazione dei salvataggi ospite, non reinterpretare silenziosamente vecchi passi.

Questo modulo non è ancora nel cold-start della pagina offline autonoma. Il ripasso illustrato e l'allenamento offline lettere/parole restano presenti e la cache rimane di10soli asset pubblici: nessuna API, account, risultato privato o documento personale viene aggiunto. Il catalogo pubblico contiene il set didattico, non le risposte dei bambini.

## Collaudo e limiti della consegna

`test-phonics.py` verifica quattro gruppi/undici parole/24passi, ownership/ruoli/CSRF/verbi, aiuto monotono su secondo dispositivo, ordine congelato, deduplicazione errori e avanzamenti, dati precedenti non vuoti con adesivo esistente conservati, falsi flag di padronanza ignorati, report caldo read-only, scadenza e cancellazione autorizzata con altri profili intatti. Non conserva il testo delle risposte errate in SQLite.

`test-phonics-browser.cjs` verifica concetti nome/suono, parola intera e nome corretti al sintetizzatore simulato, nessun fonema isolato sintetizzato, stop/errore audio, doppio click, aiuti/reload/opzioni congelate, quota fallita e recupero dal dato reale, memoria precedente byte-identica, stato locale alterato neutralizzato, quattro viewport, voce assente, ponte all'alfabeto, report adulto separato e vuoto per nuovo profilo senza import ospite.

I test audio sono **simulati**. Non sono state convalidate voci reali o efficacia didattica sui bambini. Verifica completa locale e regressioni del lotto vengono registrate nella chiusura del lavoro; nessuna nuovaCI o pubblicazione autorizzata da questo documento. [Anteprima locale sintetica](review/phonics-390.png).

## Chiusura del lotto

PASS58comandi del jobverify eseguiti localmente, incluso il nuovo testAPI e il deploy finto dei39file. PASS tutte26suitebrowser del workflow, con codice di uscita controllato per ciascuna; la prova prestazioni è stata eseguita da sola al termine: DOM1669.8ms/load1796.3ms, soglia5s invariata,1contestoWebGL iniziale e2dopo scroll su390/1360px. Non è una misura del dispositivo della bambina.

Il primo testAPI aveva rilevato la riduzione dell'aiuto per il confronto SQLite fra numero e binding testuale: corretto conCAST e riprovato esplicitamente, anche nell'allenamento precedente. Nessun test è stato rimosso, nessun timeout aumentato e nessun retry automatico aggiunto. Il collaudo browser include inoltre il passaggio all'alfabeto e il ritorno allo stesso passo guidato.

NessunaCI nuova o pubblicazione di questo lotto. I risultati sono locali con dati sintetici e audio simulato; le dipendenze didattiche/acustiche e il blocco SiteGround restano quelle descritte sopra. Il percorso iniziale è sviluppato, non l'intero requisito di fonetica o di preparazione Cambridge.
