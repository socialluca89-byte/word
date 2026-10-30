# Inventario funzionalità e navigazione

Vincolo esplicito dell’utente: «home più chiara solo riorganizzata senza togliere nessuna delle funzioni fatte». Non eliminare funzioni né renderle irraggiungibili su telefono o desktop. Prima di cambiare destinazioni o raggruppamenti, aggiornare questo inventario e le regressioni di raggiungibilità. Nascondere temporaneamente i menu durante un esercizio è ammesso soltanto se Pausa ripristina le destinazioni.

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
