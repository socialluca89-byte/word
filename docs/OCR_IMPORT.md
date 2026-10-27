# OCR locale di una singola immagine — lotto finito R4

> Documento storico del lotto ce7a93d. Il successivo [PDF_SCANNED_IMPORT.md](PDF_SCANNED_IMPORT.md) aggiunge OCR della singola pagina PDF selezionata; i limiti PDF scansionati descritti sotto erano quelli del primo lotto immagini. Il motore e i limiti per le foto restano gli stessi.

Sviluppo successivo a `5a29d52`, esclusivamente su **work**. Nessun deploy, contatto SiteGround o invio di documenti a terzi. Main resta 3473591; ultimo live verificato b3ca230, non ricontrollato da questo incremento.

## Consegna

L'adulto può scegliere una JPEG, PNG o WebP di **testo stampato**, premere **Leggi il testo della foto · OCR locale** e ottenere una bozza modificabile. Il controllo delle dimensioni e il piccolo modulo di preparazione possono essere caricati alla selezione; motore, worker e modelli pesanti partono soltanto al comando OCR. Il risultato non crea esercizi: occorre correggere parole/ordine/traduzioni, spuntare la revisione, aprire la proposta selezionabile e confermare il programma. Nessuna traduzione viene inventata dal motore.

Rimangono l'inserimento manuale, i PDF con testo selezionabile, allegati privati facoltativi, download e rimozione esistenti. **Non è obbligatorio allegare il file:** la relativa casella rimane spenta; solo il programma confermato viene inviato al server WordyLand, a meno che l'adulto scelga esplicitamente anche l'allegato. Non vengono attribuiti premi o progressi dall'estrazione.

Un'immagine bianca o un risultato vuoto/con confidenza interna molto bassa non sostituisce il testo precedente. Anche una confidenza alta può contenere errori: non è una misura del bambino né una prova di accuratezza e non è mostrata come voto. La bozza è sempre dichiarata fallibile e richiede revisione.

## Componenti originali e caricamento differito

| Componente | Versione / file | Byte pubblici |
| --- | --- | ---: |
| Worker Tesseract.js | 6.0.1, ocr-worker.min.js | 111.162 |
| Core LSTM senza SIMD obbligatorio, WASM incorporato | tesseract.js-core 6.1.2, ocr-core-775a35df6f2a.js | 3.954.181 |
| Modello inglese best_int | @tesseract.js-data/eng 1.0.0 | 2.952.873 |
| Modello italiano best_int | @tesseract.js-data/ita 1.0.0 | 1.660.998 |
| **Totale componenti ufficiali** | Escluso piccolo adattatore applicativo | **8.679.214** |

File prelevati dagli archivi npm ufficiali con SRI SHA512 verificata prima della copia, conservati senza modifiche. SHA256, versioni, licenze e dimensioni in [OCR_SOURCE.json](OCR_SOURCE.json). Sono incluse le licenze Apache-2.0 dei componenti e dei modelli, oltre alle notice e alle licenze MIT/BSD delle dipendenze del worker; i metadati MIT dei pacchetti di distribuzione delle lingue sono distinti dalla licenza upstream dei dati. Il controllo bundle verifica byte e licenze; una copia completa dei termini e delle notice è distribuita anche nei commenti del piccolo modulo applicativo pubblico, senza modificare i file ufficiali. Non sono stati eseguiti script npm di installazione.

Il core include il WASM in un unico file: non occorre scaricare una seconda copia `.wasm`. Il peso indicato è la somma dei file, non una promessa sui byte trasferiti con compressione/cache HTTP. Tutto proviene dallo stesso sito, senza CDN runtime, telemetria o servizio OCR. Nessuna nuova credenziale o spesa.

L'adattatore applicativo usa il protocollo del worker **pinnato a Tesseract.js 6.0.1**, verificato con il suo sorgente originale. Invia soltanto load/loadLanguage/initialize/setParameters/recognize, usando i modelli binari già scaricati localmente, OEM LSTM e segmentazione di un blocco stampato. Non usa l'SDK principale che nasconde il worker durante l'inizializzazione: il browser possiede subito il worker e può terminarlo anche durante il caricamento. Un aggiornamento di versione richiede ricollaudo del protocollo, non una sostituzione automatica.

Il bundle passa da 42 a **47 file**, con allowlist esplicite e checksum aggiornati per un futuro deploy ordinario; nessun ampliamento tramite wildcard e nessuna modifica a segreti, preflight o protezioni hosting. La cache del service worker resta di dieci asset pubblici: OCR e materiali non sono aggiunti. Questa funzione non promette installazione o uso offline; eventuale cache HTTP del browser riguarda componenti pubblici, non il documento.

## Risorse e interruzioni

