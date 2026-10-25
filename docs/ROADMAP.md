# Roadmap WordyLand

Aggiornata il 25 ottobre 2026. Pubblico: bambini di 6–7 anni, prima classe pilota; genitori/docenti con accessi distinti. Obiettivo: imparare l'inglese con un gioco chiaro, piacevole e affidabile. Cambridge è un possibile traguardo futuro, non una promessa di preparazione completa.

Questa roadmap ordina le richieste e propone passi successivi: non autorizza da sola pubblicazioni, servizi, costi, raccolte dati o cambiamenti agli accessi. Nessuna funzione esistente va rimossa o resa irraggiungibile. Le stime di calendario richiedono prima la chiusura dei blocchi esterni; qui usiamo traguardi verificabili.

## Stato di partenza

| Stato | Contenuto / prova |
| --- | --- |
| Ultimo live verificato | 22f2d6028b87c0ae22029eaa211c148a7964ef69; non una nuova verifica live odierna |
| Main non equivale al live | 77e071c: deploy fallito, rollback a 22f2d60 verificato; non dichiararlo pubblicato |
| Già esistente, da conservare | Giochi/mondi (kart, calcio, spazio e altri), sei modalità classiche, tredici schede, preposizioni, personaggi/premi, account, classi/inviti/sfide/presenza, segnalazioni, strumenti adulti e PWA/ripasso offline |
| Sviluppato e testato su work, non live | Ripasso recente/alternative corrette, accessibilità composizione, anteprime guardaroba e salvataggi acquisti ospite, riepilogo privato adulti; primo Allenamento IT/EN e Spelling con tre adesivi personali |
| Primo modulo Allenamento | Commit b323c3f; 56 controlli locali e 22 suite browser passati nell'incremento, non prova di audio reale o pubblicazione. Sei parole iniziali, non curriculum completo |
| Problemi aperti verificati | Risposte di verifica SiteGround su HTTPS e su alcune risorse HTTP dal cloud; recupero email non attivato; accesso reale proprietario non verificato |
| Tablet originale | Hamlet Exagerate XZPAD410L Rev. 2.0; versione Android/browser e prova sul dispositivo ancora mancanti. ERR_EMPTY_RESPONSE non riprodotto con certezza |

Dettagli aggiornati: [PLAN_STATUS](PLAN_STATUS.md), [TRAINING_SPELLING](TRAINING_SPELLING.md), [diagnosi HTTP/HTTPS](HTTP_HTTPS_DIAGNOSIS.md). In caso di divergenza, distinguere sempre codice preparato e release realmente verificata.

## 1 — Rendere affidabile l'accesso e sbloccare i rilasci (P0)

1. Sul corretto account SiteGround WordyLand, chiarire dai log/regole le risposte 202 alla home HTTPS e alle risorse versionate. Controllare certificato e redirect HTTP→HTTPS dopo aver verificato la destinazione. Non disabilitare WAF/TLS/CAPTCHA né aggirare i controlli. Il coordinatore gestisce il contatto hosting: nessun ticket duplicato.
2. Diagnosticare il tablet con versione Android/browser e prove stesso Wi-Fi/altro dispositivo/rete mobile, senza cancellare progressi locali. Distinguere problema di rete iniziale, protezione hosting, TLS e compatibilità JavaScript/WebGL/audio. Definire una matrice di dispositivi effettivamente supportati; un viewport mobile su Chromium moderno non emula un vecchio Android.
3. Dove un difetto applicativo sia riproducibile, preparare una correzione isolata. Valutare resa leggera 2D quando manca WebGL o il dispositivo è lento, conservando gli accessi ai giochi; se il browser è troppo vecchio, mostrare indicazioni comprensibili dove tecnicamente possibile. Non promettere compatibilità universale né suggerire browser obsoleti non sicuri.
4. Verificare in sola lettura lo stato dell'account Luca con la diagnostica minima già preparata. Recupero privato distinto da deploy, senza riassegnazioni automatiche di ruolo o reset indiscriminati.
5. Verificare trasporto/mittente e consegna email prima di attivare il recupero: link breve monouso, limiti tentativi, messaggi che non rivelano l'esistenza dell'account, revoca sessioni. La sola email non deve consentire il recupero senza prova di possesso. Non dichiarare email inviate senza consegna verificata.
6. Dopo chiarimento hosting, revisionare gli incrementi e pubblicarli in lotti coerenti attraverso la pipeline esistente. Conservare backup, controlli integri e rollback. Non usare il grande lotto Allenamento come tentativo di risolvere il tablet.

