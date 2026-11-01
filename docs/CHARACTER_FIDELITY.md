# Stessi disegni nella presentazione e dentro il gioco

## Richiesta e decisione

L'utente ha precisato che il problema riguarda sia mondi sia personaggi: le belle illustrazioni delle schede venivano sostituite da geometria3D molto semplificata. Il primo piano di abbellire quei modelli è stato superato da questa precisazione. Si usa la skill frontend-design già installata per introdurre una vista illustrata interattiva predefinita, preservando la vista3D classica selezionabile. Nessuna funzione, premio o modello già disponibile viene eliminato.

Riferimenti effettivamente aperti e visti: dist/island-places.webp e dist/race-racers.webp. Entrambi restano byte-identici. La prova locale della baia ha preceduto l'integrazione nelle vere pagine del gioco; i successivi screenshot provengono dall'app reale, non solo da quella prova o dal generatore.

## Piano visivo applicato

La scena usa direttamente la stessa illustrazione della scheda, con elementi interattivi e personaggi-pedina illustrati che si spostano. I ritratti sono condivisi fra scheda, passaporto e scena attraverso lo stesso atlas/cella: nessuna seconda versione semplificata nel renderer illustrato. Profondità con ombre leggere, ingrandimento/spostamento della vista e movimento in risposta alle azioni; pausa e movimento ridotto rispettati. Non è una nuova simulazione con personaggi3D a corpo intero.

Palette coerente con gli originali: neve #f2f8fb, inchiostro #193e55, blu #193672, abete #22654f, sole #ffd36e, corallo #da6279. Outfit/DM Sans già presenti; obiettivi e controlli grandi conservati. Allineamento a sinistra per leggere, figura al centro nella scelta personaggio.

```
[scheda: disegno del mondo e ritratto]
             ↓ stessi file/celle
[scena illustrata, bersagli e pedina animata]
[obiettivo, tre comandi e progresso del gioco]
[scelta Illustrazioni / 3D classico]
```

Critica: una galleria bella con un renderer diverso ripeterebbe il problema. Il test confronta per tutti20 gli avatar il file, la posizione e la scala dell'atlas fra scheda e ritratto nella scena; per gli8 mondi verifica il riuso dell'asset originale e il mondo effettivamente aperto. Il movimento e i bersagli sono controlli reali collegati al minigioco precedente, non una fotografia statica presentata come gioco già funzionante.

## Copertura e limiti espliciti

- Otto mondi originali con la stessa illustrazione usata nelle schede. I sei ritratti originali sono invariati.
- Quattordici nuovi ritratti originali per i personaggi già previsti, coerenti con quello stile, e quattro sfondi stagionali illustrati. Generazione da riferimenti artistici pubblici del progetto, senza dati dei bambini. Copia degli originali PNG senza ritocco; provenienza/checksum in ILLUSTRATED_ART_PROVENANCE.json.
- Ogni minigioco conserva tre scoperte, errori/aiuti senza penalità, completamento/replay, touch/tastiera e ingresso agli esercizi. Il gioco libero non assegna monete né riscrive storici. Il comando esplicito Continua con gli esercizi può creare normalmente una missione tramite l'API preesistente per l'utente autenticato.
- Nel renderer illustrato i personaggi sono pedine/ritratti animati. Accessori e personalizzazioni scelti vengono mostrati come distintivi; arredi e accessori fisici sui modelli restano raggiungibili tramite 3D classico. Non si dichiara che l'illustrazione fissa cambi abbigliamento pixel per pixel.
- La scelta grafica è una preferenza locale pubblica, non contiene profili/progressi e persiste quando il browser consente localStorage. Cambiare vista non modifica gli esercizi salvati; la sola miniattività libera della scena si riavvia come già dichiarato.
- Le quattro festività mantengono date e premi server. Birillo compare soltanto con metadati attivi dall8dicembre; il suo ritratto è una rappresentazione del visitatore, non uno sblocco automatico dell'avatar Elio. Il pupazzo del villaggio è una decorazione.
- Due PNG pubblici aggiunti (circa6MB totali), richiesti quando il relativo aspetto viene mostrato, senza introdurre servizi o dipendenze runtime esterni. Nessun precaricamento di API/private state. Le illustrazioni non sono promesse nel cold-start offline: il ripasso offline esistente è conservato.

## Regressioni risolte durante l'integrazione

Un attributo data-world della nuova scena entrava in conflitto con la navigazione legacy: rinominato data-illustrated-world, con asserzione del mondo effettivamente aperto e controllo degli errori pagina. Gli stili hover ereditati muovevano i bersagli assoluti durante il tocco: ancoraggio conservato in tutti gli stati e risposta pointerup touch esplicita. Il blocco su oggetti già trovati impedisce che il click compatibile successivo incrementi due volte. Nessuna azione viene ripetuta automaticamente nei test.

## Test e consegna

La nuova suite illustrated verifica il default reale senza preferenza forzata: venti ritratti identici fra schede e scene, otto mondi effettivamente scelti, tap reali e tastiera, errore/replay, larghezze380/390/1180px, preferenza3D conservata, anteprime gratuite/accessori, identità di un profilo sintetico nella missione normale, villaggio e visitatore dicembre, gestione esplicita di un'immagine mancante. Le suite precedenti selezionano espressamente la vista3D classica nella sola copia temporanea locale del sito, per conservarne la regressione; quel codice non entra in dist/index.html di produzione.

Il bundle passa da47 a49 file, con entrambi gli atlas nella stessa allowlist stretta e nelle verifiche byte per byte del deploy normale. Non cambia alcun segreto, percorso, protezione, cron, dato account, schema o catalogo dei premi rispetto al candidato704b577. La CI pull_request resta solo verify/browser.

Esiti cumulativi e SHA in [CHARACTER_FIDELITY_VERIFICATION.json](CHARACTER_FIDELITY_VERIFICATION.json); schermate reali in [review/README.md](review/README.md). Nessuna pubblicazione o nuova GET a produzione da questo lotto; il rilascio resta coordinato sulla stessa PR8.
