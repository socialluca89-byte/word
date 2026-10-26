# Bozza tecnica per SiteGround — WordyLand

**Bozza non inviata.** Nessun ticket aperto o riutilizzato; nessun collegamento con Caffè Oro.

Oggetto: challenge anti-bot sul controllo pubblico GitHub Actions di wordyland.eu

Buongiorno, il26ottobre2026 tra21:34:35 e21:34:36UTC un controllo autorizzato GitHub Actions ha ricevuto una risposta contenente `sgcaptcha` invece del JSON di salute di WordyLand.

- Richiesta: GET `https://wordyland.eu/api.php?action=health&verify-40404823239-<timestamp>`; il parametro finale è un identificatore anticache, non una credenziale. Il timestamp esatto non è disponibile nelle annotazioni pubbliche.
- Run pubblico: https://github.com/socialluca89-byte/word/actions/runs/40404823239 ; job deploy121862065796.
- Commit testato: `347359139b53904c13fad399e871d462062561ce`; verify e23suitebrowser superati.
- Il preflight ha segnalato: “SiteGround anti-bot verification intercepted the health endpoint (HTML instead of JSON)”. È terminato prima di SSH, caricamento chiavi nell'agent, backup, upload, installazione, modifica marcatore, cache purge o rollback. Non stiamo effettuando altri tentativi di pubblicazione.
- Il codice HTTP esatto del runner e gli header non sono registrati nelle annotazioni disponibili. `curl -fsS` è riuscito a ricevere il corpo; è la verifica applicativa ad aver riconosciuto il challenge. Non attribuiamo arbitrariamente un403/429/200.
- Alle21:35:51UTC una verifica ordinaria indipendente ha ottenuto HTTP200 per8URL, health `ready=true/database=sqlite` e contenuti della precedente versione funzionante `b3ca230ff76ee708bde4d2d760e174e012bfb046`. Questo non prova che il runner sia stato sbloccato.

Potete verificare nei log la risposta HTTP effettiva, la regola/evento che ha generato il challenge e se la restrizione è temporanea o persistente? Serve una soluzione circoscritta e supportata per questo controllo automatico autorizzato, mantenendo TLS e le protezioni del sito. Non chiediamo di disabilitare globalmente WAF/anti-bot o di escludere indiscriminatamente API, utenti o reti. Indicate quale intervento specifico deve eventualmente eseguire il titolare dell'hosting WordyLand e come verificarne la risoluzione prima di un nuovo deploy.

## Distinzione fra prova e ipotesi

Provato dalle annotazioni e dal codice: lo script ha rilevato la sottostringa `sgcaptcha` nel corpo HTTP e l'ha classificata come challenge HTML. Il corpo integrale non è esposto nelle annotazioni, quindi non ne abbiamo ispezionato direttamente il contenuto; il job si ferma nella fase `public-health-preflight`; le fasi remote successive non sono state eseguite. Fonte: annotazioni pubbliche e ordine del codice del commit testato. Non è un semplice timeout, errore di sintassi PHP o assertion dei giochi.

Non determinabile dai dati disponibili: codice HTTP numerico del runner, IP coinvolto, regola precisa, durata della restrizione. Questi dettagli richiedono i log SiteGround; non sono una ragione per ruotare IP, cambiare runner, eseguire CAPTCHA o ritentare. La pagina di challenge è un'applicazione esplicita del filtro; non dimostra da sola un divieto permanente o un malfunzionamento per i visitatori.

Una seconda verifica ordinaria alle21:56:19UTC ha confermato ancora8URLHTTP200 e hash b3ca230, senza modifiche remote.

Azione umana precisa: il titolare/coordinatore deve inviare questa bozza dall'assistenza dello **specifico hosting WordyLand**, se decide di contattare il provider, e far restituire diagnosi e intervento circoscritto. L'agente non l'ha inviata. Il codice può continuare solo su work; main e deploy restano fermi fino a nuova evidenza pertinente.
