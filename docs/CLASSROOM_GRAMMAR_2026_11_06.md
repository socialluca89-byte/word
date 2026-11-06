# Grammatica della classe

Materiale ricevuto: singolare/plurale regolare, articoli a/an, It is/They are, formazione Is it...? e risposte brevi. Si ricavano soltanto argomenti e lessico: nessuna foto, marchio, nome o dato personale degli alunni viene salvato nell'app.

## Lotto e direzione visiva

Cinque percorsi, 40 casi originali curati, 16 nomi: Uno o tanti? (8), La s finale (16), A oppure an? (6), It is / They are (6), Is it...? (4). Il quinto percorso comprende sia composizione della domanda sia scelta della risposta. Sessioni brevi, senza timer o penalità, con modello e aiuti confermati prima di mostrare la soluzione; progressi privati separano autonomia e aiuto.

Si usa il teatro illustrato già pubblicato: inchiostro #193E55, bosco #22654F, mare #168BA5, sole #FFD16A, carta #F4FAFC. Outfit per parola e comandi; DM Sans per spiegazioni, senza nuovi font. Il tratto distintivo è una scena con esattamente uno o più oggetti conteggiabili, poi azione e feedback grandi. Un libro singolo non è una pila di libri; sedia, tavolo e banco devono essere distinti. Nessuna nuova griglia decorativa o animazione infinita.

```text
Lettere e parole / Dettato → Grammatica della classe
                              cinque percorsi
                          scena da contare
                          parola o domanda
                          scelta / tessere / scrittura
                          ascolto · aiuti · pausa
```

Le sette destinazioni della home e tutte le attività precedenti restano. Non si modificano i cataloghi congelati di 53 parole, 8 wordPacks, 12 frasi e 8 consegne. Non si aggiungono servizi, costi, invii di materiale, raccolta voce o accessi ai dati di altri alunni. Il lotto è online; le attività offline esistenti restano disponibili e non viene promessa grammatica offline.

## Contratto condiviso

Nuova proprietà pubblica `training.json.grammarLessons`:

- `version: 1`, `title`, `nouns`: 16 record `{id,singular,plural,article,meaning,pluralMeaning,art,singularAliases,pluralAliases}`. `art` riusa un ID Classroom quando disponibile. Plurali curati, nessuna trasformazione automatica di scissors/crayons.
- `packs`: cinque record `{id,title,icon,description,tip,cases}` con ID `number`, `plurals`, `articles`, `sentences`, `questions`.
- Ogni caso: `{id,noun,count,task,prompt,answer,aliases,explanation,choices,tokens,audio}`; task segue il pack (`number`, `plural`, `article`, `sentence`, `question`). `choices` contiene stringhe inglesi canoniche (non sinonimi corretti messi fra gli errori), `tokens` le parole in ordine canonico quando servono, `audio` una frase/parola intera affidata al TTS esistente. I casi question hanno anche `question`, `questionTokens` e `questionExplanation`.
- `number`: due scelte singolare/plurale; `plural`: tre scelte e scrittura; `article`: a/an; `sentence`: composizione della frase; `question`: composizione Is it...? e risposta sì/no. Conti 1–4, oggetti senza persone.

Si estende l'API training esistente: `training-start` con `{track:'grammar',pack:ID}` crea track congelato `grammar:ID`, sceglie tre casi meno esercitati e salva modello più prove. Modi `grammar-model`, `grammar-choice`, `grammar-write`, `grammar-build`. Domanda `{item:'grammar:'+case.id,mode,grammar:{...caso,nounData,pack,phase},answer,aliases,choices,tokens,topic}`; phase `model`, `number`, `plural-choice`, `plural-write`, `article`, `sentence`, `question-build`, `short-answer`. In question-build la risposta è la domanda; gli altri usano case.answer. Aggregati, diario e adesivi riusano le tabelle training; le sessioni grammaticali hanno la sola tabella additiva training_grammar_sessions con foreign key al profilo. Transazioni, idempotenza, CSRF e ownership restano invariati. Il modello usa lo skill standard model.explore; le altre sette competenze hanno ID grammar espliciti.

Compatibilità: `training-state` ordinario esclude `grammar:*`; `training-state&grammar=1` restituisce solo quei percorsi, per non offrire nuovi modi ai client legacy. Token puntuale continua a rispettare proprietà e scadenza. L'archivio ospite è dedicato `wordylandGrammarGuestV1`: nessuna scrittura o potatura negli archivi legacy. Nessun incremento XP, monete o classifiche; si riusano soltanto adesivi personali finiti del training quando disponibili.

