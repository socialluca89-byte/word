# PDF scansionati — pagina selezionata, rendering e OCR locali

Incremento successivo al checkpoint `ce7a93d`, solo **work**. Nessuna nuova dipendenza: PDF.js e Tesseract/modelli sono gli stessi file ufficiali già verificati. Nessun deploy, invio SiteGround, nuova credenziale, comunicazione o modifica alla sicurezza hosting. Main3473591 e ultimo live verificatob3ca230 restano distinti dal codice sviluppato; nessuna nuova verifica live in questo lotto.

## Percorso consegnato

Quando si sceglie un PDF compaiono tre controlli distinti: lettura del testo selezionabile, numero della pagina scansionata e **Leggi la pagina scansionata · OCR locale**. Il numero deve essere intero, da1a10, e presente nel documento. La selezione del file non carica né PDF.js né il motore OCR.

Il nuovo comando renderizza **soltanto la pagina indicata**, poi applica l'OCR inglese/italiano alla sua immagine locale. Il risultato dichiara pagina e totale; le altre pagine non sono incluse. Non viene avviato un batch nascosto. Per una pagina diversa si può ripetere la lettura: il testo esistente viene sostituito soltanto dopo il dialogo di conferma e un risultato utile. È possibile preparare una scheda distinta per pagina; non c'è unione automatica delle bozze.

La bozza è fallibile: correzione adulta, formato inglese=italiano, casella di revisione, proposta selezionabile e conferma finale restano obbligatori. Cambiare pagina, file o testo invalida la revisione/proposta. Nessun invio automatico di file o parole durante il rendering/OCR; l'allegato privato rimane opt-in. Se scelto, viene salvato il file PDF originale completo, non soltanto la pagina rasterizzata. Si conservano PDF testuali, OCR delle foto, manuale, programmi precedenti, account, premi e tutte le altre funzioni.

## Limiti e risorse

- PDF massimo4.000.000byte e10pagine; la lettura testuale conserva il suo limite precedente. Un documento più lungo viene rifiutato anche se si seleziona una pagina iniziale. Nessuna modifica ai limiti degli allegati privati già esistenti.
- Pagina con larghezza/altezza finite, positive e non oltre20.000punti. Rendering proporzionale a scala massima2, lato massimo2000 e massimo2milioni di pixel. Il canvas viene passato esplicitamente al renderer, con fondo bianco.
- PDF.js configurato senza eval, XFA, font esterni, WASM supplementare o fetch del documento per URL; annotazioni disabilitate durante il rendering. Le immagini incorporate oltre8milioni di pixel sono escluse con `maxImageSize`; `canvasMaxAreaInBytes` limita le aree di lavoro. Formati immagine/PDF non supportati possono fallire o dare una pagina senza testo utile: non vengono sostituiti da servizi esterni.
- Una volta ottenuto il bitmap PNG locale (JPEG a qualità0.9 se il PNG supera4MB), il canvas viene azzerato, il proxy/documento PDF distrutto e il worker PDF terminato **prima** di avviare il worker OCR. La suite conferma massimo un worker PDF/OCR attivo alla volta. Nessun blob derivato viene allegato automaticamente.
- Scadenza nuova e specifica di **60secondi** per parsing+rendering+OCR; precedenti limiti PDFtestuale20s, fotoOCR45s e richieste community5s invariati. Annulla chiama cancel sul render task, azzera il canvas, termina worker e abortisce i fetch dei modelli. Cambio profilo/editor invalida le risposte tardive. Decodifica o codifica native già avviate possono terminare asincronamente; il risultato tardivo viene scartato.
- Massimo12.000caratteri OCR come nel motore esistente; il campo manuale non viene troncato. Su errore, password, pagina mancante, risultato vuoto/poco chiaro, annullamento o scadenza resta il testo precedente, con revisione da rifare.

Questi controlli non garantiscono un tetto rigido alla RAM del processo né recupero istantaneo della memoria del browser. Un PDF complesso può richiedere più memoria del solo canvas; restano necessari collaudi sui dispositivi reali. Il vecchio tablet/Chrome rimane rinviato dall'utente.

## Privacy e compatibilità cumulativa

File, pixel e testo OCR transitano solo fra componenti locali del browser. Richieste di rete osservate: GET dei moduli/componenti statici dello stesso sito, senza documento, nome del file o testo nei corpi/URL. La suite senza account non chiama API. Il modulo adulto invia un programma soltanto dopo conferma e senza allegato se non selezionato.