**Si chiude quando:** pagine e risorse rispondono correttamente nei percorsi ordinari provati; HTTP reindirizza correttamente se attivato; accesso/recupero sono verificati con l'adulto autorizzato; ogni rilascio ha commit/run/live-check confermati. Registrare separatamente eventuali dispositivi non supportati e blocchi email ancora aperti.

## 2 — Portare in uso Allenamento e Spelling (P1)

Prima versione già sviluppata, non da riscrivere:

- Stessa lettera IT/EN: alfabeto esplorabile, nome italiano e inglese, blocchi A/E, B/C, I/D.
- Ascolto/lettura → riconoscimento → composizione → richiamo senza modello → piccola frase. Pausa, aiuti e ripresa.
- Adesivi personali finiti, senza XP/monete/classifiche. Errori e aiuti non tolgono premi.
- Progressi privati dei profili autorizzati; competenze e autonomia separati dai premi.

Da completare per l'uso reale:

1. Controllare nomi delle lettere e parole con un adulto sui dispositivi effettivi; le voci simulate dei test non provano la pronuncia. Senza voce adatta resta esplicita la modalità lettura.
2. Provare un percorso intero con account sintetico e poi, con partecipazione volontaria del genitore, osservare l'usabilità senza registrare voce/video o introdurre tracciamenti esterni.
3. Verificare che ogni genitore veda soltanto i figli/profili autorizzati. L'iscrizione autonoma via link classe non crea già un legame genitore-figlio: definire e testare un eventuale collegamento tramite invito/verifica, prima di implementarlo.
4. Rilasciare con controlli di economia invariata, idempotenza, perdita della conferma, cambio profilo e ripresa da altro dispositivo. Non chiamare offline ciò che richiede ancora il catalogo online.

**Si chiude quando:** ingresso evidente, audio onesto, percorso completabile/riprendibile e progressi corretti; nessuna regressione nei giochi, nei premi o nei permessi precedenti.

## 3 — Ampliare il percorso didattico con qualità (P1/P2)

- Estendere gradualmente i blocchi a tutte le lettere, con revisione dei nomi IT/EN; non confondere nomi delle lettere e fonemi.
- Organizzare percorsi brevi: presentazioni, colori/numeri, scuola, corpo, animali/oggetti, preposizioni e frasi quotidiane. Riutilizzare i contenuti già esistenti prima di aggiungere doppioni.
- Per le preposizioni, distinguere visivamente in/on/under/behind/in front of/between/next to; istruzioni grandi, esempi coerenti e alternative non ambigue. Originali, senza ripubblicare foto di quaderni o dati personali.
- Introdurre parole e frasi nuove per piccoli set revisionati; audio, immagine e grafia devono corrispondere. Aumentare la difficoltà gradualmente, mantenendo aiuti e scelta libera dei giochi.
- Ripasso guidato da difficoltà ripetute e occasioni distinte; una risposta sbagliata non determina un livello. Indicare progressi mancanti senza inventarli.
- Valutare un futuro percorso suoni→gruppi di lettere solo con materiale fonetico affidabile e verificato; non usare il TTS dei nomi delle lettere come sostituto dei fonemi.
- Mappare in seguito le competenze pertinenti ai riferimenti ufficiali Cambridge, quando sarà definito il percorso della classe. Niente scoring di prontezza, simulazioni presentate come ufficiali o garanzie d'esame.

**Si chiude per ogni set quando:** contenuti revisionati, aiuti/errori/replay corretti, nessuna alternativa ingannevole, accessibilità verificata e regressioni passate. Non attendere un intero curriculum per consegnare un set utile.

## 4 — Classe e sfide facili da capire e riprendere (P1/P2)