Frontend nuovo `grammar.js`, caricato prima di training.js. Hook minimo in training.open: pulsante e consegna di `{root,content,profile,onExit,wordArt}` al modulo; dispose su apertura di altre attività/cambio profilo/route. Il modulo gestisce epoch, audio, richieste interrotte e salvataggio confermato, senza modificare le funzioni protette del training classico. Entrata da #allenamento e collegamento pertinente da #dettato; nessun ottavo ingresso home. Report genitore nel contesto già autorizzato, con etichette grammar leggibili, mai nuovi permessi.

Normalizzazione solo grammatica: case, spazi, apostrofi dritti/tipografici e punteggiatura finale/virgola opzionale; alias espliciti. Non accettare a books, they is o Yes, it's come risposta breve. Non riscrivere i confronti delle sessioni precedenti.

## Criteri di consegna

Fixture sintetiche: contenuti, numero reale di oggetti, alias corretti/errati, positivo/negativo, aiuto e modello prima/dopo conferma, pausa/reload, doppio invio e secondo dispositivo, scadenza e isolamento, storici legacy immutati, nessuna economia modificata, tastiera/touch/320–390–1360px, lettura quando audio manca senza falsa prova d'ascolto. Versionare gli asset e aggiornare entrambe allowlist, bundle e matrice test senza rimuovere controlli. Pubblicazione normale già autorizzata soltanto dopo test e preflight intatti; stop su eventuale protezione, nessuna sonda supplementare o aggiramento del precedente403.


## Compatibilità in caso di ripristino applicativo

La revisione ha riprodotto su fixture un problema della prima proposta: ripristinando il codice38434fc, i nuovi track nella vecchia training_sessions verrebbero offerti a client che non ne conoscono i modi. La tabella dedicata delle sole sessioni evita questa esposizione e non richiede di spostare o eliminare dati reali (la grammatica non è ancora pubblicata). I vecchi aggregati restano validi; in un rollback il vecchio report potrebbe mostrare ID tecnici delle nuove attività, mentre sessioni e giochi classici rimangono utilizzabili. Il modello resta model.explore anche per non alterare il vecchio conteggio di chi ha risposto davvero. Il roster corrente include gli errori della nuova tabella, escludendo avvio, modello e soli aiuti.

## Collaudo del candidato congelato

PASS tutti i 49 controlli obbligatori, compresi contenuti, API grammatica e legacy, roster, dati e deploy simulato. La nuova suite grammar completa passa sui 55 file congelati: cinque percorsi, 16 oggetti, risposte positive/negative, articoli e plurali, tastiera/touch, tre viewport, errori delle immagini, quota, conflitti fra schede, aggiornamento catalogo, cambio profilo e report privato. I primi fallimenti del nuovo test e le correzioni sono conservati nei log, distinti dal giro finale.

PASS anche performance, training-memory, training, visual-journey, guardian e parent-summary originali. La performance è una sola esecuzione isolata sul pacchetto finale: load422ms locale, soglia5s invariata e nessuna inizializzazione WebGL anticipata. Versionamento idempotente; tutti i55hash restano invariati durante i controlli. La review indipendente del delta finale non rileva blocchi. Queste prove non validano voci/dispositivi fisici o il tablet originale.

La pipeline candidata conserva tutti i61browser precedenti e aggiunge grammar, per62suite complete (31+31). Pubblicazione e controlli live sul commit finale ancora da attestare alla redazione; il pass locale non viene descritto come rilascio.

## Priorità del dettato nella prima schermata

Il primo run42259676027 su35bc9d4 ha passato49verify,31suite mondi e le nuove grammar/visual-journey/classroom-access, ma si è fermato in learning-entry: il riquadro grammatica precedeva i comandi del dettato e a320px spingeva l'avvio fino a905px. Deploy saltato. Riproduzione locale con il test originale, senza cambiare soglie o asserzioni.

Corretto un solo ordinamento DOM nell'introduzione: soltanto in #dettato, i percorsi classici precedono il collegamento grammaticale; #allenamento resta identico. Il pulsante termina ora a568px, anche con DejaVu; il nuovo collegamento rimane disponibile dopo i percorsi. Learning-entry originale completo e grammar completo PASS. Modulo grammatica, contenuti, CSS e test rimangono identici a35bc9d4.

Pacchetto successivo versionato/idempotente e55hash congelati. Tutti i49verify nuovamente PASS, insieme a performance, learning-entry, training-memory e visual-journey. Performance isolata412ms locale, limite5s invariato. Il nuovo risultato62suite/deploy deve essere confermato sul commit finale prima di dichiarare pubblicato il percorso.
