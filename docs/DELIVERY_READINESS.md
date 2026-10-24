# Consegna: diagnosi dei tre impedimenti

Riferimento del codice funzionale: `e4b9d2d3c3928426f352f18d1e60c2a926058eb3`, ramo work, testato localmente e non pubblicato. Ultima release live verificata: `22f2d6028b87c0ae22029eaa211c148a7964ef69`. Main remoto era `77e071ca24438881121786d0d1cd80d90a71ea99`; il suo deploy era fallito con rollback verificato. Nessun altro deploy è stato tentato per questa diagnosi.

## 1. Pubblicazione: prove, limiti e azione richiesta

Run fallito: https://github.com/socialluca89-byte/word/actions/runs/40128858645/job/120976562487, concluso il 24 ottobre 2026 alle 20:16:49 UTC. Richiesta generata dal codice versionato:

```text
GET https://wordyland.eu/api.php?action=health&verify-40128858645-<nanosecondi generati con date +%s%N>
```

Il suffisso temporale effettivo non è nei log pubblici disponibili: questa è la forma esatta del comando, non una ricostruzione del valore perduto. `curl -fsS --retry 3 --retry-delay 5 --max-time 30` non registrava il codice HTTP numerico. Non attribuire quindi arbitrariamente HTTP 200, 403 o 503 al run storico.

Contenuto diagnostico disponibile, redatto: risposta HTML con marcatore `sgcaptcha`, al posto del JSON atteso. Annotazioni pubbliche rilette il 24 ottobre:

```text
SiteGround anti-bot verification intercepted the health endpoint (HTML instead of JSON).
Automatic rollback completed; verified server marker: 22f2d6028b87c0ae22029eaa211c148a7964ef69
```

Il corpo integrale e gli header HTTP del run non erano conservati nelle annotazioni; nessun cookie o challenge è stato recuperato o simulato.

Controlli pubblici attuali, senza autenticazione né retry applicativi:

| Origine | Richiesta eseguita | Risultato |
| --- | --- | --- |
| curl dall’ambiente cloud, 24 ottobre 2026, prima delle 21:32 UTC | `GET https://wordyland.eu/api.php?action=health` | HTTP 200, `application/json; charset=utf-8`, `{"ready":true,"database":"sqlite"}`, 34 byte, nessun `sgcaptcha` |
| Chromium con verifica TLS e proxy configurato, 2026-10-24 21:32:35.903 UTC | stessa richiesta pubblica | HTTP 200, stesso tipo e campi JSON, nessun `sgcaptcha` |

Chromium non ha usato cookie preesistenti, login, stealth, risposta al challenge o percorsi alternativi. Queste sono due modalità di lettura dallo stesso ambiente cloud, non la rete personale dell’utente e non il runner GitHub. Rispetto al run fallito cambiano momento, rete di esecuzione e parametro temporale: non è provato quale differenza attivi la regola. Il sito oggi risponde a questi controlli; questo non dimostra che il prossimo runner sia accettato e non autorizza una nuova pubblicazione.

Azione concreta: SiteGround deve correlare richiesta/path e finestra temporale del run nei propri log, restituire stato HTTP, ID/regola/reason dell’anti-bot e indicare il metodo ufficiale supportato per verifiche HTTPS automatiche GitHub Actions. Chiedere una soluzione supportata mantenendo le protezioni; non disabilitare anti-bot, non simulare cookie, non spostare l’uscita di rete per evitarlo e non sostituire la verifica con un esito presunto positivo.

### Integrità già supportata: controllo complementare

La pipeline controlla già in SSH autenticato i SHA256 dei 36 file pubblici nello staging e dopo la copia, la sintassi PHP e il marker del commit. La copia precedente e il marker sono controllati anche nel rollback. Il test locale `scripts/test-deploy.sh`, rieseguito per questa diagnosi con hosting fittizio, verifica questi comportamenti e continua a rifiutare HTML anti-bot e pagine pubbliche obsolete. Non è stato aggiunto un nuovo canale remoto.

Questi controlli dimostrano integrità dei file sul server; non dimostrano che HTTPS pubblico raggiunga l’API corretta o che la cache serva la versione giusta. Non esiste una modalità già supportata che li usi per saltare health: restano complementari, non una sostituzione della verifica pubblica. Il prossimo deploy rimane sospeso in attesa della risposta hosting pertinente.

## 2. Email: ciò che è verificato e il minimo necessario

