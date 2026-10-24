# Recupero accesso adulto

## Stato e intervento minimo per il proprietario

Il provisioning originale di `luca@perrone.it` crea una password casuale non consegnata in chat e salva il link privato di attivazione in `/home/customer/www/wordyland.eu/.wordyland-data/admin-activation.txt`. Un deploy successivo conserva password e codice esistenti. La presenza attuale del file sul server non è stata verificata da questa sessione.

Se il file esiste, il proprietario può aprirlo dal proprio accesso SiteGround e usare personalmente il link per scegliere una password. Non copiare il contenuto nella chat, nei log o su GitHub. Questo è il percorso già disponibile e non richiede un servizio email. Se il file manca e password/codice sono persi, occorre un recupero assistito attraverso il controllo dell’hosting; nessun reset, nuovo codice o cambio di privilegi è autorizzato automaticamente per questo account.

`scripts/owner-recovery-status.php` è una diagnostica CLI privata di sola lettura: tramite la connessione SSH già autorizzata, con `WORDYLAND_BOOTSTRAP_DATA` impostato alla cartella privata, restituisce esclusivamente tre booleani (account presente, amministratore, file di attivazione disponibile). Non legge password, hash o contenuto del link, né altri account. Non è installata nel sito e non è stata eseguita sul server reale. La pipeline aggiornata la esegue anche nella modalità manuale `probe` quando SG_PATH è configurato: Actions → Verify and deploy WordyLand → Run workflow → mode probe. La verifica usa i secret SSH già configurati nel runner e stampa soltanto i tre booleani; non attiva l’account e non apre il link.

## Nuovo flusso email, disattivato per impostazione predefinita

Il codice permette a un adulto di richiedere un link monouso valido 15 minuti. Il token casuale da 256 bit è conservato nel database solo come SHA256; il browser elimina subito il frammento dall’URL e non lo salva sul dispositivo. Una richiesta non cambia la password. Il cambio effettivo richiede il token e due password coincidenti; consuma tutti i link dell’account e invalida le sessioni. Un precedente cambio password/recupero rende inutilizzabili i link pendenti. Profili, premi e progressi restano invariati. Il precedente codice di recupero rimane disponibile.

Sono presenti CSRF, limiti per IP e indirizzo, e risposte uguali per indirizzi registrati e sconosciuti. Gli alunni continuano a utilizzare il recupero della classe; questo flusso non richiede loro indirizzi email. La consegna dipende dall’hosting: la risposta generica non prova che il messaggio sia arrivato. Il trasporto PHP locale non offre una garanzia di tempi identici fra richieste.

Per abilitare l’invio occorre prima concordare e verificare la posta uscente dell’hosting, il mittente e la consegna. Solo dopo tale verifica, creare **fuori da public_html**, nella cartella privata `.wordyland-data`, il file `mail-settings.json` con permessi `0600`:

```json
{"enabled":true,"transport":"php-mail","from":"mittente-verificato@example.test"}
```

L’indirizzo qui è fittizio: non usarlo sul sito. Nessun file di configurazione è stato creato sul server e nessuna email reale è stata inviata. Non sono stati attivati servizi o credenziali. Togliere il file o impostare `enabled:false` disattiva il flusso. Prima di attivarlo per l’account reale serve la conferma specifica del proprietario.

Nei test soltanto, `WORDYLAND_TEST=1` e `WORDYLAND_TEST_MAIL=1` scrivono una casella fittizia nella cartella temporanea privata. Questa modalità non è disponibile in produzione. I test API e browser non usano iscritti reali.

## Procedura assistita pronta, mai automatica

Se il probe conferma che il proprietario esiste, è amministratore e non ha più il file privato di attivazione, è disponibile `scripts/prepare-owner-recovery.php`. È uno script CLI privato, escluso dal bundle pubblico e mai chiamato da deploy o probe. È stato provato soltanto su database fittizi.

L’esecuzione sul vero account richiede prima la conferma specifica dell’utente. Il vincolo viene dalla direttiva ricevuta nel task: «Per il vero account luca@perrone.it NON resettare password, generare nuove credenziali/recovery o modificare permessi automaticamente». I flag richiesti dallo script non sostituiscono quella conferma nella conversazione.

La procedura accetta solo la cartella privata di wordyland.eu e l’account fisso luca@perrone.it, già esistente con ruolo admin. Non crea utenti, non promuove ruoli, non cambia la password e non tocca profili, monete o XP. Prepara un nuovo link nel file privato admin-activation.txt (0600), ruota il codice di recupero e revoca le sessioni esistenti. Il proprietario deve aprire personalmente il link sul proprio hosting e scegliere la password; nessun segreto viene stampato. Se un file di attivazione esiste già, si ferma senza sovrascriverlo: usare prima il percorso già disponibile.

Per evitare attivazioni accidentali servono entrambi l’argomento `--prepare-owner-recovery` e la conferma esplicita del destinatario in `WORDYLAND_OWNER_RECOVERY_CONFIRM`; la directory è `WORDYLAND_BOOTSTRAP_DATA`. L’operatore autorizzato usa soltanto la connessione SSH già configurata e il file versionato del repository; nessun download/esecuzione periodica, nuova chiave o endpoint web. Non eseguire lo script solo per “verificare”: usare il probe di sola lettura.

Un errore di scrittura/aggiornamento o commit viene verificato nei test con rollback e pulizia del solo file appena creato. Un eventuale esito non determinabile conserva le istruzioni private e richiede un controllo prima di ripetere. Il nuovo script non autorizza alcuna azione sul progetto separato Caffè Oro.
