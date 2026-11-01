# Correzioni del gioco: codice verificato, pubblicazione bloccata

## Stato certo

- Candidato main: `5d4c6b2837c9291ae57ac04b7fa799b4984afa39`.
- [Run41344585348](https://github.com/socialluca89-byte/word/actions/runs/41344585348): verify PASS; tutte le38suite browser PASS; deploy FAIL nella fase public-health-preflight.
- [Job deploy124964206094](https://github.com/socialluca89-byte/word/actions/runs/41344585348/job/124964206094): fase iniziata il1novembre2026 alle20:10:29UTC, conclusa20:10:30UTC.
- Annotazioni pubbliche: `SiteGround anti-bot verification intercepted the health endpoint (HTML instead of JSON).` e `Public health preflight failed; no SSH connection, upload, install or cache purge was attempted.`
- Nessuna connessione SSH, nessun caricamento, installazione o invalidazione cache in questo tentativo. Ultimo live precedentemente verificato:901fd989cf79d84e651164af5ccc8f6774e53bf1. Non è stato eseguito un nuovo probe del sito dopo il blocco.
- La verifica browser pubblica del candidato corretto NON è stata eseguita: richiede prima un deploy riuscito. La correzione non va descritta come già online.
- Il codice è pronto e congelato. Nessun retry, cambio IP/identità, disattivazione anti-bot o modifica a credenziali/configurazione è stato tentato.

## Correzioni presenti

Box di allenamento classico con gli stessi sei disegni delle schede e avatar realmente equipaggiato; Giochiamo porta l'esercizio nella parte visibile del telefono; otto azioni illustrate mostrano oggetti reali e risultato visibile; bersagli non coprono i personaggi; replay elimina gli effetti precedenti. Cataloghi, account, classi, progressi, punti e permessi conservati.

Il primo candidato21f8a3f era stato fermato da una nuova regressione browser, prima del deploy: il generatore URL alterava un identificatore del renderer. La causa è stata corretta nel candidato5d4c6b2; il generatore ora modifica soltanto il registro URL. La verifica completa successiva è PASS: il problema attuale è distinto e riguarda la risposta del server.

## Testo pronto per l'assistenza SiteGround — non inviato

> Dominio WordyLand: wordyland.eu. Il1novembre2026 alle20:10:29–20:10:30UTC il workflow GitHub Actions autorizzato del repository socialluca89-byte/word ha ricevuto una pagina anti-bot SiteGround HTML al posto del JSON dal controllo GET https://wordyland.eu/api.php?action=health (con parametro univoco verify-41344585348-…). Il deploy si è fermato prima di caricare chiavi SSH o sostituire file. Run: https://github.com/socialluca89-byte/word/actions/runs/41344585348, job124964206094. Potete verificare nei log la regola/challenge applicata a quella richiesta e ripristinare una modalità supportata per consentire questo controllo automatico già autorizzato, mantenendo attive le protezioni del sito? Il precedente rilascio dello stesso progetto era riuscito. Questa richiesta riguarda esclusivamente WordyLand, non Caffè Oro.

Il codice HTTP numerico non è riportato nelle annotazioni pubbliche disponibili; non è stato dedotto o inventato. Il testo completo del log non è scaricabile dal relativo percorso pubblico anonimo (404), mentre le annotazioni citate sono leggibili nel job.

## Passo successivo

Dopo una risoluzione pertinente confermata dal provider: usare il workflow esistente sul main congelato; mantenere preflight e tutti i controlli. Solo dopo successo, eseguire un'unica verifica ospite dei percorsi classici, risposte, azioni, festività, scoperte e checksum degli asset. Nessuna nuova raccolta dati, email, credenziale o modifica di accessi è necessaria per le correzioni del gioco.
