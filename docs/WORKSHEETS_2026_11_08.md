# Le cinque schede dell’8 novembre

Contenuti trascritti dalle immagini condivise dal genitore; non vengono salvate fotografie, nomi o dati degli alunni. Le 35 righe si aggiungono ai 40 casi precedenti, che conservano ogni valore. Totale: 75 casi, 30 nomi grammaticali, 11 percorsi. Nessun livello d’esame viene dedotto dalle schede.

| Percorso | Attività della scheda | Casi |
| --- | --- | ---: |
| `toys-yes-no` | Is it…? con doll, car, ball, puzzle, teddy | 5 |
| `whats-this` | What’s this? → It’s a… con sei oggetti scolastici | 6 |
| `it-they-choice` | Scelta It is / They are | 6 |
| `it-they-write` | Scrittura It is / They are | 6 |
| `is-this` | Is this…? → Yes, it is. / No, it isn’t. | 8 |
| `short-answer-gap` | Completa Yes, it ___. / No, it ___. | 4 |

## Risposte curate

- Giocattoli: doll/doll sì; car/teddy no; ball/car no; puzzle/puzzle sì; teddy/teddy sì.
- What’s this?: It’s a bag/pencil/pen/rubber/book/desk. La forma estesa It is a… è accettata sullo stesso oggetto.
- Scelta del soggetto: books → They are; rabbit → It is; pens → They are; dolls → They are; cat → It is; rat → It is.
- Scrittura del soggetto: car → It is; dogs/lizards/bags → They are; desk/hat → It is.
- Is this…?: sharpener/pen no; pencil/pencil sì; bag/bag sì; pen/notebook no; desk/pencil case no; rubber/rubber sì; book/desk no; chair/chair sì.
- Completamento: puzzle/puzzle → Yes, it is.; teddy/ball e doll/puzzle → No, it isn’t.; car/car → Yes, it is.

Il lessico canonico dei nuovi casi è `bag` e `rubber`, senza trasformarlo automaticamente in `book bag` o `eraser`. I vecchi nomi e alias rimangono invariati. `pencil-case` ha metadato `targetOnly:true` e `art:null`: compare nella domanda negativa, mai come oggetto da indovinare, flashcard, parola del nuovo pacchetto o distrattore.

## Formati e illustrazioni

Le nuove fasi impiegano i modi esistenti model/choice/build/write, con competenze distinte. Il modello espone la frase completa, mentre un esercizio sul prefisso valuta soltanto It is / They are e il completamento valuta soltanto is / isn’t. Drag, tocco e tastiera sono equivalenti; DataTransfer contiene solo la parola pubblica, mai token o dati del profilo.

Sono aggiunte 11 illustrazioni vettoriali originali, coerenti con i disegni già presenti: doll, car, ball, puzzle, teddy, rabbit, cat, rat, dog, lizard, hat. Bag e rubber riusano il disegno corretto dell’atlante (bookbag/eraser) senza cambiare la risposta inglese. La sedia usa l’illustrazione già presente. Ogni immagine rappresenta un singolo oggetto numerabile; il puzzle è una tavoletta con incastri, non un testo segnaposto.

Il pacchetto di parole `worksheet-nov8` comprende solo i 20 oggetti realmente rappresentati. Aggiunge 11 record dopo i 53 precedenti e un pacchetto dopo gli 8 precedenti; i valori dei prefissi non cambiano. È `wordOnly:true`: il dettato/spelling non usa le frasi diverse dei vecchi record bag/cat/dog, né introduce nuovi verbi. Non vengono generati esercizi automatici sui plurali aggiuntivi conservati soltanto come metadati.

## Ripresa e programma di classe

I menu e i nuovi avvii leggono solo il contenuto assegnato. Gli avvii attendono il contesto e inviano classe/revisione attese; cambi reali di profilo o programma invalidano gli eventi tardivi. `fullContent` serve esclusivamente per le etichette dei piani già salvati. I piani storici accessibili, verificati dal server, mantengono quantità, risposte, fasi e aiuti congelati; un pulsante esplicito e un’etichetta distinguono il programma precedente.

`scripts/test-grammar-content.mjs` conserva l’oracolo indipendente dei 40 casi originali e i prefissi precedenti. `scripts/test-worksheet-content.mjs` verifica la matrice delle 35 nuove righe, il lessico, i task, le frasi complete, gli 11 SVG, il target-only e la ripresa di tutti gli 11 formati salvati. Queste prove statiche non sostituiscono il collaudo browser o la verifica del rilascio.

Con programma non pubblicato o classe ancora da scegliere, la grammatica espone soltanto il menu di ripresa: nuovi percorsi e nomi sono vuoti, mentre le etichette pubbliche dei piani precedenti restano disponibili. Un errore di caricamento non autorizza il catalogo globale. Il cleanup delle operazioni interrompe lo stato occupato anche durante un refresh temporaneo dello stesso contesto, senza mostrare risposte tardive.
