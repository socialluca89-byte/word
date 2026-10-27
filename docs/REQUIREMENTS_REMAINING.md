# Requisiti e passi residui — chiusura del 27 ottobre 2026

Lotto R4 ora pubblicato: [PDF_SCANNED_IMPORT.md](PDF_SCANNED_IMPORT.md), pagina PDF selezionata renderizzata e letta localmente, pubblicato in3c661f5; verifica cumulativa64verify+29browser e controlli livePASS. [Rapporto cumulativo](CUMULATIVE_REVIEW_2026_10_27.md).

Aggiornamento R4 successivo alla chiusura: OCR locale immagini in [OCR_IMPORT.md](OCR_IMPORT.md), ora pubblicati, più il precedente lotto PDF in [MATERIAL_IMPORT.md](MATERIAL_IMPORT.md), ora pubblicato; i limiti documentati restano distinti dalle prove reali di accuratezza.

Questo quadro sostituisce le precedenti liste cumulative. Cronologia in NIGHT_PROGRESS.md; revisione e prove in [TECHNICAL_CLOSEOUT.md](TECHNICAL_CLOSEOUT.md). Un prototipo o un mock non dimostrano completamento o funzionamento reale.

## Versione pubblicata e prove

**Main e live verificati:** `3c661f51a8306d79b66fcc101b4cefc0518fb8f8`, run [40476917297](https://github.com/socialluca89-byte/word/actions/runs/40476917297) SUCCESS27ottobre09:01:53UTC.29suitebrowserCI e41statici identici/MIMEJavaScript controllati.17URLindipendenti HTTP200/hash/MIME/healthPASS09:03:19UTC; browser ospite e componenti OCRfoto/PDFsinteticiPASS, zeroPOST/account reali. [Rilascio e prove](RELEASE_2026_10_27.md).

Il precedente b3ca230 è storico: il lavoro applicativo accumulato fino2d4f2e1 più la correzione MIME è ora online. La prima pubblicazione2d4f2e1era passata ma i PDF.mjs erano privi di MIME: corretto con byte identici sotto nomi.js e controllo MIMEobbligatorio. Nessun bypass o modifica hosting. Eventuali documenti successivi suwork non cambiano il codice pubblicato.

## Copertura delle richieste

| Richiesta | Stato effettivo | Limite o consegna residua |
| --- | --- | --- |
| Grafica dinamica, mondi kart/calcio/spazio e altri, mobile, testi grandi, feedback errore/successo | Presenti nella base live, con movimento ridotto e ripiego grafico | Collaudo reale sui dispositivi; vecchio tablet/Chrome rimandato dall'utente |
| Nuovi esercizi, preposizioni, corpo, saluti, numeri e scuola | Giochi classici e 13 schede presenti; ampliamento Allenamento a 35 parole/6 percorsi testato e pubblicato | Contenuti finiti, non curriculum completo; allineamento alla classe richiede materiali confermati |
| Classi, link iscrizione, sfide, presenza e ripresa | Presenti nella base live e nelle regressioni sintetiche | Non interrogati alunni reali o conteggi iscritti durante questa revisione |
| Personaggi, guardaroba, varietà premi | Base live: 6 personaggi/48 oggetti, 3 adesivi finiti Allenamento; conservati | Nuovi contatori guidati/offline separati da XP e crediti; nessun premio infinito da replay |
| Segnalazioni migliorie/bug, logout e cambio password | Presenti nella base live; conferma password persistente durante autosave corretta e pubblicata | Correzione UI pubblicata; nessuna modifica alle credenziali reali |
| Amministratore, recupero password e account Luca | Meccanismi codice/link classe e flussi email implementati/testati con fixture | Ruolo/recuperabilità del vero account Luca, trasporto/mittente e consegna email non verificati |
| R1: lettere IT/EN, alternative 2→3→4 | Pubblicato b3ca230, progressione per competenza, aiuti e sessioni conservati | Audio reale da verificare; offline a due alternative guidate |
| R2: ascolto, parola/immagine, composizione, frase e ripasso | Online: 35 parole/6 percorsi, scelte ospite mescolate e congelate, storici conservati | Non ogni contenuto possibile della classe |
| R3: progresso del bambino iscritto separatamente da link classe | Report privati dei profili già posseduti presenti; collegamento sicuro fra account separati **non implementato** | Progettare/provare invito verificabile, scadenza, consenso, revoca e isolamento con fixture. Associazioni reali solo con rapporto verificato; mai abbinare per nickname/email/link classe |
| R4: materiali foto/PDF | Online: PDF testuale, OCR immagine stampata e rendering/OCR di una pagina PDF selezionata (fino10pagine/4MB), revisione obbligatoria e allegato opt-in; manuale conservato | Successo solo su fixture sintetiche, non garanzia foto/calligrafia reali. Batch/unione pagine e ritaglio/rotazione assistiti esclusi. Consegna MIME/worker e motore WASM verificati sul sito con fixture; accuratezza su materiali/dispositivi reali ancora da validare. PDF_SCANNED_IMPORT.md |
| R5: nome lettera distinto dal suono nella parola | Online: percorso guidato S/P/B/N, 11 parole verificate e 24 attività; report sempre guidato | Mancano quattro audio fonemici affidabili, revisione qualificata e ulteriori gruppi/vocali/digrafi. TTS di parole/nomi non equivale ai fonemi; nessuna valutazione della pronuncia |
| R6: futuro supporto Cambridge | Basi originali e riferimenti ufficiali individuati | Inventario competenze coperte/mancanti ancora da sviluppare; curriculum completo/simulazioni non pronti. Revisione insegnante e futuro formato/livello per estensione specifica, senza garanzie d'esame |
| R7: web app e offline | PWA/cinque temi di ripasso live; la versione pubblicata aggiunge parole/spelling 35/6 e lettere IT/EN 26/13 blocchi, ripresa e fallback lettura | Ospite del browser condiviso, non profilo privato. Sync account, adattività offline 2→3→4 e cold-start fonetica non implementati |

## Passi residui ed estensioni escluse

1. **Validazione sul campo R4/audio:** dispositivi e materiali reali forniti/confermati dall'adulto, soprattutto qualità foto/calligrafia e voci del dispositivo. Il codice foto/PDF/lettura manuale è pubblicato; la riuscita sintetica non garantisce accuratezza reale. Il vecchio tablet resta rinviato.
2. **R3:** prototipo sintetico e revisione autorizzazioni prima di associazioni reali genitore–alunno. Codice preparatorio sviluppabile senza dati reali; attivazione reale richiede rapporto verificato e consenso.
3. **R4 estensioni escluse:** batch/unione pagine e ritaglio/rotazione assistiti non sono presenti. Nessun servizio da attivare implicitamente e nessuna garanzia di accuratezza o calligrafia. PDF_SCANNED_IMPORT.md.
4. **R5/R6:** inventario e ulteriori esercizi originali sviluppabili; quattro clip /s,p,b,n/ con diritti, modello inglese e revisione qualificata necessari prima delle prove autonome d'ascolto. Estendere il primo set senza promettere curriculum Cambridge completo.
5. **Validazioni reali:** voci sui dispositivi dell'adulto, configurazione non segreta trasporto/mittente e procedura privata Luca. Invio email di prova, reset o nuovi accessi richiedono autorizzazione specifica; mock non dimostrano consegna o recupero.

Estensioni R7 escluse: sync privata, adattività offline e fonetica autonoma offline. Non sono condizioni per usare il percorso ospite finito già sviluppato e non vanno dichiarate presenti. Risposte parziali restano nel browser condiviso, senza isolamento fra utilizzatori: [OFFLINE_FOUNDATIONS.md](OFFLINE_FOUNDATIONS.md).

La pubblicazione è conclusa. La vecchia richiesta a SiteGround non è stata inviata e non è necessaria per dichiarare questo rilascio verificato; se un challenge ricompare occorre fermarsi e diagnosticare, senza autorizzazione implicita a contattare il supporto. Caffè Oro fuori dal task; vecchio tablet rinviato. Nessun invio a SiteGround, email, reset, nuova credenziale, lettura alunni reali o modifica alla sicurezza hosting.
