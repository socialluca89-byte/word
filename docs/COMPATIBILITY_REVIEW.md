# Primo lotto roadmap: compatibilità e avvio

Sviluppato e verificato su work il 25 ottobre 2026; **non pubblicato**. Non risolve o aggira il controllo SiteGround. Diagnosi di rete separata in [HTTP_HTTPS_DIAGNOSIS](HTTP_HTTPS_DIAGNOSIS.md).

## Problema riprodotto e correzione

Prima: bloccando soltanto la creazione dei contesti WebGL su Chromium corrente, la mappa passa al fallback ma non offre alcun pulsante luogo: conteggio 0. Il resto del dispositivo simulato resta moderno; non è un'emulazione del tablet Hamlet.

Dopo: quando WebGL/Three.js o gli observer necessari alla scena non sono disponibili, la mappa offre otto pulsanti grandi per casa, animali, colori, kart, calcio, spazio, oceano e dinosauri. Ogni pulsante apre la relativa anteprima e conserva l'ingresso alla missione. Il ritorno alla mappa ricrea esattamente otto pulsanti, senza sovrapposizioni o duplicati. La chiusura rimuove i comandi temporanei. Le animazioni decorative non generano errori se manca IntersectionObserver o Web Animations.

Aggiunto un avviso nella pagina, controllato da un piccolo script scritto in sintassi ES5 indipendente dagli script principali: distingue API essenziali mancanti da script che non arrivano/risultano non interpretabili. L'avviso non cancella dati, non forza aggiornamenti/reload, non nasconde giochi e non allenta le protezioni. JavaScript disattivato ha istruzioni statiche. Se il server non consegna la pagina iniziale, il messaggio non può apparire: non è una correzione di ERR_EMPTY_RESPONSE.

Non è un transpiling dell'intera applicazione. Un browser incapace di interpretare il codice moderno riceve un'indicazione se la pagina e il guard sono eseguiti; non viene dichiarato compatibile. Ancora mancanti versione Android/browser e prova sul dispositivo originale. Conservati progressi/economia/permessi e tutte le destinazioni precedenti.

## Verifiche

- Nuova suite compatibility: avvio normale, nessun WebGL, nessun observer, Three.js mancante, script bloccato, HTML 202 al posto del JS e API essenziale mancante. Le prime quattro modalità non generano eccezioni non gestite; i tre guasti mostrano l'avviso. Tutti gli otto luoghi e il ritorno agli esercizi provati; tredici schede conservate.
- Baseline reale sul file precedente: zero pulsanti della mappa senza WebGL; dopo otto, con passaggio a missione e ritorno verificati.
- Nove regressioni browser PASS: navigation (320/390/768/1360px), performance, motion, wardrobe, pwa, training, resume, presence e community. Inclusa sfida chiusa/riaperta con domanda e punteggio conservati, secondo dispositivo, roster privato e annullamento doppio clic.
- Sintassi di tutti i JS pubblici, shell del runner, integrità bundle39, PWA/cache/hash, lezioni, feedback didattico e catalogo48 premi PASS. Versioni degli asset rigenerate.
- Primo rewards check non eseguibile con il PATH di sistema (PHP non trovato dal processo figlio, status null); rilanciato il solo controllo con il PHP dell'ambiente configurato: PASS. Non nascosto come successo della prima esecuzione.
- Prima nuova asserzione contava le schede mentre era aperta una missione: fallita (0 invece di13). Corretto il flusso del test con Pausa → Esercizi, senza modificare l'app per soddisfare il test. Poi suite completa PASS, senza retry automatici.
- Verifica visiva della [mappa leggera a390px](review/lightweight-map-390.png), contesto ospite sintetico. Il controllo screenshot ha rieseguito la suite compatibility completa; tutte le modalità PASS.

Questi controlli sono locali: nessuna CI remota o nuova verifica di produzione, nessun dato alunni, account vero, email, hosting, credenziale o acquisto reale.

## Dipendenze del punto1

Serve verifica SiteGround sul corretto sito, senza disattivare protezioni, e versione Android/browser più prova sul tablet. Il redirect HTTP→HTTPS è una configurazione hosting da verificare dopo il corretto funzionamento HTTPS, non una riscrittura del gioco da applicare alla cieca. Nessun merge o deploy finché non è chiarito il blocco hosting registrato.
