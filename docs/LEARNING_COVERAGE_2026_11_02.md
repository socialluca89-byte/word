# Copertura didattica, audio e disponibilità del rilascio

Fotografia del **2 novembre 2026, ore 17:44 UTC**. Base esaminata: `6819fe41583435938519592cb5f733bad0d0e35c`, ramo `fix/consistent-play-experience-20261101`. Le aggiunte del nuovo lotto in lavorazione non vengono dichiarate completate da questo inventario. Le vecchie note «solo work», i conteggi e gli stati di pubblicazione nei documenti storici non prevalgono sui sorgenti e sulle evidenze datate qui sotto.

Il pubblico è composto da bambini di 6–7 anni che partono dalle basi. **Attività presente non significa competenza acquisita**: i risultati del gioco descrivono le risposte confermate e gli aiuti usati, non una diagnosi, un livello Cambridge o la qualità della pronuncia. Nessuna registrazione o dato reale degli alunni è stato letto per questa verifica.

## Inventario verificato nei sorgenti

| Area | Contenuto effettivo | Abilità esercitata e limite |
| --- | --- | --- |
| Lettere IT/EN e Spelling | 26 lettere maiuscole/minuscole in 13 coppie: A/E, B/C, I/D, F/G, H/J, K/L, M/N, O/P, Q/R, S/T, U/V, W/X, Y/Z | Confronto dei **nomi** italiani/inglesi, riconoscimento scritto o ascoltato, spelling sequenziale con nomi controllati. Non insegnamento di 26 fonemi. |
| Allenamento parole | 43 identificatori distinti, 7 percorsi, 50 riferimenti complessivi perché alcune parole sono condivise | Due parole per sessione: modello, significato/riconoscimento, composizione con tessere, richiamo scritto con aiuto facoltativo, completamento di una piccola frase. Non costruzione libera di frasi o conversazione parlata. |
| Progressione delle lettere | Due scelte iniziali, poi 3/4 solo con evidenze ripetute in giorni diversi; lettura e ascolto separati | Aiuti e ritorno a due scelte senza azzerare lo storico. Il numero di alternative non è un voto né una certificazione. |
| Giochi classici e missioni | `curriculum.json`: 31 categorie, 256 righe, **227 stringhe obiettivo distinte dopo conversione in minuscolo** | Sono parole **e frasi**, con ripetizioni fra categorie; non 227 parole nuove o competenze diverse. Sei modalità classiche più missioni/sfide usano parti dello stesso lessico. |
| Preposizioni illustrate | in, on, under, by, next to, in front of, behind, between; gatto/scatola (4 frasi), penna/libro (7), topolino/scatole (7) | Relazione spaziale visibile e completamento della frase. Le equivalenze curate by/next to non diventano distrattori reciprocamente sbagliati. |
| Quantità e numeri | one–ten; thirteen, fourteen, fifteen; 10 esempi «How many?» | Associazione cifra/parola e conteggio di figure nelle attività dedicate. **Non è presente una serie completa 1–20**. |
| Saluti e frasi personali | 13 voci saluti, 6 coppie domanda/risposta, 6 esempi «about me» | Riconoscimento di risposte e frasi fisse con nomi inventati. Non comprensione libera del parlato o verifica della produzione orale. |
| Suoni nelle parole | S /s/: sun, six, seven; P /p/: pen, pink, pencil; B /b/: bag, book; N /n/: nose, nine, no | 4 gruppi, 11 parole, 6 attività per gruppo: **24 attività guidate**. Iniziale evidenziata e confronto nome/suono con adulto; non discriminazione autonoma di fonemi ascoltati. |
| Ripasso e report | Aiuti/errori, risposte autonome ripetute e ripasso delle difficoltà recenti nei protocolli previsti; report adulto dei soli profili autorizzati | Nessuna riclassificazione inventata del passato, classifica delle difficoltà o collegamento automatico genitore–alunno. Ospite e offline non equivalgono al report privato sincronizzato. |
| Offline | Lettere guidate a due scelte e percorsi parole con salvataggio locale, oltre al ripasso pubblico | Browser condiviso, non archivio privato per profilo. Non sincronizzazione account, adattività completa 2→3→4 offline o ascolto fonemico autonomo. |