Controllo pubblico attuale: `GET https://wordyland.eu/api.php?action=auth-capabilities` → HTTP 200, `{"emailRecoveryEnabled":false}`. Nessuna richiesta di recupero o email reale inviata.

Dal codice non segreto: il solo trasporto di produzione implementato è PHP `mail()`. La configurazione privata prevista è `/home/customer/www/wordyland.eu/.wordyland-data/mail-settings.json`, con `enabled`, `transport` e `from`. Occorrono `enabled:true`, `transport:"php-mail"`, mittente sintatticamente valido, file regolare senza symlink e funzione PHP `mail` disponibile. La validità sintattica non prova proprietà del mittente, autenticazione del dominio o consegna.

Il valore pubblico false non distingue file assente, disattivazione intenzionale, trasporto non supportato, mittente invalido o funzione `mail` indisponibile. La configurazione privata del server non è accessibile da questa sessione: non è corretto affermare che manchino certamente credenziali, né che SMTP sia pronto. Il runtime attuale non ha binding SSH/identità iniettati; la chiave esistente resta nel runner GitHub, non è stata copiata qui.

Minimo necessario: SiteGround conferma che PHP mail sia ammesso per questo sito, indica un mittente del dominio già controllato dal proprietario e i requisiti SPF/DKIM/deliverability applicabili; l’operatore controlla soltanto i tre campi non segreti e disponibilità di `mail()`, senza condividere file/credenziali. Per questo trasporto non si devono chiedere password SMTP: non sono usate dal codice. Se PHP mail non è supportato, occorre una decisione separata sul trasporto: non attivare servizi nuovi automaticamente.

Dopo tale conferma, serve un test di consegna autorizzato verso una casella dell’adulto, con messaggio innocuo senza link/token di recupero, e ricezione verificata. Solo successivamente, con consenso esplicito già richiesto nel task, si abilita la configurazione privata 0600. Nulla di ciò è stato eseguito. I test attuali usano solo outbox sintetica e non provano consegna reale.

## 3. Luca: stato noto e recupero da autorizzare

La cronologia riporta il provisioning di `luca@perrone.it`; il codice originale prevedeva password casuale e istruzioni private. Lo stato attuale del vero database non è stato letto: esistenza account, ruolo admin e disponibilità del file non sono confermati. Non confondere il provisioning previsto o i test sintetici con la verifica attuale.

Il probe già presente in main è il primo passo minimo: GitHub → Actions → Verify and deploy WordyLand → Run workflow → branch main → mode **probe**, non deploy/rollback. Usa l’SSH già configurato e restituisce solo `ownerExists`, `ownerIsAdmin`, `privateActivationAvailable`; non stampa password, hash, codici o link e non modifica l’account. Non è stato avviato da questa sessione: non è disponibile uno strumento autenticato per il dispatch. Non occorrono nuove chiavi.

- Se il file `/home/customer/www/wordyland.eu/.wordyland-data/admin-activation.txt` è disponibile: il proprietario lo apre personalmente nel File Manager SiteGround e usa il link per scegliere la password. Non incollare il link in chat o nel ticket supporto. La sola esistenza del file non ne prova validità/uso precedente: non cancellarlo per forzare una rigenerazione.
- Se account e ruolo admin sono confermati, il file manca e gli accessi sono persi: `scripts/prepare-owner-recovery.php` è pronto solo su work, testato con database fittizi e mai eseguito sul vero account. È CLI privato, non installato nel sito, escluso da deploy/probe. Richiede l’argomento esplicito e la conferma tecnica del target, oltre alla conferma specifica dell’utente.
- Se account assente, ruolo diverso da admin o file esistente: la procedura si ferma. Non crea account, non promuove ruoli e non sovrascrive il file; serve una decisione distinta basata sull’esito reale.

Conseguenze precise della preparazione assistita: genera un nuovo codice/link monouso nel file privato 0600; sostituisce il recovery hash, quindi il precedente codice non funziona più; incrementa session_version, revocando le sessioni di Luca. Non cambia ancora password o ruolo, non modifica profili, classi, progressi, monete o premi. Quando il proprietario usa il link, sceglie personalmente la nuova password e consuma il recupero. Nessun segreto va in chat/log/GitHub. Esito incerto: controllare prima di ripetere.