- Verificare la scoperta di Crea classe, invito, iscritti, online e Sfida un compagno: sono funzioni esistenti, da rendere evidenti e verificare nel contesto giusto.
- Controllare che la classe pilota mostri chi appartiene davvero a quella classe. Nessuno spostamento in massa di iscritti o iscrizione automatica globale.
- Stato online basato su presenza recente, con scadenza; non promettere che online significhi disponibile a giocare. Nickname nel contesto privato della classe, niente elenco pubblico di bambini.
- Invito/sfida: avversario chiaro, accetta/rifiuta/annulla, gestione di chi esce o perde la rete; riprendi o abbandona esplicitamente una sfida non conclusa.
- Testare risposte duplicate, notifiche vecchie, due dispositivi, riconnessione e ricompense una sola volta. Non presumere che la ripresa della missione singola copra tutti i casi delle sfide.
- Mantenere controlli docenti/amministratore separati da ospite/alunno e da visibilità privata genitore.

**Si chiude quando:** due account sintetici della stessa classe possono trovarsi, sfidarsi e gestire interruzioni senza perdita o duplicazione; account esterni non vedono dati riservati.

## 5 — Grafica dinamica e usabilità per bambini (P2)

- Conservare una home con azione principale chiara, ripresa immediata e accesso a tutte le funzioni, su telefono e tablet.
- Rafforzare coerenza fra mondi, avatar, carte e pulsanti; testo degli esercizi grande, contrasto e tocchi comodi. Le istruzioni devono funzionare anche senza audio.
- Dare vita alle azioni: ingresso del personaggio, risposta visiva del mondo a una scelta, animazioni brevi durante avanzamento e vittoria. Il movimento deve spiegare un'azione, non distrarre continuamente.
- Errore: X evidente più spiegazione semplice/esempio e possibilità di riprovare. Successo: animazione/audio facoltativi, messaggio concreto; non dipendere solo dal colore.
- Kart, calcio, spazio e altri mondi: migliorare la relazione fra attività didattica e scena senza eliminare modalità o forzare una preferenza di gioco.
- Rispettare movimento ridotto, audio disattivabile, tastiera/focus e navigazione Indietro. Caricare le scene quando servono, offrire resa leggera se verificata necessaria.

**Si chiude quando:** ogni modifica ha confronto prima/dopo e prova su dispositivi scelti; niente peggioramento significativo di avvio, fluidità o raggiungibilità. Il valore si misura in chiarezza e uso, non nel numero di animazioni.

## 6 — Personaggi, premi e progressi adulti (P2)

- Rendere comprensibili scelta/equipaggiamento del personaggio, anteprima gratuita e oggetti posseduti; pubblicare prima le correzioni già testate.
- Consolidare salvataggi di premi/acquisti con rete interrotta o memoria piena; non affermare una spesa/equipaggiamento salvato senza conferma. Verificare anche i percorsi non coperti dal solo negozio ospite.
- Valutare nuovi adesivi, accessori e decorazioni coerenti con i mondi soltanto dopo aver verificato catalogo e usabilità esistenti. Premi finiti e non punitivi; niente acquisti reali, urgenze o ricompense infinite da click.
- Area adulti: competenze esercitate, aiuti/autonomia, andamento nel tempo e suggerimenti di ripasso; separare attività osservata da padronanza e da premi.
- Segnalazioni: verificare invio, conferma, gestione/stato e protezione dei contenuti. Raccogliere solo quanto serve al problema, senza chiedere dati personali dei compagni.

**Si chiude quando:** nessuna perdita/doppio premio nelle prove; adulti vedono solo ciò che possono vedere; ogni indicazione è basata su dati reali disponibili, senza confronti pubblici fra bambini.

## 7 — Web app, prestazioni e manutenzione (trasversale)

