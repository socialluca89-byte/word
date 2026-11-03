# Grafica e gioco: verifica del lotto

Base: rilascio1537a74, run41637701431. Questo documento descrive il candidato alla redazione, non anticipa il risultato della pubblicazione. La pipeline deve verificare il commit finale prima di distribuire i file.

## Skill e risultato

Applicate frontend-design di Anthropic e web-design-guidelines di Vercel, già presenti nel progetto. Installata webapp-testing dalla fonte ufficiale Anthropic, con licenza, commit fissato e hash originali/installati. Nessun installer, servizio o dipendenza dell'applicazione aggiunto. La sola normalizzazione locale della guida rimuove uno spazio finale e viene dichiarata in UPSTREAM.json.

Il layout dell'allenamento raccoglie immagine, parola e azione in uno spazio illustrato coerente. Nel modello, l'azione principale precede gli strumenti audio; nelle domande, l'audio resta prima delle risposte. Pausa, lettura, ascolto, stop e aiuto rimangono disponibili. Il richiamo d'ascolto non rivela la grafia prima dell'aiuto confermato.

| Viewport | Azione prima, alto–basso | Azione dopo, alto–basso | Immagine / parola dopo |
| --- | --- | --- | --- |
| 320×844 | 916–999px | 604–687px | 174px / 34px |
| 390×844 | 916–972px | 575–631px | 174px / 34px |
| 1360×900 | 667–726px | 593–649px | 180px / 46px |

La categoria attiva del guardaroba è visibile già all'apertura; tutte le dodici categorie rimangono raggiungibili senza spostare focus o scroll verticale. La home conserva l'isola e tutti i sette ingressi nella prima schermata mobile.

Ogni mondo giocabile mostra obiettivo e tre scoperte derivati dallo stesso controller della partita. Reset, replay e cambio renderer non inventano avanzamenti. Nell'oceano restano i tre set esistenti. Le informazioni duplicate vengono eliminate dalla sola presentazione; controlli e feedback restano disponibili. Il nuovo pannello non aggiunge regioni live.

Nel kart il ritratto realmente equipaggiato, corona e distintivo compongono il pilota in primo piano. Il trascinamento orizzontale sceglie la corsia; Guida conferma. Rimangono pulsanti e tastiera. Scorrimento verticale, annullamento, uscita prima della cattura, cambio renderer e pausa non lasciano gesti pendenti; la conferma intermedia conserva il focus.

## Verifiche e confini

Le nuove suite `visual-journey` e `kart-pilot` usano solo fixture locali sintetiche e sono passate sul candidato. Restano obbligatorie tutte le59suite precedenti: matrice totale61, gruppi31+30, stessi timeout e asserzioni. I47controlli verify e i54file applicativi/47statici rimangono, senza aggiungere skill o documenti al pacchetto pubblico.

La revisione indipendente di training/guardaroba non rileva nuovi blocchi. Sedici funzioni di memoria, aiuti e API dell'allenamento restano identiche alla base. Le prove mirate foundations e training-memory passano con i nuovi raggruppamenti DOM, inclusi cambio profilo, errori di salvataggio, pausa e ripresa. La review del kart ha individuato due difetti di gesture/focus, poi corretti e coperti dalla nuova suite. Le attese finite della harness non sostituiscono le asserzioni di completamento.

Collaudo locale concluso sul pacchetto congelato: tutti i47verify, inclusi isolamento API e deploy simulato;15suite browser pertinenti PASS (`visual-journey`, `wardrobe-layout`, `learning-experience`, `training`, `foundations`, `training-memory`, `kart-pilot`, `performance`, `engine-lazy`, `world-driving`, `illustrated-actions`, `appearance-consistency`, `classic-illustrated`, `world-play`, `motion`). La performance è stata eseguita una sola volta, isolata dalle altre prove: load556ms locale, limite5s invariato; nessun WebGL prima della richiesta della scena. Versionamento idempotente e tutti i54hash del pacchetto invariati durante le prove finali. Questo pass mirato locale non viene presentato come l'intera matrice61: quella resta obbligatoria in CI prima del deploy.

