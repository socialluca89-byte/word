# Materiali foto/PDF — estrazione locale con revisione adulta

Lotto R4 sviluppato solo su **work**, dopo il checkpoint 49083dd. Nessun deploy o messaggio a SiteGround. Main resta 3473591 e l'ultimo live verificato resta b3ca230 (confronto del 26 ottobre, non una verifica live rinnovata da questo lotto).

## Cosa funziona

Nell'area adulta, **Materiali di scuola e missioni personali**, il file è inizialmente solo locale. Per JPEG/PNG/WebP viene mostrata una foto da trascrivere; per un PDF con testo selezionabile il pulsante **Leggi il testo del PDF** estrae il testo nel browser. L'inserimento manuale rimane disponibile anche senza file o senza browser compatibile.

Il testo estratto è una bozza modificabile: può perdere ordine, colonne, accenti e righe. Non inventa traduzioni, non valuta la scrittura del bambino e non trasforma automaticamente tutto in domande. L'adulto corregge il campo, usa `inglese = italiano` (oppure parole già note), spunta **Ho controllato il testo…**, apre la proposta, seleziona le parole ed esegue la conferma finale. Qualsiasi modifica al testo o al file invalida revisione/proposta. L'esistente parser di missioni resta il medesimo, con massimo 80 voci; nessun esercizio o premio è generato dalla sola estrazione.

Il salvataggio finale invia al **server WordyLand** soltanto il programma confermato. Il documento viene allegato solo se l'adulto seleziona **Salva anche il file come allegato privato…**, inizialmente spento. Il download privato e la rimozione già esistenti restano raggiungibili. Non viene attivato un servizio OCR, un provider o un account.

## Limiti tecnici e privacy

- File non vuoto e massimo 4.000.000 byte, con controllo della firma PDF/JPEG/PNG/WebP; SVG/HTML e file camuffati non sono mostrati come documenti attivi. Per le foto l'anteprima usa un object URL, senza iframe o documento HTML; URL revocato quando si toglie/sostituisce il file o cambia il profilo. Immagini oltre 24 milioni di pixel non restano nell'anteprima, ma il controllo delle dimensioni avviene dopo la decodifica del browser: non è un limite preventivo assoluto alla memoria.
- PDF: massimo dieci pagine, 12.000 caratteri estratti e 4.000 elementi di testo per pagina. Scadenza 20 secondi e annullamento esplicito terminano il worker; in caso d'errore il testo precedente resta. Questi limiti riducono il carico ma non garantiscono un tetto rigido alla memoria del parser per ogni PDF ostile.
- PDF.js in un **worker modulo dedicato**, senza fallback del parser sul thread grafico. Nessuna esecuzione di JavaScript incorporato o azioni dei documenti, nessuna XFA, eval, WASM, font esterni o URL del documento scaricato. Si passa una copia binaria locale, non un URL remoto. Libreria e worker sono serviti dal sito, caricati soltanto al comando di estrazione; nessun CDN runtime.
- Password, PDF danneggiato, documento privo di testo, browser senza worker o mancato caricamento dei moduli producono un messaggio e lasciano utilizzabile il testo manuale. Nessun indebolimento delle impostazioni del browser.
- Il modulo non scrive file/testo in localStorage, IndexedDB o CacheStorage. Il service worker mantiene dieci asset pubblici; lettore, libreria PDF, API, allegati e risultati personali non vengono aggiunti alla cache offline. Non è acquisizione materiali offline.
- Profilo/account e revisione vengono ricontrollati anche dopo FileReader; risposte tardive non popolano un nuovo profilo e non avviano un upload con il profilo nuovo. L'isolamento server, le autorizzazioni e il database delle schede non sono stati ampliati.

Il file originale resta anche sul dispositivo scelto dall'adulto. Non si promette cancellazione sicura della memoria del browser o protezione da altri utilizzatori della stessa sessione aperta. Non sono stati usati documenti o dati reali di alunni.

## Dipendenza ufficiale riproducibile

Distribuzione Mozilla **pdfjs-dist 6.4.299**, Apache-2.0, scaricata da npm ufficiale; archivio confrontato con la SHA512 SRI dei metadati prima della copia. Due file minificati originali e non modificati, complessivamente 1.723.246 byte. Metadati/SRI/SHA256 in [PDFJS_SOURCE.json](PDFJS_SOURCE.json), licenza in [PDFJS_LICENSE.txt](PDFJS_LICENSE.txt). Il controllo bundle verifica gli hash originali e le versioni dei collegamenti ai due moduli. La sintassi moderna deve essere supportata dal dispositivo; il vecchio tablet rimane da verificare come concordato.