- La PWA esiste già: verificare installazione su Android/iOS supportati, aggiornamento senza perdere partita e chiarezza online/offline. Non serve promettere un'app nativa per iniziare.
- Per un futuro Allenamento offline valutare separatamente catalogo pubblico, coda risposte/idempotenza e conflitti di sincronizzazione; mai mettere API/account privati nella cache pubblica. È una proposta da progettare, non una funzione già pronta.
- Misurare su dispositivo e rete dichiarati: caricamento iniziale, disponibilità dell'azione principale, scene WebGL/memoria, fluidità e peso asset. Rilevare una baseline prima di fissare obiettivi numerici; non inventare percentuali di miglioramento.
- Conservare controlli di sicurezza, autorizzazione per profilo, CSRF, limitazione tentativi, backup e prove di ripristino. Nessuna migrazione distruttiva o bootstrap account nel deploy ordinario.
- Definire conservazione minima dei dati, cancellazione profilo e accesso ai report con il proprietario, prima di nuove raccolte. Test con dati sintetici.
- Dopo ogni lotto: verifiche pertinenti, screenshot quando utili, commit, distinzione testato/pubblicato e controllo reale del rilascio. Non ripetere suite senza nuova ragione né nascondere fallimenti con retry.

## Ordine operativo e criteri di successo

| Traguardo | Priorità | Dipendenza principale | Evidenza richiesta |
| --- | --- | --- | --- |
| Accesso affidabile / diagnosi tablet | P0, primo | SiteGround corretto e versione Android/browser | Risposte attese e prove dispositivi, causa documentata |
| Recupero proprietario / email | P0, in parallelo | Percorso autenticato e verifica privata/consegna | Recupero verificato senza perdita dati o segreti in chat |
| Rilascio correzioni pronte | P1 | Blocco hosting chiarito, revisione lotti | Run riuscito, controlli live e rollback disponibile |
| Allenamento e Spelling utilizzabili | P1 | Audio sui dispositivi, permessi, rilascio | Percorso completo e progressi/adesivi coerenti |
| Classe/sfide robuste | P1/P2 | Due account sintetici e classe privata | Iscrizione→sfida→interruzione→ripresa verificati |
| Nuovi set didattici e dinamismo | P2, piccoli lotti | Revisione contenuti, baseline UX/prestazioni | Migliore comprensione, nessuna funzione persa |
| Premi/report/PWA consolidati | P2, continuativo | Dati autorizzati e casi offline definiti | Zero duplicazioni nei test, report privati e aggiornamenti sicuri |

Segnali da osservare nel pilota, senza attivare analytics nuovi: il bambino trova come iniziare e riprendere, comprende un errore, distingue progressivamente lettere/parole con meno aiuti in date diverse; il genitore trova il profilo e interpreta il progresso; sfide e salvataggi restano affidabili. Numeri aggregati solo se già disponibili e autorizzati. Non usare classifiche, tempo trascorso o accessi giornalieri come misura principale dell'apprendimento.

Prossima azione concreta: ottenere versione Android/browser e accesso al corretto contesto SiteGround tramite il coordinatore; chiudere la diagnosi prima di qualunque rilascio. In parallelo sono possibili revisione dei contenuti e verifiche locali del codice già pronto, senza nuove funzionalità indiscriminate.

## Avanzamento del primo lotto dopo il via dell'utente

Compatibilità applicativa sviluppata/testata su work: mappa leggera con tutte le destinazioni quando manca WebGL/API di scena, avviso di mancato caricamento e controlli browser aggiuntivi. [Riscontri e test](COMPATIBILITY_REVIEW.md). Il punto1 resta **parziale**: ancora necessari verifica hosting e prova tablet; non è una nuova pubblicazione. Le regressioni di classe/sfida, progressi, premi, PWA e Allenamento sono passate senza introdurre funzioni duplicate o cambiare accessi. I punti2–8 non diventano automaticamente completati per il solo superamento di queste regressioni.

Registro operativo dopo il consenso: [ROADMAP_EXECUTION](ROADMAP_EXECUTION.md). Estesi i blocchi guidati di Allenamento a13 per coprire26 lettere, con primi passi visibili e resto espandibile; API/browser verificano copertura e ripresa senza alterare i premi dei giochi. Anche questa estensione è solo work. Pubblicazione, audio reale, tablet e recuperi effettivi restano separati dal codice testato.

La verifica Chrome/tablet è rimandata dall’utente. Avanzato intanto il punto classe/sfide: pausa dopo feedback, risposta incerta riconciliata prima del reinvio e pulizia audio. [Dettagli](DUEL_RELIABILITY.md); nessun rilascio o modifica ai punteggi.
