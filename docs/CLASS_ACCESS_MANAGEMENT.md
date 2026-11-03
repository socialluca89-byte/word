# Accesso alla classe: recupero assistito e inviti gestiti

Preparato sul ramo di risoluzione dell’audit; i test locali non costituiscono pubblicazione o recupero di account reali.

## Dove si trova

Un adulto che gestisce la classe apre **Classe → Mostra link di iscrizione → Gestisci iscrizioni e recupero accessi**. La stessa gestione è raggiungibile dai link mostrati nell’area adulto o nell’amministrazione; i permessi sono comunque verificati dal server.

- **Sospendi nuove iscrizioni** blocca nuovi profili e nuove membership dal link; chi è già iscritto continua ad accedere.
- **Rinnova link nuove iscrizioni** produce un invito diverso. Tutti i link precedenti continuano a identificare la classe per il login/recupero degli iscritti, ma non consentono nuove iscrizioni. Riaprire le iscrizioni non riattiva i token precedentemente ritirati.
- **Rimuovi dalla classe** richiede una conferma; conserva account, dati, progressi e premi. **Ripristina partecipazione** ripristina solo una membership precedentemente rimossa in quella classe (con un gestore attualmente autorizzato), se capienza e soprannome lo consentono. Non è un’eliminazione dell’account o un ban universale. Il profilo dell’account proprietario della classe non è rimovibile qui.

Un invito sospeso apre inizialmente il rientro «Ho già un profilo». La registrazione rimane visibile ma disabilitata con un messaggio esplicito. Il codice stabile originario e gli alias storici non sono credenziali sufficienti per prendere possesso di un account.

## Recupero assistito del singolo alunno

Il gestore seleziona un alunno attualmente iscritto e conferma di aver verificato esternamente l’identità di chi richiede il recupero e la relativa autorizzazione. Il software non presume quel rapporto da un nickname, da un’email o dal possesso del link classe.

**Prepara recupero** mostra un codice privato di 24 cifre esadecimali, valido 15 minuti e una sola volta. Nel database rimane solo il digest SHA-256. Il codice appare solo nella risposta autorizzata e nella pagina aperta; non viene inserito in URL, log, localStorage o sessionStorage, né inviato per email. Il gestore lo consegna in privato al destinatario verificato e può nasconderlo o revocarlo. Una nuova emissione revoca i codici precedenti dello stesso account. La risposta incerta non viene ripetuta automaticamente: il gestore verifica lo stato e, se il codice non è arrivato, lo revoca prima di prepararne un altro.

Preparare il codice **non cambia password, recovery code personale o sessioni**. Il destinatario apre un normale link della classe, sceglie **Password dimenticata → Ho un codice del gestore**, inserisce soprannome/codice e sceglie e conferma una nuova password. Solo questa conferma modifica la password, ruota il recovery code personale e incrementa la versione delle sessioni. Gli accessi precedenti vengono invalidati. Il destinatario conserva il nuovo recovery code e accede con la nuova password; non viene creato un account duplicato.

Sono ammessi soltanto account `learner` con un unico profilo, attualmente membro della classe. Gli account adulti/amministratori e le configurazioni legacy con più profili richiedono una procedura separata: questo flusso non può resettarli. Il ruolo/sessione del gestore e la titolarità della classe sono riletti sotto la transazione; al riscatto sono ricontrollati anche membership, identità del profilo, ruolo e versione dell’account target e autorizzazione corrente dell’emittente. Cambio di proprietario/ruolo, spostamento del profilo o rimozione della membership revocano i token in modo monotono: ripristinare il ruolo/membership non li riattiva.

La rimozione della membership invalida anche i collegamenti genitore–alunno dipendenti da quella membership; il ripristino non ricrea la precedente autorizzazione del genitore. Serve un nuovo abbinamento/consenso come nel flusso guardian già esistente.

## Contratti interni e compatibilità

Le tabelle sono aggiuntive: `class_invitation_controls`, `class_access_aliases`, `class_recovery_grants`, `class_membership_removals`. Nessuna migrazione cambia account, credenziali, profili, classe Best 2 reale o progressi. La gestione pubblica `class-invite` aggiunge il booleano `registrationOpen`, senza roster o grant privati. `class-link` mantiene il precedente campo `code`; dopo rotazione restituisce l’invito corrente.

I nuovi endpoint gestore sono POST con CSRF: `class-manage-state`, `class-invitation-update`, `class-recovery-issue`, `class-recovery-revoke`, `class-member-remove`, `class-member-restore`. Il riscatto è `class-assisted-confirm`: POST anonimo con CSRF, link classe, soprannome, token e conferma password. Emissione e riscatto sono limitati per operatore/IP e target; i tentativi invalidi non cambiano credenziali. Il nonce di emissione impedisce grant duplicati da risposta persa/doppio invio, senza ripubblicare il token grezzo.

`platform.php` usa `invitationClass` e `classroomRegistrationOpen` per applicare gli stessi controlli anche a `club-join` dei profili di famiglie già registrate. Le membership già presenti restano idempotenti anche con inviti sospesi/ritirati.

## Prove e limiti

- **PASS:** `scripts/test-classroom.py`, conservazione del vecchio contratto, migrazioni additive, account legacy, login e link storici, ruoli, capienza e progressi.
- **PASS, sei gruppi:** `scripts/test-classroom-access.py`: isolamento/CSRF; pause e due rotazioni; nessun cambio credenziali all’emissione e token hashato/monouso/scaduto/revocato; due worker/sessioni e barriera sul riscatto concorrente con singolo reset; conservazione del profilo e del wallet; rimozione/ripristino idempotenti; revoca monotona per ruolo/proprietario/versione e limiti tentativi.
- **PASS:** `scripts/test-classroom-access-browser.cjs`: moduli reali in browser locale, annulla/doppio clic, codice volatile privato, riscatto e stesso profilo/premi, sessione precedente invalidata, inviti sospesi/ruotati e risposta di emissione trattenuta fino al logout senza mostrare il token nel nuovo contesto.

Tutte le persone e i database sono sintetici. Nessuna email, password reale, nuovo permesso di hosting, richiesta alla produzione o migrazione effettiva degli alunni è stata eseguita. La conferma di identità resta responsabilità dell’adulto autorizzato; la validazione effettiva dell’account Luca/email e la pubblicazione sono compiti distinti del coordinatore.
