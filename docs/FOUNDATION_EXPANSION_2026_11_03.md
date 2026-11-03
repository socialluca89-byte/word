# Basi quotidiane: numeri, frasi, consegne e oggetti scolastici

## Perimetro finito

I 43 record di parole, i sette percorsi, i 26 nomi delle lettere, i 13 blocchi, i premi e il primo percorso fonetico precedenti restano semanticamente identici. Il nuovo pack `numbers-teens` aggiunge eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen e twenty, senza sostituire il pack 1–10. Il catalogo guidato passa a **53 parole e otto percorsi**.

Ogni numero nuovo ha cifra visibile, significato italiano, modello «I see … stars.» e lacuna curata; one resta singolare «star», gli altri plurali «stars». Non è una diagnosi, un livello assegnato o una preparazione Cambridge completa.

## Frasi e istruzioni originali

Dodici attività `sentenceActivities` hanno identificativo stabile, modello inglese, tessere di parole intere e significato italiano. Sono: I have a pen/book/pencil; This is my notebook/bookbag; The cat is in/on/under the box; The ball is red; The sun is yellow; I see two stars; I have blue crayons. L'ordine delle tessere deve essere ricostruito, non si tratta di scrivere una frase libera. Bookbag resta una parola e non si inserisce «a» prima del plurale crayons.

Otto `instructionActivities` richiedono di individuare una matita, una gomma, le forbici, la colla stick, lo zaino, il cerchio rosso, tre stelle e il risultato di «Open the book». Ogni consegna ha tre alternative diverse e un ID risposta; le posizioni corrette nel sorgente sono distribuite su tutte e tre le posizioni e devono anche essere mescolate dal backend. Nomi, conteggi e attributi visivi devono corrispondere: non si misura la comprensione da una posizione fissa.

Backend e UI stanno integrando i track `sentences` / `instructions` e i mode `sentence-build` / `instruction-choice`, in sessioni di tre attività. La presenza di questi cataloghi **non è da sola prova di modalità funzionanti**. Le relative prove API/browser e il risultato di rilascio sono coordinati dal parent sul candidato cumulativo.

## Atlante Classroom

Dodici illustrazioni originali generate con image_gen, non marche o personaggi riconoscibili: pencil, pen, book, eraser; scissors, glue stick, crayons, notebook; sharpener, marker, bookbag, desk. Griglia esatta **4×3**, immagine 1448×1086, celle 362×362. L'originale trasparente è conservato senza ritocchi e copiato in `dist/classroom-objects.png`.

Direzione: silhouette nette, volume leggero, colori distinti, contorni blu-verde e nessun testo nell'immagine. La critica è semantica: penna sottile e pennarello spesso, quaderno a spirale e libro rilegato, colla solida in stick e non flacone, temperino con foro/lama e gomma rettangolare. La foto originale della scheda resta soltanto il riferimento al lessico; nessuna foto dei bambini o documento è stato inviato al generatore.

Il prompt e la provenienza sono in [CLASSROOM_ART_PROMPT.txt](CLASSROOM_ART_PROMPT.txt) e [CLASSROOM_ART_SOURCE.json](CLASSROOM_ART_SOURCE.json). `classroomArt` contiene `source`, `columns`, `rows`, `cells`; il parent può aggiungere sorgenti PNG/WebP e query di versione. Il rendering deve usare la stessa cella per modello, riconoscimento e dettato senza rivelare la grafia inglese nel puro ascolto.

Il viewer dell'immagine mostra colori RGB dei pixel quasi trasparenti; una verifica della resa nella pagina app resta necessaria. Una prova separata di navigazione browser `file://` è stata negata con ERR_BLOCKED_BY_ADMINISTRATOR: non è stata ripetuta, non sono cambiate policy e non è stato aperto un server di cartelle workspace. La verifica successiva sarà l'ordinario test HTTP dell'app sui nuovi asset pubblici, come autorizzato dal parent.

Nessuna immagine del Grinch, nessuna ripetizione o alternativa per un output rifiutato. Questo atlante originale è stato prodotto al primo tentativo senza rifiuti.

## Verifiche statiche

`scripts/test-foundation-expansion.mjs`: sei gruppi PASS su conservazione del catalogo precedente, quantità/grafie 1–20, ricostruzione delle dodici frasi, otto consegne con tre alternative e conteggi visivi esatti, dodici celle distinte e fonte PNG integra, limiti audio espliciti.

Tre controlli negativi su copie temporanee hanno respinto correttamente un errore di grafia in thirteen, un articolo mancante nelle tessere e due stelle in una scelta dichiarata «tre stelle». Il JSON applicativo non è stato modificato da questi controlli. Log in `/workspace/wordyland-resolution-2026-11-03/content/negative-controls.json`.

I fonemi isolati restano indisponibili e `guidedOnly` resta vero. Non vengono aggiunte clip inventate, fonemi simulati con TTS o valutazioni della pronuncia. La voce reale del dispositivo, la revisione didattica con l'adulto, le nuove modalità API/UI e la pubblicazione non sono dimostrate dal solo controllo statico.
