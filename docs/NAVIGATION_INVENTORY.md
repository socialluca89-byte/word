# Inventario funzionalità e navigazione

Vincolo esplicito dell’utente: «home più chiara solo riorganizzata senza togliere nessuna delle funzioni fatte». Non eliminare funzioni né renderle irraggiungibili su telefono o desktop. Prima di cambiare destinazioni o raggruppamenti, aggiornare questo inventario e le regressioni di raggiungibilità. Nascondere temporaneamente i menu durante un esercizio è ammesso soltanto se Pausa ripristina le destinazioni.

## Lotto del 2 novembre: ingressi illustrati e ritorni

La home conserva Allenati, Gioca in classe e Personaggi, visibili insieme anche a 320px. **Esplora l’isola**, sull’illustrazione originale, apre gli otto mondi già presenti. Scegliendo un mondo si raggiungono direttamente scena e gioco; **Cambia mondo** torna alla scheda selezionata. Il riepilogo **Scoperte e personalizzazioni** mantiene cura del compagno, traguardi e arredi. I controlli Illustrazioni/3D e Rigioca restano disponibili, dopo l’attività nel loro ordine di tastiera.

**Tutte le attività** riporta alle schede di navigazione. Allenati apre un esercizio realmente avviabile; Personaggi, Classe, Preposizioni, Festività e Missione di oggi raggiungono il proprio contenuto. Il completamento di tre scoperte porta il focus a **Continua con gli esercizi**, senza avviare automaticamente una missione o assegnare monete. Sono riorganizzazioni degli accessi esistenti, senza cambi di autorizzazioni. Regressioni: child-experience, navigation, world-play, illustrated, journey-navigation, motion e suite dei singoli percorsi. Questa nota descrive il candidato di lavoro, non la versione pubblicata.

## Destinazioni esistenti da preservare

| Destinazione | Accesso attuale | Regressioni pertinenti |
| --- | --- | --- |
| Allenamento e Spelling, aggiunta autorizzata | Menu Allenamento e Spelling; scheda dedicata in Allenati; ritorno a tutti gli esercizi | training, spelling, navigation |
| Esercizi e temi, incluse preposizioni | Allenati, scheda Esercizi e temi, collegamento Preposizioni | navigation, ux, learning, school |
| Otto luoghi e missioni dell’isola | La mia isola; Casa, Animali, Colori, Kart, Calcio, Spazio, Oceano, Dinosauri | motion, adventures API, school |
| Missioni e ripresa | Scheda Missioni, Da continuare, collegamento continua | resume API/browser, autonomy |
| Sfide kart/calcio/spazio | Gioca con la classe, menu Sfida un compagno | presence, resume, adventures API |
| Personaggi, accessori, compagni e premi | Il tuo personaggio, scheda Personaggi e premi; anteprima gratuita, ritorno al relativo oggetto | characters, rewards, wardrobe |
| Iscritti e presenza | Menu Iscritti e online | presence API/browser |
| Creazione e link classe | Menu Crea classe; area adulto | classroom API, community |
| Progressi Allenamento / Spelling | Account e progressi → progressi privati, solo adulto proprietario; nessun legame genitore-alunno automatico | training API/browser, spelling |
| Programma/schede dell’adulto | Account e progressi, strumenti della scheda personale; bozze conservate durante il riepilogo | api, school, parent-summary |
| Riepilogo missioni dei propri profili | Account e progressi → Progressi nelle missioni, solo adulto proprietario | parent-summary API/browser |
| Classifica privata e obiettivo classe | Scheda La tua classe | api, community |
| Idee, bug e relativo stato | Menu Idee e bug | community API/browser |
| Amministrazione | Menu Amministrazione, solo con ruolo abilitato | community API/browser |
| Account, profili, registrazione/accesso | Accedi, Area adulti/account e progressi | access API/browser |
| Logout, cambio e recupero password | Barra accesso e moduli account/classe | access, email recovery |
| Attivazione amministratore | Link privato già previsto; mai pubblicarlo | community API/browser |
| Installazione web app | Come installare e prompt disponibile | pwa |
| Ripasso offline | Collegamento Ripasso offline, offline.html | pwa, learning |
| Sei modalità classiche (journey/write/build/match/paper/look) e scelta del mondo | Sezione di ripasso e comandi dei mondi | learning, school |
| Audio, aiuti, pausa e movimento ridotto | Comandi dell’esercizio e della scena | learning, motion, autonomy |
| Composizione di lettere nelle missioni | Banca delle tessere, caselle per togliere una lettera, Controlla; tastiera e touch | tiles, learning, resume |