- Massimo 4.000.000 byte per immagine. Header JPEG/PNG/WebP verificato prima della decodifica, massimo 8 milioni di pixel e lato 6000; se l'header non è riconoscibile non si indovinano le dimensioni. Immagini troppo grandi possono ancora essere trascritte manualmente e, se valide entro il limite esistente di upload, allegate esplicitamente; non vengono decodificate per OCR/anteprima.
- Orientamento EXIF gestito dal decoder del browser; riduzione proporzionale prima del riconoscimento a massimo 2 milioni di pixel e lato 2000, con fondo bianco. Non c'è correzione automatica di inclinazioni, ritaglio intelligente o ricostruzione delle colonne.
- Un solo worker per attività. Bitmap chiusa dopo il disegno, canvas azzerato dopo la codifica, buffer trasferiti al worker e worker terminato a fine risultato o errore. Nessun risultato o modello viene scritto in IndexedDB dall'adattatore (`cacheMethod: none`).
- Annullamento, nuova selezione, modifica del testo o cambio profilo invalidano la richiesta: fetch dei modelli abortite, worker terminato, risposte tardive ignorate. La decodifica nativa di un'immagine già avviata può terminare asincronamente; il bitmap tardivo viene poi chiuso e non aggiorna il profilo nuovo.
- Scadenza complessiva di **45 secondi**, inclusi caricamento e preparazione. Nessun retry automatico e nessun obbligo di attendere: resta il pulsante Annulla. Il testo precedente non viene modificato su errore, annullamento o scadenza. Output massimo 12.000 caratteri; il campo manuale conserva il precedente comportamento senza questo limite.
- I limiti riducono il carico, **non sono un tetto assoluto alla memoria del processo**. Il core WASM ha un proprio heap e il browser decide il recupero effettivo della memoria; non si afferma che terminate garantisca immediato calo della RAM osservata. Vecchio tablet e dispositivi con poca memoria restano da verificare, con alternativa manuale disponibile.

## Privacy e prove

Il documento e i pixel sono passati soltanto fra componenti del browser via memoria locale. Durante il riconoscimento le richieste di rete sono GET di componenti statici noti; immagine, nome del documento e testo OCR non sono inseriti nel corpo o nell'URL di richieste. I modelli sono scaricati con credenziali omesse. Il worker non esegue chiamate alle API del profilo. Il testo non viene salvato in localStorage/IndexedDB/CacheStorage. Il salvataggio al server del programma e dell'eventuale allegato richiede la conferma adulta già descritta.

La suite `ocr` usa testo originale disegnato su canvas: `eye = occhio`, `ear = orecchio`, esportato come JPEG. Il motore WASM reale riconosce le due righe. Una PNG bianca verifica il risultato vuoto; JPEG/WebP hanno anche controlli degli header. La suite verifica rete same-origin GET soltanto e assenza di scritture locali, motore non caricato alla selezione, errore reale di modello mancante, annullamento durante inizializzazione tenuta in attesa, chiamata controllata della scadenza, terminazione dei worker e nessun testo tardivo sul nuovo editor. La scadenza è richiamata dal test, non attesa per 45 secondi: non è un benchmark di un blocco reale.

Nel modulo adulto completo, con account/profilo esclusivamente sintetici, vengono verificati bozza, revisione obbligatoria, proposta di due parole e salvataggio senza allegato. La suite `materials` conserva i controlli PDF testuali, manuale, privacy e isolamento precedenti. Nessun documento di bambini, voce, email reale o account reale usato.

**Esito finale locale: 64 controlli verify e 28 suite browser distinte PASS.** Dopo aver incluso le licenze nei commenti del modulo pubblico, ricontrollati sintassi, bundle/PWA, deploy finto dei 47 file e vero OCR. Registro dei comandi ed esiti in [OCR_VERIFICATION.json](OCR_VERIFICATION.json). Nessun nuovo run CI o rilascio viene dimostrato da queste prove.

Ultimo JPEG sintetico: 20.767 byte, due righe stampate riconosciute in 1733 ms nel browser locale. Componenti ufficiali 8.679.214 byte. Ultima prova pagina isolata: DOM1425.2/load1496.8 ms, soglia5000 ms invariata; un contesto WebGL iniziale/due dopo la mappa. Il campione precedente del lotto PDF era1971.8 ms: non è un confronto controllato né prova che OCR migliori la velocità della home. L'assenza di carico iniziale del motore è verificata separatamente dalle richieste di rete.

**Fallimento conservato:** nella prima verifica eseguita insieme ai browser, test-community ha superato i5secondi durante la registrazione sintetica. Codice API/community/permessi invariato. Aggiunta sola diagnostica sanitizzata nel test (azione senza parametri, metodo, durata e contatore CPU, mai corpo/username/token), poi intera verifica64controlli eseguita una volta senza browser concorrenti: PASS, timeout5s invariato. La causa precisa del primo evento non è dimostrata; non si dichiara corretto un bug di registrazione. Log iniziale conservato in `/tmp/wordyland-ocr-verify-initial-failure-20261027.log`; nessun retry automatico introdotto. [Anteprima sintetica locale](review/ocr-390.png), non live.

## Limiti ancora aperti

La riuscita sulle due righe sintetiche grandi e nitide **non garantisce accuratezza sulle foto reali**, calligrafia, pagine ruotate, ombre, caratteri piccoli o tabelle. Non si correggono automaticamente errori del bambino e non si sostituisce il controllo umano.

**PDF scansionati non rasterizzati automaticamente:** il percorso PDF testuale resta invariato e, se manca testo, propone di esportare una singola pagina come immagine o trascrivere. Rendering controllato di pagine PDF per OCR, ritaglio/rotazione assistiti e qualità su materiali reali sono estensioni ancora da implementare o validare. Nessun servizio esterno è necessario al lotto consegnato; non è stato attivato nulla a pagamento o trasmesso a terzi.