Le 13 schede raggiungibili in «Esercizi e temi» comprendono le 10 voci di `lessonTopics` più gatto/preposizioni, ripasso corpo e saluti. Non sono 13 corsi separati. Gli otto mondi, i minigiochi, le sfide e i premi sono contesti di gioco: il loro numero non aumenta automaticamente la copertura linguistica.

### I sette percorsi parole

| Percorso | Obiettivi scritti esatti |
| --- | --- |
| Prime parole | cat, pen, dog, sun, book, red |
| Il mio corpo | ear, eye, nose, mouth, hand, foot |
| A scuola | pen, book, pencil, bag, ruler, notebook |
| I colori | red, blue, green, yellow, pink, purple |
| Numeri da 1 a 10 | one, two, three, four, five, six, seven, eight, nine, ten |
| Saluti e risposte | hello, thanks, yes, no |
| Classroom · Dettato | pencil, pen, book, eraser, scissors, glue stick, crayons, notebook, sharpener, marker, bookbag, desk |

`bookbag` resta una parola; `glue stick` mantiene lo spazio; `scissors` e `crayons` mantengono il plurale della scheda. Classroom è un percorso di **Allenamento**, non una nuova categoria omonima in `curriculum.json`. Il campo storico `words` conserva le prime 6 voci per compatibilità; i client attuali usano `foundationWords` con 43 voci e i percorsi espliciti. Ogni voce ha una frase e una lacuna curate: completare quella lacuna non dimostra di saper riordinare o produrre tutta la frase.

Gli altri temi sono già presenti nei giochi/missioni: corpo (20 voci), colori (10), giocattoli (10), casa, animali, mezzi, sport, spazio, oceano e dinosauri (8 ciascuno), famiglia (8), cibo (10), vestiti (8), meteo (8), azioni quotidiane (8), oltre agli insiemi alfabetici e ai ripassi. La loro presenza non significa che tutti abbiano già un percorso guidato equivalente ai sette sopra.

## Audio: cosa è disponibile e cosa non è stato dimostrato

1. **Nomi delle lettere:** `training.json` contiene cue come `ay`, `bee`, `see`, `zed`; sono supporti per il TTS dei nomi, non una trascrizione fonetica da insegnare come tale. L'adulto deve ascoltare e confermare la singola lettera con la voce selezionata. Una voce disponibile non è automaticamente una voce già verificata.
2. **Parole e frasi intere:** Allenamento seleziona solo voci che il browser dichiara `localService === true`; senza una voce adatta o dopo un errore passa esplicitamente alla lettura. Non si finge un risultato d'ascolto. Nelle altre modalità classiche la selezione delle voci è quella preesistente: non si estende a tutto il prodotto la garanzia tecnica di voce locale specifica di Allenamento.
3. **Fonemi isolati:** `phonemeAudioAvailable` è `false`. Non ci sono file audio `.mp3`, `.wav`, `.ogg`, `.m4a` o `.flac` nel bundle `dist`. Il TTS non riceve `/s/`, `/p/`, `/b/`, `/n/`, lettere nude o pseudo-sillabe come sostituti di un fonema affidabile. Le parole non sono tagliate con tempi presunti; l'evidenziazione dell'iniziale è statica.
4. **Qualità e dispositivi reali:** i test con voci simulate dimostrano controlli, stop, ripresa e distinzione lettura/ascolto; **non dimostrano** intelligibilità, accento, volume, latenza o correttezza della pronuncia sul tablet della famiglia. Non sono presenti allineamento audio–grafemi, riconoscimento vocale o valutazione automatica della pronuncia.

Una verifica umana finita comprende: ascoltare i 26 nomi IT/EN con le voci realmente disponibili; controllare le 12 parole Classroom e le loro forme scritte; provare ripetizione/stop/cambio domanda/background; provare l'assenza della voce e il fallback dichiarato. Non richiede registrazioni dei bambini, microfono o invio di documenti a terzi. Il vecchio tablet fisico resta una verifica rinviata, non dichiarata risolta dal test Chromium.

### Fonti e diritti della fonetica

Le undici iniziali sono documentate usando **CMU Pronouncing Dictionary**, commit `74790861f652b15e4ac49015a90074ad62a27690`. La verifica lessicale e gli esempi ARPAbet sono in [PHONICS_FOUNDATION.md](PHONICS_FOUNDATION.md); copyright, condizioni di redistribuzione e disclaimer sono conservati in [CMUDICT_LICENSE.txt](CMUDICT_LICENSE.txt). Il lessico è americano: non certifica l'accento di una voce en-GB o la correttezza acustica di un file.