I menu dell’area assistenza possono essere raccolti in un pannello, ma devono restare apribili. Una destinazione protetta può richiedere l’accesso o il ruolo appropriato: la riorganizzazione non concede nuovi privilegi e non deve cancellare l’ingresso alla funzione. Il recupero email resta configurabile ma non attivato; non presentarlo come servizio funzionante senza verifica reale del trasporto.

Le anteprime della home sono in [review](review/README.md), con dati ospite fittizi. L’inventario descrive il prodotto esistente e non è una richiesta di ricreare tutte le funzioni o introdurre nuove migrazioni/servizi.

## Revisione UX/UI del 30 ottobre 2026

- Le sette destinazioni del menu di servizio restano presenti con gli stessi URL: sono raggruppate in **Impara e gioca**, **La classe**, **Gestione e assistenza**. Il raggruppamento non cambia accessi o autorizzazioni.
- Le pagine amministrazione, gestione classe, iscritti e segnalazioni mostrano direttamente il loro pannello, senza anteporre le scelte della home e l'intera isola. **Torna al gioco** ripristina la home e la mappa; il menu di servizio e l'accesso account restano raggiungibili. Il percorso d'invito privilegia analogamente la classe e l'accesso richiesto.
- Le tre scelte iniziali restano davanti alle proposte. **Oggi cosa facciamo?** è il titolo principale della pagina; la presentazione dell'isola è un titolo di secondo livello.
- **Vai al contenuto** consente di saltare la barra account e il menu usando la tastiera. Il salto porta al landmark principale senza cambiare il frammento URL: un esercizio o il percorso Allenamento già aperto resta aperto.
- Menu di servizio, scene e barra della mappa hanno bersagli tattili di almeno 44 px; le istruzioni della mappa e i messaggi dei moduli sono leggibili anche su telefono. I controlli delle scene e tutte le destinazioni precedenti restano presenti.
- I moduli di iscrizione amministrativa e i messaggi locali utilizzano una disposizione che si adatta agli schermi stretti; le tabelle restano scorribili orizzontalmente senza allargare la pagina.
- La regressione `navigation` controlla i gruppi e tutte le destinazioni, visibilità delle pagine di servizio e ritorno alla home, salto da tastiera senza cambio rotta, gerarchia del titolo, dimensioni dei controlli e assenza di overflow a 320, 390, 768 e 1360 px. Le verifiche di ruolo, registrazione e dati restano nelle rispettive suite API/browser.

## Seconda revisione del 30 ottobre 2026

- L'area **account e progressi** mantiene la sua posizione e tutte le funzioni; il suo ingresso ha testo da 16 px e bersaglio da almeno 52 px, superando la precedente regola CSS da 12 px.
- Il ripasso classico conserva i sei modi e le stesse impostazioni. Le etichette diventano **Scegli le parole** e **Quante parole vuoi provare?**, con testo da 15 px; le descrizioni dei modi passano da 10–11 a 14 px e i selettori usano testo da almeno 16 px. La modifica rende leggibile la scelta senza cambiare domande, premi o progressi.
- Il focus da tastiera utilizza un contorno verde scuro con bordo bianco interno, visibile anche sulle schede colorate. Il percorso **Vai al contenuto** e tutti gli URL restano invariati.
- Gli otto punti della mappa 3D hanno ora un bersaglio da almeno 44 × 44 px; al focus da tastiera i nomi dei luoghi compaiono anche su telefono con testo da 12 px. La loro posizione rispetta le dimensioni reali del pulsante e del suo contorno, evitando il taglio ai bordi durante rotazione e zoom. La didascalia iniziale conserva la disposizione compatta per non coprire gli altri luoghi. Le dimensioni vengono rilevate soltanto quando cambiano, senza letture del layout a ogni fotogramma.
- Gli avvisi di connessione e aggiornamento sono riuniti in un contenitore globale prima del contenuto principale, così le pagine dedicate non possono nasconderli dentro la home. La gestione dell'aggiornamento resta esplicita e non interrompe automaticamente una partita.
- La ricerca nel pannello amministrativo usa un modulo che si dispone in colonna sui telefoni, con testo e pulsanti leggibili; l'accesso ai dati rimane vincolato al ruolo amministratore.
- `navigation` verifica anche dimensioni dell'ingresso account, tipografia del ripasso, contrasto del focus e posizione globale degli avvisi alle quattro larghezze già coperte. Tutti gli otto punti della mappa vengono raggiunti da tastiera e controllati entro i suoi bordi, anche dopo rotazione e zoom.


