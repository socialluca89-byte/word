# WordyLand — tre correzioni UI del 17 novembre

L’utente ha approvato «ok procedi» dopo l’installazione di Taste Skill e la revisione con tre priorità. Base sorgente `ccd78a471924409239194608cc5d4da599791fbb`: conserva l’installazione locale della skill. Base applicativa pubblicata e verificata `8de8e233f5a4f0c2ee5295552d5f9d89cf714d79`, run43609838612,54verify/66browser e deploy/live PASS14novembre16:36:20Europe/Rome.

## Direzione grafica finita

Gioco didattico illustrato per bambini. Conservare disegni riconoscibili, palette allegra e scritte grandi; azione principale evidente, comandi secondari più quieti, spazio sufficiente alle risposte e agli aiuti. Colori attuali come riferimento: verde `#3e7c6b`, inchiostro `#193e55`, cielo `#f4fafc`, carta calda `#fff8e9`, bianco. Font esistenti e altezza naturale dei contenuti; nessuna nuova dipendenza, fotografia, font remoto, shader o animazione. La revisione applica Taste Skill insieme alle esigenze dell’applicazione descritte in TASTE_SKILL_ADOPTION_2026_11_17.md.

## Tre interventi

1. **Feedback:** togliere bordo, sfondo, ombra e padding soltanto quando la regione grammaticale è vuota. La regione `role=status`/`aria-live` resta nel DOM e disponibile agli annunci; errore, risposta corretta, aiuti e azione successiva devono restare visibili quando popolati.
2. **Scena degli esercizi:** la grammatica attiva usa la stessa modalità focalizzata delle parole. Pausa, menu, completamento, ritorno e navigazione ripristinano la corretta presentazione senza coprire altri giochi o perdere la ripresa/audio/focus. Non è una modifica ai piani o alla didattica.
3. **Home:** alleggerire bordi, ombre e superfici dei riquadri secondari, mantenendo tutte le entrate, il disegno principale, testo, ordine, dimensioni accessibili, contrasto e indicazione di focus. Nessuna nuova destinazione o funzione.

## Inventario da preservare

La home contiene il comando illustrato per gli otto mondi; Allenati, Gioca in classe e Personaggi; Dettato classe, Lettere e parole, Villaggio feste e Passaporto; aiuto opzionale alla scelta, ripasso consigliato, preposizioni, installazione e ripasso offline. La navigazione adulti/assistenza, account, classi, programma e progressi mantiene gli stessi permessi e collegamenti. Le unità Best2, tutti i giochi e le categorie di premi/personaggi restano invariati. Nessun account o assegnazione reale viene modificato.

## Prove e consegna

Confronto prima/dopo da versione8de immutabile, su320/390/768/1360px, con dati sintetici. Verificare geometria/zoom, bersagli touch, focus, stati di feedback e regione accessibile; pausa/ritorno/indietro/doppio clic/ripresa, completamento e uscita dalla grammatica, audio interrotto e collegamenti preesistenti. Conservare identici PHP, JSON didattici, asset illustrati e codice degli archivi; verificare nessun nuovo accesso ai dati.

Versionare JS/CSS a sorgenti congelate. La pipeline conserva54verifiche e tutte66suite precedenti, più la nuova regressione `taste-ui` (67totali). Eseguire localmente le54verifiche e le suite pertinenti; prestazioni in isolamento con soglia5secondi invariata. CI completa sul candidato esatto e normale deploy/live restano necessari prima di dichiarare il nuovo aspetto pubblicato. Nessun `GATE: PASS` promozionale viene simulato o sostituito ai controlli del gioco.