L'audio usa le capacità già presenti: le voci sintetiche dei test non attestano la qualità delle voci sul dispositivo. Nessuna prova su tablet originale o screen reader reale, nessun nuovo asset generato e nessuna promessa di fotorealismo o grafica3D aggiuntiva. Nessuna modifica a backend, account, permessi, punti o premi. Il Grinch e le verifiche reali di account/email/hosting restano separati.

Pubblicazione solo tramite workflow ordinario autorizzato: verify,61browser, preflight intatto, deploy e controlli live sul commit esatto. Nessuna nuova sonda per superare il precedente403 cloud, identità alternativa o modifica delle protezioni.

## Verifica del ritorno al guardaroba

Il primo run41653643780 su774f44d ha passato verify ma si è fermato in illustrated:37:291; deploy saltato. Il timeout originale è stato riprodotto localmente. La diagnostica conferma che la preferenza3D viene conservata e il catalogo rimane utilizzabile; dopo reload il browser può restaurare una posizione oltre l'anteprima. Un ulteriore giro strumentato è passato senza interventi, quindi non si attribuisce al prodotto una causa deterministica non dimostrata.

Corretto solo il percorso del test: attesa dell'account, verifica della preferenza e del selettore3D, scorrimento reale alla preview, rendering3D e canvas richiesti, successivo cambio illustrato conservato. Nessun force-render, retry o timeout aumentato, nessuna asserzione rimossa. Suite illustrated completa PASS e review indipendente conforme. Tutti i54file dell'applicazione restano identici a774f44d, già sottoposti a47verify locali e CI. Le suite locali pertinenti passate sono ora16; il nuovo run completo61 e il deploy devono ancora essere confermati.

## Home e font di sistema

Il secondo run41655888288 su5ae3b7e ha passato verify e tutte le31suite del gruppo mondi. Il secondo gruppo si è fermato nell'asserzione iniziale della home320 in visual-journey; deploy saltato. La diagnostica locale riproduce un problema reale con DejaVu Sans già installato: gli ultimi ingressi finiscono a905,063px, fuori dal viewport844. Con il font locale abituale rimanevano appena2,125px. Non si attribuisce alla CI un font non osservato: il difetto è dimostrato nel fallback supportato, senza cambiare le soglie del test.

Correzione: titolo «Cosa facciamo?», spazi mobili più compatti e label «Lettere e parole» sulla stessa destinazione #allenamento. Accedi rimane una parola intera e il recupero va a capo tra parole. Nessun font del prodotto sostituito; immagini, sette ingressi e accessi adulti preservati. Dopo: margine23,125px con DejaVu e28,125px con Liberation/font abituale, isola140px e target degli ingressi almeno55px. La suite visual-journey completa passa sia nel profilo abituale sia nel DejaVu che riproduceva l'errore; child-experience originale passa. La review statica non rileva blocchi.

Il browser locale è154; il download della distribuzione ufficiale151 è terminato con Forbidden e non è stato riprovato tramite altri percorsi. Le fixture Fontconfig usano soltanto font già installati, verificati via CDP. Le prove locali non vengono presentate come esecuzioni del browser CI: il candidato finale deve superare di nuovo l'intera pipeline61 prima della pubblicazione.

Il pacchetto finale della home è stato versionato due volte con risultato idempotente e congelato a54file. Tutti i47verify sono passati nuovamente, incluso il deploy simulato. Sul candidato finale passano visual-journey (font abituale e DejaVu), child-experience, learning-entry, interaction-focus, pwa e performance. Quest'ultima è una sola esecuzione isolata: load392ms locale, limite5s invariato, nessun WebGL anticipato. I54hash rimangono invariati durante le verifiche. Le misure556ms e i precedenti pass locali descrivono il congelamento precedente; il risultato completo61/deploy del nuovo commit rimane obbligatorio.
