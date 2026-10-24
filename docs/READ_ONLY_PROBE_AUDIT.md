# Audit del probe esistente prima di qualsiasi dispatch

Verifica sul main remoto di riferimento `77e071ca24438881121786d0d1cd80d90a71ea99`. Nessun workflow avviato in questo controllo, nessun nuovo deploy, reset, bootstrap, invio email o ticket.

## Controlli effettuati

| Componente | Evidenza | Esito |
| --- | --- | --- |
| Guardie dei job | workflow_dispatch con mode=probe esclude verify/browser/deploy/rollback | Nessuna pubblicazione, provisioning o reset nel ramo |
| Job probe | deploy.yml righe 108–127: checkout, IP pubblico e deploy-siteground.sh probe | Usa i secret SSH già previsti; non genera nuove credenziali |
| Dispatch completo | deploy.yml righe 129–146: anche hostkey-crosscheck, matrice macos-latest/windows-latest | Tre runner complessivi; non limitato al singolo controllo account. Consumo minuti/costi non verificato qui |
| Probe shell remoto | siteground-remote.sh righe 147–155 | Legge percorsi, PHP, flock, impronte host e marker; non richiama status/install/rollback, prepare_priv o bootstrap |
| Diagnostica proprietario | owner-recovery-status.php righe 7–12 | SELECT role solo per luca@perrone.it, PRAGMA query_only; restituisce ownerExists/ownerIsAdmin/privateActivationAvailable; non legge hash/password/link |
| Posta | Il ramo probe non legge mail-settings.json né include una diagnostica mail | Nessun risultato nuovo su trasporto/mittente, nessun invio |

Fonti immutabili:

- https://github.com/socialluca89-byte/word/blob/77e071ca24438881121786d0d1cd80d90a71ea99/.github/workflows/deploy.yml#L108
- https://github.com/socialluca89-byte/word/blob/77e071ca24438881121786d0d1cd80d90a71ea99/scripts/deploy-siteground.sh#L76
- https://github.com/socialluca89-byte/word/blob/77e071ca24438881121786d0d1cd80d90a71ea99/scripts/siteground-remote.sh#L147
- https://github.com/socialluca89-byte/word/blob/77e071ca24438881121786d0d1cd80d90a71ea99/scripts/owner-recovery-status.php#L7

## Punto esatto di arresto

La nuova direttiva consente il dispatch solo «se è effettivamente limitato ai tre booleani» senza nuovi costi/permessi; altrimenti richiede di fermarsi indicando il punto. Il workflow main non soddisfa tale limite di output e di esecuzione: oltre ai tre booleani, include metadati tecnici e due job di crosscheck su altri runner. Non è stato quindi avviato. Questo non è un rifiuto dell’auto-review né una prova che il codice muti gli account.

Non basta chiamare il job probe per nome: workflow_dispatch avvia anche i job la cui condizione corrisponde. Non sono stati usati input differenti, modifiche su main, job sostitutivi o tentativi di aggirare questa condizione. La futura scelta è fra accettare esplicitamente il perimetro completo già descritto oppure predisporre un percorso strettamente limitato; nessuna delle due operazioni è stata eseguita.

## Accesso disponibile e limiti email

cloud_environment.environment_status corrente riporta observations_current=true, secret bindings vuoti e nessuna outbound identity. Il manifest di rete locale non assegna domini/range TCP; non è stato tentato SSH diretto o un tunnel alternativo. I secret di GitHub Actions non sono automaticamente credenziali del runtime.

Il CLI gh è installato; gh auth status restituisce exit 0, ma da questo controllo non è stato stabilito il permesso effettivo di dispatch. Non è corretto trattare la sola assenza di un connettore GitHub come prova assoluta che il CLI non possa autenticarsi. Il dispatch resta non tentato già per la condizione di perimetro descritta sopra; non sono stati letti token o file credenziali. Nessun test su endpoint API GitHub esclusi dalla policy è stato aggiunto.

Non esiste nel probe attuale un comando parametrico autorizzato che restituisca la sola configurazione email. Mancano quindi sia un percorso email già supportato nel workflow sia un accesso SSH direttamente utilizzabile qui. Non è stato aperto o trasferito mail-settings.json, nemmeno in forma integrale temporanea. Stato noto invariato: capacità pubblica emailRecoveryEnabled=false; trasporto previsto dal codice php-mail, ma stato effettivo del trasporto e mittente sul server non verificati. Nessuna inferenza su credenziali SMTP mancanti.

## Evidenze minime ancora da ottenere

- Account: i tre booleani reali non sono disponibili. Nessuna password/codice è stata generata o cambiata.
- Email: servono solo esito della configurazione (assente/disattivata/pronta), tipo trasporto, disponibilità PHP mail e mittente aziendale configurato; nessun contenuto segreto. Il percorso attuale non restituisce questi dati, quindi non sono stati dichiarati verificati.
- Supporto: nessun ticket aperto; l’eventuale contatto SiteGround WordyLand resta separato da Caffè Oro e sarà autorizzato dal coordinatore.

Controllo solo statico del codice e metadati runtime. Nessun nuovo test applicativo necessario: non è cambiato codice eseguibile. I test sintetici precedenti non sono risultati del server reale.

## Preparazione successiva, senza esecuzione

Ora esiste una diagnostica separata, descritta in [READ_ONLY_READINESS.md](READ_ONLY_READINESS.md), con trasporto SSH singolo e protocollo ridotto. È stata verificata solo con fixture; il template a runner singolo è fuori da .github/workflows e non è registrato. Non cambia l’esito dell’audit del workflow main né costituisce prova sul vero account o sulla configurazione email.
