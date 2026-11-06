# Spiegazioni e aiuti coerenti nelle schede della classe

Base pubblicata: `353027185b6629afbf60906b8d29c2e1e69a8e5a`, [run42270153520](https://github.com/socialluca89-byte/word/actions/runs/42270153520),49verify/63browser e deploy/live riusciti il6novembre alle19:37:37Europe/Rome. Il precedente monitor locale è stato interrotto durante l’attesa; la rilettura del run esatto ha confermato il risultato terminale, senza ripetere il rilascio o interrogare il sito.

L’utente chiede di procedere con subagenti per migliorare il gioco, usando esclusivamente i temi e le parole inviati dall’insegnante. Tre audit indipendenti hanno identificato questi interventi finiti sugli stessi40casi e16nomi; nessuna nuova materia o parola:

1. Nella composizione di “Is it…?” l’errore e il modello devono spiegare l’ordine della domanda, usando la questionExplanation già curata. La spiegazione sì/no resta nella risposta breve.
2. Il modello automatico dopo due errori deve essere coerente tra ospite e account. Per l’account va confermato l’aiuto con l’API esistente prima di mostrarlo; fallimento, navigazione o passo cambiato non devono esporre un modello non confermato.
3. Menu e conclusione grammaticali devono mostrare gli adesivi effettivamente posseduti dal catalogo esistente. Etichetta “I tuoi adesivi”, senza inventare nuovi premi né dichiarare nuovo un premio precedente.
4. Il ritorno dalla grammatica aperta nel dettato deve dire “Dettato classe” e tornare allo stesso ingresso. La microprova ha confermato il controllo focalizzato fuori schermo: tessere oltre844px e conteggio sopra0px a320/390px, sia touch sia Enter. Il controllo viene ora portato in vista con scorrimento minimo e immediato, dopo la conferma dell’aiuto.

5. Una risposta errata può contenere uno snapshot già avanzato da un altro dispositivo, poiché il server rilegge dopo il commit. Il client deve ridisegnare subito quel passo confermato, mantenendo utilizzabili i controlli e senza inviare aiuti al passo precedente. La VM sul codice353ha riprodotto stato2/schermata1/nessun ridisegno; il controllo step1rimaneva utilizzabile. La corsa temporale reale del database non è stata esercitata: la regressione usa una risposta sintetica compatibile con quel contratto.

Non si cambia il conteggio “riascolti richiesti”: include le richieste, quindi l’assenza di una voce non dimostra un errore in quella metrica. Audio reale e dispositivi restano da validare separatamente.

## Disegno e prove

Si conserva la scena illustrata e la palette inchiostro#193E55, bosco#22654F, mare#168BA5, sole#FFD16A e carta#F4FAFC. Outfit per controlli/parole, DM Sans per istruzioni. Nessun nuovo livello di pannelli o animazione: si migliora il feedback dentro la stessa scena. Gli adesivi riusano la collezione e gli stili esistenti. Testi e bersagli mantengono le dimensioni già adottate.

```text
stessa domanda → errore → spiegazione pertinente → riprova
                      due errori → aiuto confermato → modello
giro concluso → adesivi posseduti → ritorno al proprio ingresso
```

Ownership separata: autore frontend per grammar.js/CSS; autore test per regressioni nella suite grammatica esistente; audit mobile su fixture353immutabili; root per documenti, versionamento, verifiche e rilascio. Nessun PHP, JSON didattico, schema, archivio, economia, permesso o dato reale cambia. Il checksum del file didattico rimane `aa4ebe404d8516f0047b64c0b34677050402fdae5d4b9517180003565ebdd4cd`.

Obbligatorie: prove errore/modello pertinenti, parità ospite/account, aiuto fallito o tardivo e ripresa guidata, adesivi realmente posseduti e ripetizioni, due ingressi, tastiera/touch/mobile. Tutte le63suite precedenti e49verify rimangono richieste. Il codice locale non viene presentato come pubblicato prima del nuovo deploy/live riuscito. Nessuna sonda supplementare o modifica delle protezioni.

Prova iniziale focus su353:12casi,8fuori viewport,4controlli già corretti. Tessere320:top865,4/bottom917,9;390:862,0/914,5 su altezza844. Conteggio320:top−199,7/bottom−105,7;390:−199,9/−105,9. Nessun movimento prima (`scrollDelta=0`), nessun errore JavaScript o POST ospite. Prove originali archiviate fuori repo, distinte dal collaudo finale.

Il primo collaudo completo ha inoltre confermato il modello automatico aperto ma fuori viewport (top−259,61/bottom−42,67 su altezza844). Dopo la conferma dell’aiuto il modello viene ora portato in vista con scorrimento minimo; il feedback dell’errore resta presente. L’asserzione di visibilità reale rimane nella suite, senza modificare soglie o usare screenshot prima della misura.

## Chiusura locale del candidato

Tutti i49gruppi verify e8suite browser pertinenti PASS. La grammatica mantiene le9aree precedenti eaggiunge7aree di regressione (16totali), con10misure del viewport. Il margine di scorrimento12px porta le tessere entro il viewport senza tagli né tolleranze: bordo inferiore832,14/832,44su844px. Grammatica, grammar-aids, learning-entry, training-memory, visual-journey, guardian, parent-summary e performance superati; caricamento isolato402,7ms con soglia5s invariata. Le due correzioni di attesa nei test usano lo stato confermato del percorso, senza sleep o retry delle suite; il fallimento iniziale del modello e quello geometrico restano documentati.

Curricolo e PHP identici,55file/48static congelati e versionamento idempotente. Nessuna asserzione originale rimossa. Pipeline completa63 e deploy/live sul nuovo commit ancora da attestare alla redazione; i risultati353non vengono presi in prestito per questo candidato.