Nessun risultato salvato in localStorage/IndexedDB/CacheStorage. Cache service worker sempre10asset pubblici, bundle sempre47file; nessun asset o servizio nuovo, nessuna promessa di acquisizione OCR offline. Le API, i database e le autorizzazioni account/classi non cambiano in questo incremento. Report dei soli profili posseduti, storici/aiuti/premi e separazione dell'ospite restano soggetti alle regressioni cumulative.

La gestione asincrona usa epoch, proprietà del profilo e identità dei task: una vecchia chiusura non azzera i riferimenti al worker/render di un'operazione nuova. Il modulo resta opzionale per il percorso manuale durante un aggiornamento parziale. Le modifiche cumulative rispetto al live sono descritte in REQUIREMENTS_REMAINING.md, distinguendo sviluppo da pubblicazione.

## Prove previste e risultati

La fixture originale è un PDF di due pagine, composto **solo da JPEG incorporati**, senza parole selezionabili. Pagina1contiene dog=cane, pagina2eye=occhio/ear=orecchio. Il test prima conferma che la lettura testuale non trova parole, poi rende e riconosce la pagina2 con PDF.js/Tesseract reali; verifica che dog non venga importato. L'azione JavaScript incorporata innocua non viene eseguita.

Altri casi: pagina fuori intervallo, oltre10pagine, geometria enorme, immagine incorporata oltre il limite, PDF danneggiato, pagina bianca, nessun upload/storage, worker sequenziali, revisione obbligatoria, salvataggio reale su account/SQLite temporanei senza allegato e quattro viewport. Cancel, scadenza e cambio editor sono provati anche con renderer controllato che espone il suo canvas: cancel viene chiamato e il canvas si azzera. La scadenza è invocata dal test, non attesa per60secondi; questo non è un benchmark di un blocco reale. Nessun documento o account reale impiegato.

Prima prova locale del percorso reale: circa1.96secondi per PDF originale sintetico di32.682byte. È una misura individuale, non garanzia di prestazioni o accuratezza su fotografie, calligrafia, caratteri piccoli, inclinazioni, ombre o documenti reali.

Il test community isolato è passato:49richieste, registrazioni riuscite0.386/0.348s, richiesta più lenta recover0.624s. Nel successivo job verify cumulativo di64controlli è passato nuovamente:49richieste, registrazioni0.310/0.298s, massimo login0.328s. In entrambe le esecuzioni le richieste riportano delta di throttling CPU0. Sono due contesti di prova distinti, non un retry automatico.

Il timeout precedente di5s durante register (lotto ce7a93d, verifica allora concorrente con browser) resta conservato e non è stato riprodotto oggi. Mancano misure/server trace di quel singolo evento per attribuirlo con certezza a CPU, PHP o filesystem: nessun bug dell'API è dichiarato corretto. La diagnostica aggiunta misura l'intera richiesta e stampa solo azione senza parametri, metodo, status/durata e deltaCPU; mai corpo, account, password, token o URL. Timeout5s invariato, nessun retry dei test falliti e nessun cambiamento al codice PHP. Dopo la correzione UI descritta nel rapporto cumulativo, l'intera sequenza finale è passata senza retry: **64verify e29suitebrowser PASS** sul codice definitivo. Il community finale cumulativo ha register0.377/0.378s, massimo class-register0.397s e deltaCPU0, distinto sia dalla prova isolata sia dal primo cumulativo. Registro completo: [PDF_SCAN_VERIFICATION.json](PDF_SCAN_VERIFICATION.json).

Ultimo campione finale: raster+OCR1437ms sul PDF sintetico32.682byte; home DOM2202.7/load2336.5ms, budget5000ms invariato. Il precedente campione della stessa implementazione era circa1965ms per PDF e1786.7ms per home: singoli campioni non dimostrano incremento di velocità o latenza garantita. La suite PDF protegge inoltre la proprietà un solo worker attivo alla volta.

Regressione UI realmente riprodotta durante la revisione: selettore pagina visibile senza PDF per il display del CSS delle etichette. Correzione limitata al modulo materiali e nuove prove negative; l'intera sequenza64+29è stata eseguita di nuovo dopo questa modifica. Fallimento e limiti conservati nel [rapporto cumulativo](CUMULATIVE_REVIEW_2026_10_27.md). Nessuna nuovaCI o pubblicazione dimostrata.

[Anteprima sintetica locale](review/pdf-scan-390.png), non live. Restano esclusi elaborazione batch/unione pagine, ritaglio/rotazione assistiti e garanzie sulla calligrafia. Sono estensioni o verifiche future, non capacità dichiarate dal lotto.
