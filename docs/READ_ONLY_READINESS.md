# Diagnostica minimale preparata, non eseguita sul server

Artefatti separati dal workflow multi-runner:

- `scripts/read-only-readiness.php`: CLI privata, solo SELECT del ruolo di Luca, apertura SQLite con flag READONLY e PRAGMA query_only. Controlla l’esistenza del file di attivazione senza leggerne il contenuto. Legge solo in memoria una configurazione mail regolare limitata a 16 KiB e restituisce stati, mai valori del file o indirizzo mittente.
- `scripts/read-only-readiness.sh --read-only`: una sola invocazione SSH, riusa gli SG_* già previsti, chiave esistente e verifica rigorosa SG_KNOWN_HOSTS. Host/porta/percorso fissi del progetto, nessun keyscan o fallback. Non chiama deploy/probe/bootstrap/cache e non invia email. File chiave temporanei privati e agente dedicato vengono ripuliti; caricamento chiave limitato a 5 secondi, SSH a 35.
- `scripts/test-read-only-readiness.py`: soltanto database/configurazioni/chiave fittizi e SSH simulato.
- `docs/read-only-readiness.workflow.example.yml`: template inattivo con un solo runner Ubuntu e soli permessi contents:read già usati dal progetto. Non è in .github/workflows, non è registrato né avviato.

Non installare il PHP in public_html e non esporlo tramite API. Il bundle resta di 36 file e non lo include. Il comando shell richiede esplicitamente --read-only; senza l’argomento o con configurazione host/path diversa si ferma prima della connessione. Nessuna credenziale nuova richiesta o generata in produzione; le chiavi del test sono sintetiche e vengono eliminate.

## Protocollo di uscita

Esempio **fittizio**, non relativo al vero account:

```json
{"ownerExists":true,"ownerIsAdmin":true,"privateActivationAvailable":false,"mail":{"configuration":"disabled","transport":"php-mail","sender":"valid_format","phpMailAvailable":true,"configurationReady":false}}
```

I primi tre campi sono esclusivamente booleani. Gli stati mail sono enumerazioni chiuse:

| Campo | Valori e significato |
| --- | --- |
| configuration | absent, unsafe (symlink), invalid, disabled, present (enabled=true) |
| transport | unset, php-mail, unsupported; nessun valore sconosciuto viene stampato |
| sender | unset, invalid, valid_format; nessun indirizzo viene stampato |
| phpMailAvailable | booleano function_exists('mail'), senza invocare la funzione |
| configurationReady | booleano: enabled, tipo supportato, formato mittente valido e funzione disponibile |

configurationReady=true non prova proprietà del mittente, SPF/DKIM, capacità di recapito o ricezione: nessun invio viene effettuato. Account/database/percorso non leggibili o errore SQL producono exit nonzero, stdout vuoto e solo «Read-only diagnostic unavailable. No state change requested.» Non vengono trasformati in booleani false che simulino un account assente.

Il wrapper valida schema, chiavi, tipi ed enumerazioni prima di stampare il risultato. Banner, output aggiuntivo, errori SSH/PHP, campi privati, risposte troppo grandi o non JSON non vengono riversati nei log. Nessun hash, token, password, link, nome di altro account o intero file viene trasferito nell’output.

## Test e limiti verificati

PASS locali: accesso SQLite realmente in sola lettura, account assente/adulto/admin, attivazione presente/assente/symlink; configurazione assente/disattivata/pronta, funzione mail disabilitata, trasporto sconosciuto, mittente invalido/CRLF, JSON malformato, file grande/directory/symlink; database mancante/corrotto/schema errato e percorso non sicuro; invariabilità byte/permessi/file, nessuna chiamata sendmail, nessun errore privato nei log. Verificata anche esecuzione PHP da stdin come nel trasporto.

PASS wrapper con chiave cifrata sintetica e fake SSH: host verification obbligatoria, host/porta/percorso/utente rifiutati quando errati, chiave/passphrase errate, agente che fallisce, risposta privata/malformata/incoerente/grande ed errore remoto; stdout/stderr ripuliti, file temporanei rimossi e segreti rimossi dall’ambiente del comando SSH. Il test iniziale ha rilevato che una passphrase errata poteva lasciare ssh-add in attesa: aggiunto limite di 5 secondi e cleanup dell’agente, poi test completo PASS. Nessun retry per aggirare l’errore.

Non eseguiti: connessione reale, dispatch, invio email, lettura database vero, cambio credenziali, registrazione del template o pubblicazione. I test sono aggiunti al futuro job verify su work, ma CI remota non è partita. Il codice applicativo testato con le 17 suite del blocco 11 è invariato.

## Uso futuro: autorizzazione e percorso ancora necessari

Solo dopo autorizzazione esplicita a questa diagnostica, il comando può essere eseguito in un contesto che abbia già gli SG_* autorizzati. Non copiare i valori in chat o nel repository. L’attuale runtime non ha tali binding e il workflow probe esistente rimane quello multi-runner: questa preparazione non lo trasforma automaticamente nel job minimo.

Il template è un artefatto da revisionare, non una procedura da attivare subito. Registrare un nuovo workflow nel default branch richiederebbe una modifica a main; qualsiasi push a main oggi attiva il deploy esistente, ancora sospeso per l’incidente hosting. Non usare skip dei controlli, variazioni dei secret/SG_PATH, altri rami/IP o modifiche di sicurezza per superare questo vincolo. La scelta del percorso operativo autorizzato resta al coordinatore/utente; nessuna esecuzione è stata tentata per trovare un’alternativa.