La licenza del dizionario **non fornisce una licenza per registrazioni vocali reperite altrove**. Il passo necessario prima di proporre ascolto fonemico autonomo resta: quattro clip affidabili /s,p,b,n/, diritti di riuso documentati, modello linguistico scelto, revisione qualificata e controllo su dispositivi reali. Nessuna clip è stata procurata, voce creata o servizio attivato da questo inventario. Nuovi digrammi, vocali, lettere mute o corrispondenze devono essere curati separatamente: non si generano regole universali dalla grafia.

## Sequenza successiva finita per le basi

Questa è una proposta di sviluppo verificabile, non un elenco di funzioni già consegnate o un curriculum infinito. Non sostituisce le attività attuali e non richiede servizi nuovi. Ogni passo conserva aiuti, pausa/ripresa e storici; i premi personali restano distinti dalle competenze.

| Passo | Consegna delimitata | Prova necessaria prima di dichiararlo pronto |
| --- | --- | --- |
| 1. Scegliere cosa ripassare | Un prossimo passo comprensibile sui **43 obiettivi esistenti**, con ripasso guidato e possibilità di scegliere liberamente gli altri percorsi | Raccomandazioni basate su attività reali, nessun dato inventato per un profilo nuovo, aiuti non punitivi e nessun reset. Il nuovo lotto in lavorazione va registrato con il suo commit/test, non assunto completo qui. |
| 2. Dalla parola alla frase | **12 frasi brevi originali** da riordinare/completare, riusando i modelli già presenti «I have…», «This is…», «The ball is…» | Distinguere la composizione di parole dalla composizione di frasi; spazi, ordine e significato curati; distrattori non equivalenti. Revisione adulta/didattica prima del catalogo definitivo. |
| 3. Numeri e quantità | Completare **1–20** con le 7 forme mancanti: eleven, twelve, sixteen, seventeen, eighteen, nineteen, twenty; aggiungere **12 consegne di conteggio** curate | Numero di oggetti verificabile, singolare/plurale coerenti e separazione fra lettura del numero e conteggio. Niente confusione fra numero di monete e risultato didattico. |
| 4. Comprendere una consegna | **8 brevi istruzioni** su oggetti/azioni già noti, con parola/frase intera e risposta visiva nell'attività | Il risultato deve dipendere dalla consegna compresa, non dalla posizione fissa della risposta. Nessuna valutazione della voce o del movimento del bambino; fallback lettura dichiarato. |

Le famiglie di istruzioni possono riguardare aprire/chiudere il libro, indicare un oggetto, scegliere una matita e posizionare un oggetto sopra/sotto un riferimento. Testo, immagini e alternative finali vanno curati come un insieme finito prima dell'implementazione. L'eventuale estensione guidata a famiglia, vestiti o meteo riusa prima il lessico già presente e rimane un lotto distinto, non una promessa automatica.

