# Primo modulo Allenamento e Spelling — sviluppato su work, non online

Obiettivo iniziale: riconoscere **la stessa lettera scritta** e distinguerne i nomi italiano e inglese. Si parte senza scegliere livello, prerequisiti o esame. Le attività sono brevi, senza timer, voti, confronti fra bambini o penalità. Nessun gioco precedente è stato rimosso.

## Accessi e contenuti originali

Menu **Allenamento e Spelling**, oppure Allenati → relativa scheda. Ritorno a Tutti gli esercizi, Pausa e Riprendi sempre disponibili; resta possibile avviare il kart e tutti gli altri giochi dai percorsi esistenti. Le tredici schede didattiche e le sei modalità classiche sono conservate.

Primo percorso **Stessa lettera, due lingue**:

- alfabeto completo esplorabile, maiuscolo/minuscolo coerenti e pulsanti distinti Nome italiano / Nome inglese;
- primi blocchi guidati da due lettere: A/E, B/C, I/D, tutti accessibili;
- modello grande, confronto dei nomi e riconoscimento fra due lettere; ripetizione libera e aiuto in italiano;
- nessun nome di lettera presentato come fonema. B e C non vengono dichiarate “uguali” fra lingue perché una trascrizione testuale sembra simile.

Secondo percorso **Parole e piccole frasi**, conservato e raggiungibile subito:

- sei parole: cat/gatto, pen/penna, dog/cane, sun/sole, book/libro, red/rosso;
- parola intera con immagine, riconoscimento del significato, composizione delle lettere, scrittura con modello facoltativo e piccola frase;
- esempi originali: “I see a cat.”, “I have a pen.”, “The ball is red.”;
- due parole per sessione; ripasso delle difficoltà confermate e introduzione di parole nuove. Anche l’ospite incontra altre parole, non sempre cat e pen;
- spelling sequenziale dei **nomi** delle lettere, se la voce è controllata per tutte le lettere della parola. Per CAT: see, ay, tee è lo spelling, non la pronuncia della parola cat.

Dati curati in training.json, versione 1. I testi richiesti alla voce comprendono nomi italiani come a/bi/ci e nomi inglesi come ay/bee/see; sono prompt locali curati per il sintetizzatore, non una trascrizione fonetica da insegnare al bambino. Questo primo set non è un curriculum completo e non importa o copia test protetti.

## Audio: capacità reale e limite esplicito

Si usa la Web Speech API già disponibile nel prodotto. Questo modulo sceglie soltanto voci che dichiarano localService=true e lingua it/en appropriata, preferendo it-IT/en-GB. Nessuna chiamata a servizi audio esterni, registrazione, microfono o invio di voce. Alla sintesi vengono passati soltanto nomi/parole/frasi curati, mai nickname, email o risposta libera del bambino.

Non assumiamo che leggere una singola grafia con TTS produca sempre il nome corretto. Nell’alfabeto si ascolta il nome inglese; dopo la conclusione dell’utterance un adulto può confermarne la resa. La conferma è locale e legata alla voce/lettera: se la voce cambia non viene applicata automaticamente alla nuova. Va controllata anche la resa italiana durante il confronto. Non è una verifica fonetica automatica o una certificazione del motore.

La prova di ascolto di una lettera si abilita solo con voce locale EN disponibile e controllo della lettera. La scelta non viene accettata come ascolto prima che la richiesta audio termini. Ferma, riascolto e navigazione interrompono la coda; le lettere dello spelling vengono accodate con onend, non con intervalli inventati. Callback vecchi non riprendono audio dopo l’uscita. Non è implementato un allineamento temporale fonema/grafema e non viene simulato un highlight sincronizzato della pronuncia.

Se la voce non è disponibile, non è controllata o fallisce, il percorso propone esplicitamente **lettura**, con modello visibile e possibilità di aiuto. Il bambino può anche scegliere Preferisco leggere. Quella risposta non diventa un risultato di ascolto. La scrittura con modello è registrata con supporto. I test con voci simulate verificano API, testo richiesto, lingua e sequenza; **non verificano la pronuncia udibile di Safari/Chrome o del telefono reale**. In questo ambiente le voci reali utili non erano disponibili: controllo sul dispositivo e con un adulto ancora necessario.

Non sono presenti registrazioni fonemiche verificate. Perciò il modulo tratta nomi delle lettere e parole intere; non promette corrispondenze fonetiche complete o segmentazione TTS attendibile. Nessuna valutazione della voce del bambino.

## Progressi privati e sostegno graduale

Account e progressi → **Allenamento e Spelling · progressi privati**. Solo adulto/admin con profilo realmente appartenente al proprio account; l’admin globale non riceve automaticamente dettagli altrui. Gli alunni possono esercitarsi sul proprio profilo, ma l’endpoint del riepilogo genitore è loro negato. Nessun nuovo collegamento genitore-alunno o privilegio docente viene creato: per iscrizioni autonome della classe serve un rapporto autorizzato già previsto, non la sola conoscenza del soprannome.

Il riepilogo distingue:

- nome inglese ascoltato → lettera, da lettera vista → lettera;
- parola ascoltata → significato, da parola letta → significato;
- composizione con modello, scrittura senza modello/supporto facoltativo e piccole frasi;
- attività senza aiuto né errori precedenti, attività con modello/aiuto/correzione, ripetizioni audio richieste e giorni con risposte autonome per competenza;
- andamento settimanale delle attività confermate e argomenti da ripassare con calma, senza percentuali d’esame o diagnosi.