## Nuove destinazioni del lotto in preparazione del 1 novembre

- Passaporto annuale: portale La missione di oggi, scheda Missione di oggi e #scoperte; album delle tre collezioni espandibile da tastiera.
- Villaggi delle festività: portale delle feste, scheda dedicata, #festivita e #natale; missione prima dell'album premi, nessun premio rimosso.
- Personaggi Natale: nuovo filtro nel guardaroba con dodici avatar; le azioni kart/calcio/spazio rimangono anche nei filtri delle collezioni.
- Birillo: scherzo facoltativo nel villaggio 8 dicembre–7 gennaio, con comando per passare agli esercizi.


## Mondi giocabili — nuovo lotto separato

La mia isola e gli otto luoghi mantengono gli stessi ingressi. Ogni anteprima offre ora tre oggetti3D selezionabili e comandi equivalenti da tastiera/senza WebGL, con traguardo e Rigioca. Kart/calcio/spazio della home condividono questi obiettivi. Al termine, Continua con gli esercizi usa il percorso missione esistente; non cambia i premi. I portali delle festività/Passaporto riaprono anche la rotta già corrente dopo un cambio scheda. Regressioni: world-play, motion, navigation, performance e suite preesistenti.


## Fedeltà delle illustrazioni — revisione successiva

Le stesse destinazioni aprono ora per default scene illustrate con i disegni delle schede. Illustrazioni e 3D classico sono entrambi raggiungibili nei comandi della scena, con preferenza locale e conservazione delle missioni salvate. I venti ritratti sono condivisi fra guardaroba, passaporto e scene illustrate. Minigiochi/eventi, account, premi e strumenti adulto restano presenti. La nuova suite illustrated copre il default; le precedenti continuano a coprire esplicitamente la vista3D.

## Revisione dei percorsi,1novembre2026

Il Box di allenamento contiene ora il suo editor ospite locale; con profilo online il medesimo ingresso apre il modulo account reale. Le entrate Isola/Classe dalla pagina Allenamento e i ritorni della cronologia ripristinano la superficie visibile. Durante una scelta di guardaroba in corso, la destinazione richiesta viene conservata fino all’esito. Il guardaroba colloca titolo e controlli fuori dall’immagine. Le sfide aprono all’inizio e conservano le spiegazioni nell’aiuto dopo le risposte. Nessuna destinazione eliminata. Copertura nuova: journey-navigation, appearance-consistency, duel-identity; quadro completo in FULL_PRODUCT_REVIEW_2026_11_01.md.


## Nuovo lotto approvato del 2 novembre: guida, proposta, calendario e genitori

- Kart/Calcio/Spazio: Sinistra, azione Guida/Tira/Vola e Destra nel gioco già presente; restano tre scelte dirette, bersagli, otto mondi, Illustrazioni/3D e replay. Al completamento resta la continuazione esplicita agli esercizi.
- Allenamento: proposta breve con una CTA e motivo leggibile, prima delle scelte manuali che restano raggiungibili. Una sessione sospesa ha priorità. Nessun timer o classifica.
- Villaggi: calendario delle quattro festività in details, data del server e card dell'arrivo di Birillo anche fuori dal suo periodo. I portali e il vero scherzo non vengono sostituiti; il tasto per giocare compare solo quando attivo.
- Account e progressi: sezione genitori aggiuntiva per gli adulti verificati. Generazione esplicita del codice di abbinamento, autorizzazione del gestore per un alunno della propria classe, accettazione del genitore e sola lettura dei riepiloghi. Non rende l'alunno un profilo giocabile del genitore e non concede altri dati/classe. Revoca e scadenza restano visibili senza modifiche ai profili posseduti.

Regressioni nuove: world-driving, training-guidance, holiday-calendar e guardian, insieme a tutte le precedenti. Stato di pubblicazione da verificare in Actions; la presenza in questo inventario descrive il candidato, non prova il deploy.
