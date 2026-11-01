# Candidato eventi e dettato — 1 novembre 2026

## Confronto e stato

Base pubblicata: main `f1c537a778ac29ead8a262867f4254ec7b561bde`, [run 41324947130](https://github.com/socialluca89-byte/word/actions/runs/41324947130). Metadati GitHub controllati in sola lettura: verify, browser e deploy riusciti. Il coordinamento conferma anche la versione online e lo sblocco autorizzato da SiteGround. Nessun nuovo probe/GET al sito è stato fatto da questa verifica.

Candidato applicativo: work `7fb74d940971246247659dcd5ca46680f86d62b9`, sei commit avanti e zero indietro rispetto alla base. Il merge `c56b45a` comprende già PR7. Nessun conflitto o ulteriore merge è necessario. I successivi aggiornamenti di questo rapporto e della vecchia nota 403 riguardano soltanto documentazione; il tree applicativo `dist` resta `212b9ebc0160e4e0f4d4fcc6e7cf65575cf8ff08`.

Questo documento non prova una pubblicazione degli eventi. Main non è stato modificato in questo lotto. Nessun deploy, reset, spostamento di alunni o modifica Best2 è stato eseguito. Il parent coordina l'unico rilascio successivo.

## Dove saranno le funzioni dopo il rilascio del candidato

I frammenti indicano rotte del candidato, non link già verificati sulla versione pubblica attuale.

| Schermata | Accesso e rotta | Contenuto |
| --- | --- | --- |
| Villaggi delle feste | Portale delle feste e scheda dedicata; `#festivita`, alias `#natale` | Scena 3D, calendario, missione da tre esercizi, album espandibile dei premi |
| Personaggi di Natale | Personaggi e premi, `#personaggi`, filtro **Personaggi Natale** | Dodici avatar; anteprima gratuita, uso dopo sblocco, entrata in kart/calcio/spazio |
| Accessori natalizi | Stesso guardaroba, filtro **Natale** | Tutta la raccolta: 27 premi guadagnabili, più comando gratuito per togliere la sciarpa |
| Birillo | Nel villaggio di Natale solo nel periodo previsto | Cinque scherzi giornalieri a rotazione, facoltativi e reversibili; comando per passare alla missione |
| Passaporto delle scoperte | Portale e scheda **Missione di oggi**, `#scoperte` | Tre esercizi al giorno, ripresa dopo giorni saltati, tre collezioni e 12 premi permanenti |
| Dettato Classroom | Allenamento e Spelling, `#allenamento`, scheda **Classroom · Dettato** | Tutte le 12 parole della foto, ascolto quando disponibile, riconoscimento/composizione/scrittura e aiuti; catalogo 43 parole / 7 percorsi |

Il guardaroba mostra anche i premi ancora da conquistare. Un ospite può vedere la proposta, ma per guadagnare e conservare premi sui dispositivi serve il normale profilo online posseduto. Nessun nuovo accesso ai dati dei compagni è introdotto.

## Calendario reale del candidato

Orario server **Europe/Rome**, finestre inclusive fino all'ultimo giorno. Date calcolate dalla funzione PHP presente nel candidato, senza consultare produzione.

| Evento/visitatore | Apertura | Ultimo giorno | Cosa si vedrà dopo il rilascio se avviene il 1 novembre |
| --- | --- | --- | --- |
| Natale | 1 novembre 2026 | 7 gennaio 2027 | Villaggio e missione subito disponibili; 27 premi da guadagnare con esercizi |
| Birillo | 8 dicembre 2026 | 7 gennaio 2027 | Non compare prima dell8 dicembre; elfo/elfa del guardaroba sono personaggi diversi, già conquistabili da novembre |
| Halloween | 15 ottobre 2026 | 1 novembre 2026 | Ancora attivo solo fino alla mezzanotte italiana che chiude il 1 novembre |
| Carnevale | 26 gennaio 2027 | 9 febbraio 2027 | Mostrato come prossimo evento, missioni chiuse fino all'apertura |
| Pasqua | 14 marzo 2027 | 4 aprile 2027 | Mostrata come prossimo evento, missioni chiuse fino all'apertura |
| Passaporto annuale | Sempre | Nessuna chiusura stagionale | Missione disponibile subito, indipendente dai villaggi |

Le finestre si ripetono annualmente; Carnevale/Pasqua derivano dalla Pasqua del relativo anno. Sono quattro calendari curati, non tutte le festività mondiali già implementate. Gli oggetti ottenuti restano utilizzabili dopo la chiusura. Le edizioni successive conservano l'inventario; ulteriori varianti artistiche richiedono un aggiornamento del catalogo. Il Passaporto ha una prima serie finita di 90 esercizi, non un generatore infinito di nuovi personaggi.

## Dati, sicurezza e compatibilità

- Una sola nuova tabella privata additiva `holiday_days`, creata con `CREATE TABLE IF NOT EXISTS` dopo il controllo del profilo posseduto. Nessun DROP, riscrittura dello storico o migrazione distruttiva aggiunta. Non è stata eseguita su produzione in questo turno.
- Sblocco e conferma degli esercizi sono transazionali/idempotenti; hint, errori e giorni saltati non sottraggono premi. Le missioni festive incomplete scadono al cambio del giorno italiano; la missione annuale incompleta può continuare dopo giorni saltati. Resta il limite di una nuova missione per data/percorso.
- Nessuna modifica a saldi/XP/classifiche dei giochi precedenti, ruoli, credenziali, permessi, iscrizioni classe o accessi genitore–bambino. Le nuove API verificano proprietà del profilo, metodo e token della famiglia corretta; le scritture conservano CSRF e limiti esistenti.
- `accounts.js`, `api.php`, `classroom.js`, `classroom.php` e `community.php` sono byte-identici alla base main. Le correzioni PR7 sono già incluse. La piccola modifica client community conserva il supporto agli spazi dei nuovi vocaboli nello storico ospite.
- Nessuna modifica ai passi del deploy, allowlist pubblica 47 file, credenziali SSH, protezioni o infrastruttura. La CI aggiunge 3 suite API e 4 browser; budget complessivo browser da 8 a 15 minuti e job da 30 a 40, con copertura precedente e deadline individuali invariate.

## Prove

La [verifica cumulativa locale](LOCAL_VERIFICATION_2026_11_01.json) documenta 35 controlli e 34 suite browser riusciti sullo stesso tree applicativo, incluse account/classe, cache/privacy, premi, ripresa, tastiera e mobile. Comprende due aspettative storiche dei test corrette esplicitamente, non retry senza modifiche.

Nuovo controllo mirato del candidato esatto `7fb74d9`: **11 controlli passati**, inclusi bundle/catalogo, API eventi/percorso/elfo/Allenamento e cinque suite browser (`holidays`, `journey`, `elf`, `christmas-cast`, `foundations`). [Comandi, SHA e durate](EVENTS_CANDIDATE_VERIFICATION_2026_11_01.json). Le modifiche successive sono solo documentali e non cambiano il tree applicativo verificato. Non è stata avviata una nuova CI remota e non viene dichiarato un deploy del candidato. Prima di pubblicare: CI sullo SHA finale, un solo workflow coordinato, controllo versione e flussi live.

Restano da validare su dispositivi reali voci, rendering e materiali della famiglia. Non si certifica un curriculum Cambridge completo. [Anteprime sintetiche](review/README.md), [personaggi e soglie](CHRISTMAS_CHARACTERS.md), [regole dei villaggi](HOLIDAY_VILLAGES.md), [percorso annuale](CONTINUOUS_JOURNEY.md).