Per ridurre la fase con modello servono almeno tre risposte autonome della stessa competenza su almeno due date; tre risposte nello stesso giorno non bastano. L’aiuto resta sempre disponibile. Un singolo errore non assegna un’etichetta o un livello. L’andamento rappresenta attività e occasioni osservate, non prova che il bambino sia pronto per un esame. I metadati audio descrivono la modalità usata, non dimostrano che l’audio sia stato fisicamente udito.

Nessuna attività confermata → messaggio di dati assenti, senza inventare progressi. Ospiti non inclusi nella dashboard online. La pratica ospite resta separata sul dispositivo e non viene importata automaticamente in un nuovo account.

## Premi: tre adesivi, zero monete o punti

Album personale di Allenamento, separato dai 48 oggetti dei giochi:

1. 🌱 Il primo piccolo passo: un percorso completato, anche usando aiuti.
2. 🦋 Quattro scoperte: quattro lettere/parole incontrate in attività confermate.
3. 🌈 Nuove esplorazioni: tre percorsi completati in più di una data, senza obbligo di giorni consecutivi.

Identificatori finiti e assegnazione unica per profilo. Replay e doppio click non generano copie infinite. Errori, uso degli aiuti e giorni saltati non sottraggono adesivi. Niente acquisti reali, XP, monete, classifiche o vantaggi competitivi in Allenamento. Le ricompense dei giochi precedenti continuano con le regole esistenti.

## Persistenza e minimizzazione

Sessioni separate, riprendibili per sette giorni. Il server possiede piano e passo corrente; transazione/idempotenza impediscono doppio avanzamento e doppio adesivo. Gli aiuti restano monotoni e possono essere trasportati con la risposta se il loro invio separato è fallito. Una risposta salvata con conferma persa viene verificata con Riprendi Allenamento, non dichiarata fallita o reinviata automaticamente.

Nuove tabelle training_* legate al profilo con cancellazione in cascata. Nessuna scrittura in wallets, inventory, practice, credits, rewards, stato del profilo o classifica. Non vengono conservate risposte libere errate né voce: solo piano pubblico curato, passi, contatori, date e adesivi. Sessioni oltre 30 giorni e dettaglio giornaliero oltre 90 vengono puliti solo per il profilo che apre un percorso; restano aggregati piccoli per competenza e totali di partecipazione, senza perdita dei premi per pause lunghe. La cancellazione del profilo elimina anche questi dati e lascia intatti gli altri profili, verificato con fixture.

Ospite: memoria locale separata da portafoglio e missioni. Se il salvataggio fallisce, non viene dichiarato un avanzamento confermato. Occorre rete per aprire il catalogo/percorso dopo una riapertura: non è una nuova modalità offline garantita. Il ripasso offline precedente resta disponibile e invariato.

## Prove e limiti della consegna

API e browser dedicati: test-training.py, test-training-browser.cjs e test-spelling-browser.cjs. Regrediscono privacy/ruoli/CSRF, economia invariata anche con campi punti falsificati, giochi ancora premianti, nonce/replay, aiuti, date distinte, cancellazione profilo, voci assenti/locali/remoto escluso, lettura vs ascolto, nomi IT/EN curati, cancella/ripeti/no overlap, spelling sequenziale, interruzione della risposta, ripresa, tastiera, mobile e nuovo ingresso senza perdere quelli precedenti. Le prove di audio sono simulate, non ascolti umani.

Tutti i controlli locali della pipeline: 56 comandi con exit code registrati singolarmente a zero, incluso deploy **fittizio** di 39 file. La prima esecuzione aggregata aveva restituito exit 1 nonostante messaggi PASS: non usata come prova conclusiva; controllo isolato e driver con stati per comando hanno confermato exit 0. Dettaglio dei fallimenti iniziali/correzioni e della regressione browser in NIGHT_PROGRESS.md.

I tre nuovi file pubblici sono training.js, training.json e il controller protetto training.php: catalogo versionato e caricato alla richiesta, nessun nuovo asset 3D. JS e JSON insieme sono circa 37 kB non compressi (misura file, non tempo di rete). Le verifiche di integrità/rollback includono i nuovi file; PHP va installato prima dell’API che lo richiede e index.html resta ultimo. Nessuna esecuzione reale di deploy/probe o modifica hosting.

## Cambridge: riferimento futuro, nessuna promessa

Riferimenti di progettazione ricevuti e verificati dal coordinamento: [formato Young Learners Starters](https://www.cambridgeenglish.org/exams-and-tests/qualifications/young-learners/paper/starters/format/) e [word list 2025](https://www.cambridgeenglish.org/Images/506166-starters-movers-flyers-word-list-2025.pdf). Non sono una prova che questo modulo copra quell’esame. Non viene scelto o dedotto Starters/Movers/Flyers/CEFR dalle risposte. Niente simulazioni, scoring d’esame, loghi/endorsement, copia di test o garanzia di allineamento/parità fra bambini. I materiali della classe non sono ancora stati ricevuti: le basi originali non dipendono da essi.

Preparato e testato soltanto su work. Ultima release live verificata resta 22f2d60. Restano hosting, consegna email reale e recupero proprietario; la resa audio va inoltre controllata sul dispositivo. Anteprime in docs/review, con dati fittizi e voce simulata dove indicato.
