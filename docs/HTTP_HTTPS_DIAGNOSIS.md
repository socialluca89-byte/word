# HTTP / HTTPS — diagnosi in sola lettura, 25 ottobre 2026

Richiesta: verificare e correggere il caricamento su entrambi i protocolli. Evidenza del tablet riportata dal coordinatore: URL `http://wordyland.eu/`, `net::ERR_EMPTY_RESPONSE`, browser Android apparentemente datato; versione e rete sconosciute. Il dispositivo originale non è disponibile in questo ambiente.

Nessuna configurazione hosting, protezione, cache, credenziale, account o release è stata modificata. Nessun CAPTCHA seguito o risolto. Nessun nuovo deploy o ticket. Il modulo Allenamento rimane separato su work, non live.

## Riscontri osservati

Tutte le richieste usano la rete/proxy configurati, con verifica TLS attiva. Non rappresentano necessariamente il percorso di rete del tablet; il certificato visto da questo ambiente non certifica la compatibilità del suo sistema Android.

| UTC | Controllo | Esito |
| --- | --- | --- |
| 13:19:52 | curl GET `http://wordyland.eu/` senza seguire redirect | 200, HTML WordyLand, 23.201 byte, nessun Location osservato |
| 13:19:52 | curl GET `https://wordyland.eu/` | 202, text/html, 168 byte, meta-refresh verso `/.well-known/sgcaptcha/`; non seguito |
| 13:22:11 | Chromium 154, contesto ospite vuoto, HTTP, nessun clic | home 200; numerosi script e un CSS ricevono 202, altri 200; errori `Unexpected token '<'`, `lessonTopics is not defined`, dipendenze mancanti |
| 13:22:11 | Chromium 154, contesto separato, HTTPS | home 202; navigazione successiva verso sgcaptcha interrotta esplicitamente, nessuna interazione |
| 13:22:39 | curl GET `http://wordyland.eu/data.js?v=3fb2e2d33b1c` | 200 application/javascript, 18.085 byte; nel browser lo stesso percorso/versione aveva ricevuto 202 |

Script con risposta 202 nel caricamento HTTP Chromium: `worlds.js`, `learning.js`, `data.js`, `accounts.js`, `classroom.js`, `island.js`, `pwa.js`, `community.js`, `three.min.js`; anche `quests.css` risponde 202. Il carattere `<` non valido nel parsing JavaScript è coerente con HTML al posto dello script, ma il corpo di ciascuna risposta browser non è stato conservato. La pagina HTTPS contiene invece un riferimento sgcaptcha direttamente verificato. Non assumere che ogni risposta 202 abbia lo stesso corpo o che il blocco riguardi tutti i visitatori.

Il font remoto Google è bloccato dalla rete dell'ambiente (`ERR_TUNNEL_CONNECTION_FAILED`); è facoltativo e questa evidenza non prova un problema sul tablet. HTTP risulta contesto non sicuro: service worker e installazione/offline non sono disponibili. Le risorse del documento sono relative, non è emersa una risorsa HTTP incorporata in una pagina HTTPS. Nessuna regola .htaccess è gestita dal bundle pubblico versionato.

Un primo strumento di osservazione browser si è interrotto durante una navigazione con `Execution context was destroyed`; è stato corretto il solo raccoglitore temporaneo per conservare i risultati anche in quel caso. Non è stato considerato un fallimento del gioco. Il secondo controllo ha restituito gli esiti sopra, senza simulare il browser Android originale o alterare user-agent/IP.

## Conclusione e correzione minima

È riproducibile un caricamento incompleto nel browser corrente dal nostro ambiente e una risposta di verifica sulla home HTTPS. Non è riprodotto `ERR_EMPTY_RESPONSE` del tablet: compatibilità del browser, rete e comportamento della protezione su quel dispositivo rimangono da distinguere. Un errore di sintassi del gioco non può da solo spiegare l'assenza della risposta iniziale del server. Non c'è un difetto del codice applicativo dimostrato da correggere con un rilascio.

L'intervento minimo ora è una verifica dei log/regole SiteGround per `wordyland.eu`, alla finestra UTC indicata, distinguendo home HTTPS e richieste delle risorse versionate: quale regola restituisce 202, se sia previsto e se interessi i browser legittimi. Chiedere al provider una correzione della classificazione/configurazione che mantenga TLS e protezioni attive; non prescrivere disattivazione WAF, whitelist indiscriminata, eccezioni per runner, rotazione IP o aggiramento del CAPTCHA. Nessun contatto è stato inviato da questo task; il coordinatore gestisce l'accesso all'account hosting corretto.

Separatamente, verificare in Site Tools di **wordyland.eu** il certificato e lo stato dell'opzione HTTPS Enforce (Sicurezza → Forzatura HTTPS / HTTPS Enforce, secondo la lingua dell'interfaccia). Il nostro HTTP non mostra un redirect. Dopo avere verificato HTTPS sul percorso del visitatore, proporre l'attivazione del redirect HTTP→HTTPS se assente. Non applicare una regola .htaccess alla cieca o forzare un redirect verso una destinazione ancora problematica. Qualunque modifica hosting/protezione richiede il percorso di autorizzazione concordato con il coordinatore; non è inclusa in questo lotto documentale.

Dopo la correzione hosting, verificare con accessi ordinari: HTTP reindirizza a HTTPS, home e script/CSS ricevono le risposte/contenuti attesi, nessun errore JavaScript di dipendenza, pagina su dispositivo originale e su browser aggiornato. Un controllo pubblico riuscito non sblocca automaticamente il deploy CI, che mantiene i propri controlli e il blocco precedente.

Prova non invasiva sul tablet: aprire direttamente HTTPS con browser aggiornato; confrontare stesso Wi-Fi su altro dispositivo e rete mobile sullo stesso dispositivo. Non ignorare avvisi di certificato, non cancellare dati/progressi locali come tentativo e non modificare l'hosting per tentativi.