Per il futuro Cambridge sono pertinenti ascolto, lettura/scrittura, spelling e interazione orale, ma la copertura attuale è parziale e non misura la parte orale. I riferimenti ufficiali già individuati sono [formato Starters](https://www.cambridgeenglish.org/exams-and-tests/qualifications/young-learners/paper/starters/format/) e [word list 2025](https://www.cambridgeenglish.org/Images/506166-starters-movers-flyers-word-list-2025.pdf). Non sono stati ricontrollati in rete per questo inventario e non sono stati copiati test o materiali protetti. Livello/formato effettivo e revisione dell'insegnante servono prima di una mappa specifica d'esame: niente marchi di approvazione, scoring ufficiale o garanzia di preparazione completa.

## Rami, CI e pubblicazione: controllo solo in lettura

Controllati i due riferimenti con `git ls-remote`, la [lista pubblica Actions](https://github.com/socialluca89-byte/word/actions), le pagine pubbliche dei run indicati e il workflow locale. Nessun fetch/merge/push, dispatch, accesso SSH, richiesta alla home/health di WordyLand o modifica a hosting/account/credenziali.

| Oggetto | Evidenza al controllo |
| --- | --- |
| `main` remoto e locale | `5d4c6b2837c9291ae57ac04b7fa799b4984afa39` |
| Ramo revisione remoto e HEAD locale | `6819fe41583435938519592cb5f733bad0d0e35c`, 9 commit oltre il main locale |
| Ultimo run revisione | [#66, 41480237388](https://github.com/socialluca89-byte/word/actions/runs/41480237388): **SUCCESS** sul commit `6819fe4`; verify 1m01, browser 12m59, durata complessiva 13m03. Deploy saltato, non una pubblicazione. |
| Ultimo run `main` osservato | [#58, 41344585348](https://github.com/socialluca89-byte/word/actions/runs/41344585348): deploy fallito al `public-health-preflight`; annotazioni pubbliche dichiarano HTML anti-bot e nessun SSH/upload/install/cache purge tentato. |
| Ultimo live dimostrato dalle precedenti prove | `901fd989cf79d84e651164af5ccc8f6774e53bf1`, [run41339330482](https://github.com/socialluca89-byte/word/actions/runs/41339330482). **Nessun nuovo controllo live fatto qui**. |

Il workflow esegue verify/browser su PR e sul ramo di revisione. Deploy richiede `main`, `SG_PATH` presente e push o dispatch deploy; probe e rollback restano main-only con dispatch esplicito. Il test di deploy usa un server finto locale: le annotazioni «cache purge 127.0.0.1» del job verify non attestano accesso o sblocco SiteGround.

**Non emerge una nuova prova pertinente di risoluzione del challenge SiteGround.** Questo non dimostra che il server lo rifiuterebbe ancora adesso: la verifica pubblica del ramo revisione non interroga quel preflight. Il coordinatore gestisce l'unico normale controllo e il rilascio autorizzati quando il nuovo candidato sarà finito. Se ricompare il challenge, si ferma: nessun bypass, cambio identità/IP, disattivazione delle protezioni o caricamento alternativo. Stato HTTP numerico e regola responsabile non sono stati dedotti dalle vecchie annotazioni.

## Limiti e passi necessari, separati

- **Per il nuovo rilascio:** candidato finale, asset e tutte le verifiche sul commit esatto; poi normale workflow e prove live. Il verde di `6819fe4` non certifica modifiche successive né il deploy.
- **Per dichiarare valida la resa audio:** prova adulta sulle voci/dispositivi reali. Non si inventano risultati di ascolto dalle fixture.
- **Per ascolto fonemico autonomo:** clip, diritti, revisione e validazione sopra indicati. È una dipendenza dell'estensione fonetica, non una ragione per togliere le attività guidate già disponibili.
- **Per una preparazione Cambridge specifica:** requisiti ufficiali del formato scelto e revisione didattica; questo documento chiude l'inventario, non l'intera preparazione.

## Fonti e controllo dell'inventario

Fonti primarie: [training.json](../dist/training.json), [curriculum.json](../dist/curriculum.json), [data.js](../dist/data.js), [training.php](../dist/training.php), [training.js](../dist/training.js), [offline.js](../dist/offline.js) e [deploy.yml](../.github/workflows/deploy.yml). Contesto: [CLASSROOM_DICTATION.md](CLASSROOM_DICTATION.md), [FOUNDATIONS_PATH.md](FOUNDATIONS_PATH.md), [LETTER_CHOICE_PROGRESSION.md](LETTER_CHOICE_PROGRESSION.md), [LEARNING_OUTCOMES.md](LEARNING_OUTCOMES.md), [OFFLINE_FOUNDATIONS.md](OFFLINE_FOUNDATIONS.md), [NAVIGATION_INVENTORY.md](NAVIGATION_INVENTORY.md) e [blocco storico del rilascio](RELEASE_BLOCK_2026_11_01_GAMEPLAY.md).

Verifica di sola lettura effettuata sui JSON: 26 lettere coperte una sola volta nei 13 blocchi; 43 ID unici e raggiungibili nei 7 percorsi; 50 riferimenti fra percorsi; tutti gli 11 esempi fonetici appartenenti al catalogo; flag audio fonemico assente coerente; 31 categorie/256 righe/227 stringhe normalizzate nel curriculum. Per le 13 schede è stato letto `lessonTopics` in un contesto Node isolato, senza avviare l'app o modificare dati. Nessuna nuova suite dell'app è stata eseguita per questo solo documento; le prove di prodotto restano quelle del candidato e della CI riferiti esplicitamente.