Conferma specifica richiesta solo se il probe rende applicabile questa procedura: «Autorizzo, per luca@perrone.it già amministratore e con file privato di attivazione assente, la preparazione del nuovo recupero privato, consapevole che invalida il vecchio codice e disconnette le sessioni. Password e dati restano invariati finché userò personalmente il link». Questa conferma non è stata ancora ricevuta; non viene dedotta dalla richiesta generale di migliorare il sito.

## Matrice dei cinque punti concordati

| Punto | Completato nel codice | Testato | Live | Bloccato / cosa manca |
| --- | --- | --- | --- | --- |
| Accesso e recupero utilizzabile | Parziale: logout/cambio/codice; email e CLI assistito preparati | API/browser/outbox e CLI fittizi PASS | Flussi base sì; email no; nessun recupero reale eseguito | Probe Luca, eventuale conferma assistita; trasporto/mittente/consegna email |
| Home chiara, progressi e mobile | Sì nel perimetro concordato, nessuna destinazione rimossa; font non bloccanti su work | Quattro viewport, navigation/UX/performance PASS | Home base sì; ultimo miglioramento font no | Pubblicazione; controlli su telefono fisico ancora non eseguiti |
| Varietà giochi e ripasso guidato dagli errori | Sì: temi e giochi conservati, aiuti e ripasso recente; avvisi coerenti dopo conferma | API, school (11 missioni/13 schede), learning/resume/autonomy/review PASS | Giochi/aiuti sì; ripasso recente e ultimo avviso corretto no | Pubblicazione e CI del nuovo incremento |
| Avatar e ricompense non punitive | Sì: sei personaggi, 48 premi, anteprime gratuite; nessuna modifica economica | Characters/rewards/wardrobe PASS, quattro viewport | Catalogo/personaggi sì; nuove anteprime e comandi no | Pubblicazione e CI del nuovo incremento |
| Area adulto/docente, classe privata e accessibilità | Sì nel perimetro: strumenti conservati, nuovo riepilogo dei soli profili propri | API parent-summary, privacy, browser/cambio profilo/offline/bozze, access/motion PASS | Classe/strumenti precedenti sì; nuovo riepilogo no | Pubblicazione; accesso proprietario reale; verifica fisica dei dispositivi |

API e 17 suite browser distinte del blocco funzionale PASS locali; dettaglio e fallimenti corretti in NIGHT_PROGRESS.md. La nuova CI remota non è partita perché il push è solo work. La consegna richiede poi CI remota, deploy autorizzato con health e file pubblici conformi, e verifica delle modifiche effettivamente live. Non dichiarare tutto completato.

## Unica richiesta operativa pronta per l’utente

Dal tuo accesso attuale a SiteGround, apri un solo ticket con il testo qui sotto; in parallelo avvia il probe read-only già disponibile su GitHub come indicato sopra. Riporta in un’unica risposta l’esito del ticket, i tre booleani del probe e il mittente del dominio già verificato. Nessuna password, chiave, codice o link privato. Non serve cambiare cron, cache, chiavi o protezioni. Se il probe conferma admin e assenza file, aggiungi soltanto allora la conferma specifica di recupero riportata sopra; in caso contrario segui il ramo pertinente senza rigenerare nulla.

Testo da inviare al supporto (nessun invio automatico eseguito):

> Per wordyland.eu un deploy GitHub Actions del 24/10/2026, concluso alle 20:16:49 UTC, ha ricevuto HTML con sgcaptcha su GET https://wordyland.eu/api.php?action=health&verify-40128858645-[timestamp in nanosecondi]. Il timestamp completo e il codice HTTP non erano nel log CI; vi chiedo di cercare nel periodo del run e indicare stato HTTP, regola/ID e motivo del challenge, oltre al metodo ufficiale per verificare HTTPS automatico da GitHub Actions mantenendo le protezioni. Il deploy ha ripristinato la precedente release; non chiediamo di disabilitare anti-bot o Dynamic Cache. Alle 21:32 UTC lo stesso endpoint senza parametro temporale rispondeva 200 JSON da curl e Chromium dell’ambiente cloud. Run: https://github.com/socialluca89-byte/word/actions/runs/40128858645. Inoltre confermate se il sito può inviare tramite PHP mail(), quale mittente del dominio già controllato dall’intestatario può essere usato e quali verifiche SPF/DKIM/consegna servono. Non attivate servizi nuovi e non modificate account o credenziali dell’applicazione.

Il prossimo passo email, dopo risposta tecnica e scelta del mittente, è concordare il solo messaggio di prova all’adulto; non avviare recuperi o attivare il flusso mentre manca la consegna verificata.