Il bundle passa da 39 a **42 file**: study-import.js e i due moduli PDF. Le allowlist locale/remota e il controllo HTTPS dei file sono aggiornati per un futuro rilascio ordinario; non vengono allargati con wildcard né vengono eseguiti ora sul server. Il deploy finto verifica esclusivamente directory temporanee e dati sintetici. Nessuna modifica ad autenticazione SSH, segreti, preflight, anti-bot o impostazioni di hosting.

## Cosa manca: OCR delle foto e delle scansioni

**Non è OCR completo.** PDF immagine, scrittura a mano, testo nelle foto e riconoscimento dell'ordine logico della scheda non vengono letti automaticamente. Un PDF vuoto sintetico verifica il ripiego senza testo; non è prova di qualità su ogni scansione reale.

Piano tecnico finito, ancora non implementato:

1. Valutare Tesseract.js ufficiale, core WASM e modelli linguistici inglese/italiano con versioni, integrità, licenze e peso espliciti; tutto servito localmente, senza CDN né invii a terzi. L'API sperimentale TextDetector non è una dipendenza disponibile in tutti i browser e non costituisce un'alternativa affidabile.
2. Un solo foglio per volta: orientamento/ritaglio e riduzione immagini, limite preventivo dei pixel quando tecnicamente leggibile dall'header, worker terminabile, scadenza e stato di download/compatibilità onesto. Per le scansioni PDF servirebbe anche rendering locale controllato delle singole pagine, ora non presente.
3. Valutare precisione e memoria su fixture stampate originali/sintetiche con luce, rotazione, colonne e contrasto diversi, poi revisione didattica adulta su materiale fornito. La calligrafia infantile non è garantita da un motore per stampa: non ricostruire parole con sicurezza inventata.
4. Mantenere sempre correzione adulta, proposta selezionabile e conferma finale, senza sostituire il percorso manuale. Testare annullamento/riprova/cambio profilo, nessuna rete esterna e nessun salvataggio prima del consenso. Eventuali servizi esterni o costi richiederebbero autorizzazione distinta e non sono previsti qui.

Le librerie OCR aggiungerebbero modelli e memoria considerevoli oltre ai moduli PDF. Questo lotto consegna la parte finita verificabile e non presenta l'OCR o l'efficacia su fotografie reali come disponibili.

## Verifiche

La suite `materials` usa PDF originali sintetici con testo e azione JavaScript incorporata innocua, immagine minima, PDF senza testo/danneggiati e limiti superati. Verifica estrazione reale del testo, azione non eseguita, assenza di upload/richieste terze prima della conferma, nessun motore PDF al caricamento iniziale, object URL revocati, revisione obbligatoria e invalidazione, inserimento manuale, allegato opt-in, salvataggio/ownership server reali su SQLite temporaneo, doppio click, worker mancante, annullamento, timeout controllato e risposta tardiva su cambio profilo/FileReader. Quattro viewport: 320/390/768/1360. Il ramo password e il parser bloccato sono simulazioni dell'API, non prove su ogni formato PDF cifrato o su un blocco reale.

Chiusura locale: **61 controlli verify PASS**, inclusi sintassi dei moduli vendorizzati, API e deploy finto di 42 file; **27 suite browser distinte PASS**, con prestazioni misurate separatamente al termine. Dopo le ultime rifiniture su inserimento manuale e fallback per modulo mancante, ripetute materials/parent-summary/navigation con exit 0 e rieseguiti tutti i 61 verify. Registro dei comandi/limiti: [MATERIAL_IMPORT_VERIFICATION.json](MATERIAL_IMPORT_VERIFICATION.json). Nessun retry automatico, test rimosso o soglia alzata.

Prestazioni finali locali: DOM 1851.5 ms/load 1971.8 ms, soglia invariata 5000 ms, un contesto WebGL iniziale/due dopo la mappa. Il precedente campione del lotto 6ba13cf era 1796.3 ms: questi singoli campioni non sono un confronto controllato né una prova di maggiore velocità. La libreria PDF da 1.72 MB resta fuori dal caricamento iniziale e viene richiesta soltanto quando l'adulto avvia la lettura.

Durante lo sviluppo i test hanno richiesto correzioni delle fixture: la riga sintetica oltre 12.000 caratteri inizialmente era fuori dai margini del PDF; alcune attese cercavano visibilità dentro details chiusi; la cattura dell'anteprima del modulo doveva accettare esplicitamente la sostituzione del testo già presente. Sono stati corretti i casi di prova, senza indebolire limiti o aspettative. La rifinitura del codice ha inoltre evitato un nuovo limite al campo manuale (ora provato con 13.000 caratteri) e mantiene la revisione anche se manca il modulo locale.

[Anteprima sintetica locale del modulo](review/materials-390.png), non live. Nessuna nuova CI, invio email, controllo reale di account o pubblicazione. Su SiteGround restano da verificare MIME dei moduli .mjs e worker solo quando il blocco di pubblicazione sarà risolto, senza presumere modifiche alle impostazioni di sicurezza.
