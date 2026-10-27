# Requisiti e passi residui — chiusura del 27 ottobre 2026

Aggiornamento R4 successivo alla chiusura: OCR locale immagini in [OCR_IMPORT.md](OCR_IMPORT.md), solo work, più il precedente lotto PDF in [MATERIAL_IMPORT.md](MATERIAL_IMPORT.md), solo work; nuova CI e rilascio non verificati.

Questo quadro sostituisce le precedenti liste cumulative. Cronologia in NIGHT_PROGRESS.md; revisione e prove in [TECHNICAL_CLOSEOUT.md](TECHNICAL_CLOSEOUT.md). Un prototipo o un mock non dimostrano completamento o funzionamento reale.

## Versioni distinte

- **Ultimo live verificato:** `b3ca230ff76ee708bde4d2d760e174e012bfb046`, run [40399687794](https://github.com/socialluca89-byte/word/actions/runs/40399687794). Ultimo confronto pubblico indipendente: 26 ottobre, 21:56:19 UTC, otto URL HTTP 200, hash corrispondenti, health SQLite pronto. Non è una nuova verifica live del 27 ottobre.
- **Main, non pubblicato:** `347359139b53904c13fad399e871d462062561ce`. Verify e 23 suite browser passati in [40404823239](https://github.com/socialluca89-byte/word/actions/runs/40404823239); deploy fermo al preflight pubblico SiteGround, prima di SSH e modifiche al sito.
- **Checkpoint prima di R4 su work:** `49083dd74faae89648492a8004d2441ebd60b178`, codice applicativo 6ba13cf con 58 controlli e 26 suite browser. Il successivo lotto R4 aggiunge estrazione PDF testuale e anteprima locale; prove in MATERIAL_IMPORT.md. Non è pubblicato.

## Copertura delle richieste

| Richiesta | Stato effettivo | Limite o consegna residua |
| --- | --- | --- |
| Grafica dinamica, mondi kart/calcio/spazio e altri, mobile, testi grandi, feedback errore/successo | Presenti nella base live, con movimento ridotto e ripiego grafico | Collaudo reale sui dispositivi; vecchio tablet/Chrome rimandato dall'utente |
| Nuovi esercizi, preposizioni, corpo, saluti, numeri e scuola | Giochi classici e 13 schede presenti; ampliamento Allenamento a 35 parole/6 percorsi testato, non live | Contenuti finiti, non curriculum completo; allineamento alla classe richiede materiali confermati |
| Classi, link iscrizione, sfide, presenza e ripresa | Presenti nella base live e nelle regressioni sintetiche | Non interrogati alunni reali o conteggi iscritti durante questa revisione |
| Personaggi, guardaroba, varietà premi | Base live: 6 personaggi/48 oggetti, 3 adesivi finiti Allenamento; conservati | Nuovi contatori guidati/offline separati da XP e crediti; nessun premio infinito da replay |
| Segnalazioni migliorie/bug, logout e cambio password | Presenti nella base live; conferma password persistente durante autosave corretta su work | Correzione UI non live; nessuna modifica alle credenziali reali |
| Amministratore, recupero password e account Luca | Meccanismi codice/link classe e flussi email implementati/testati con fixture | Ruolo/recuperabilità del vero account Luca, trasporto/mittente e consegna email non verificati |
| R1: lettere IT/EN, alternative 2→3→4 | Pubblicato b3ca230, progressione per competenza, aiuti e sessioni conservati | Audio reale da verificare; offline a due alternative guidate |
| R2: ascolto, parola/immagine, composizione, frase e ripasso | Work: 35 parole/6 percorsi, scelte ospite mescolate e congelate, storici conservati | Pubblicazione bloccata; non ogni contenuto possibile della classe |
| R3: progresso del bambino iscritto separatamente da link classe | Report privati dei profili già posseduti presenti; collegamento sicuro fra account separati **non implementato** | Progettare/provare invito verificabile, scadenza, consenso, revoca e isolamento con fixture. Associazioni reali solo con rapporto verificato; mai abbinare per nickname/email/link classe |
| R4: materiali foto/PDF | Work: PDF testuale e OCR sperimentale locale di una singola immagine stampata, revisione obbligatoria, allegato opt-in; manuale conservato | OCR reale riuscito solo su fixture sintetiche, non garanzia sulle foto reali/calligrafia. PDF scansionati non rasterizzati, ritaglio/rotazione assistiti mancanti; validazione reale e futura consegna MIME/worker/WASM da verificare. OCR_IMPORT.md |
| R5: nome lettera distinto dal suono nella parola | Work: percorso guidato S/P/B/N, 11 parole verificate e 24 attività; report sempre guidato | Mancano quattro audio fonemici affidabili, revisione qualificata e ulteriori gruppi/vocali/digrafi. TTS di parole/nomi non equivale ai fonemi; nessuna valutazione della pronuncia |
| R6: futuro supporto Cambridge | Basi originali e riferimenti ufficiali individuati | Inventario competenze coperte/mancanti ancora da sviluppare; curriculum completo/simulazioni non pronti. Revisione insegnante e futuro formato/livello per estensione specifica, senza garanzie d'esame |
| R7: web app e offline | PWA/cinque temi di ripasso live; work aggiunge parole/spelling 35/6 e lettere IT/EN 26/13 blocchi, ripresa e fallback lettura | Ospite del browser condiviso, non profilo privato. Sync account, adattività offline 2→3→4 e cold-start fonetica non implementati |

## Soli passi ancora necessari

1. **Pubblicazione:** autorizzazione all'invio della [bozza SiteGround](SITEGROUND_REQUEST_WORDYLAND.md) pendente; ottenere diagnosi health/regola e prova della risoluzione. Poi riconciliare versioni, CI completa, workflow e confronto live. Nessun retry o aggiramento nel frattempo.
2. **R3:** prototipo sintetico e revisione autorizzazioni prima di associazioni reali genitore–alunno. Codice preparatorio sviluppabile senza dati reali; attivazione reale richiede rapporto verificato e consenso.
3. **R4:** validare PDF testuale e OCR stampato su dispositivi/materiali reali forniti e confermati dall’adulto. Il motore locale funziona su fixture; restano PDF scansionati multipagina, ritaglio/rotazione assistiti e limiti di qualità. Nessun trasferimento o costo implicito; OCR_IMPORT.md.
4. **R5/R6:** inventario e ulteriori esercizi originali sviluppabili; quattro clip /s,p,b,n/ con diritti, modello inglese e revisione qualificata necessari prima delle prove autonome d'ascolto. Estendere il primo set senza promettere curriculum Cambridge completo.
5. **Validazioni reali:** voci sui dispositivi dell'adulto, configurazione non segreta trasporto/mittente e procedura privata Luca. Invio email di prova, reset o nuovi accessi richiedono autorizzazione specifica; mock non dimostrano consegna o recupero.

Estensioni R7 escluse: sync privata, adattività offline e fonetica autonoma offline. Non sono condizioni per usare il percorso ospite finito già sviluppato e non vanno dichiarate presenti. Risposte parziali restano nel browser condiviso, senza isolamento fra utilizzatori: [OFFLINE_FOUNDATIONS.md](OFFLINE_FOUNDATIONS.md).

La chiusura tecnica precedente non aggiungeva funzioni; il lotto successivo R4 è un incremento distinto solo work. Caffè Oro fuori dal task; vecchio tablet rinviato. Nessun invio a SiteGround, email, reset, nuova credenziale, lettura alunni reali o modifica alla sicurezza hosting.
