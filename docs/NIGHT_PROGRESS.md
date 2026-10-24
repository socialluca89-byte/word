# Avanzamento WordyLand — 24 ottobre 2026

Task esistente, coordinato dall’assistente dot; nessun task sostitutivo o cron creato. Base: `a7514b0`, già su main e pubblicata nel run https://github.com/socialluca89-byte/word/actions/runs/40115086960 secondo la precedente verifica del task. Nessun dato reale degli alunni consultato in questo blocco.

## Blocco 1 — Recupero account adulto

Problema: il proprietario non dispone dei dati iniziali di accesso; il recupero attuale richiede un codice. Verificato il provisioning nel repository: la password iniziale casuale non è mostrata; viene salvato un link privato di attivazione nella cartella dati su SiteGround. Non è stata verificata la presenza attuale del file reale: questa sessione non dispone di una connessione SSH diretta configurata; quella del deploy risiede nel runner GitHub.

Realizzato:

- Recupero email opzionale con token casuali da 256 bit, memorizzati solo come hash, scadenza 15 minuti, uso singolo, CSRF e limiti per IP/indirizzo. Risposte generiche per indirizzi registrati e sconosciuti; consegna effettiva non garantita dalla risposta.
- Conferma doppia della password, revoca delle sessioni e dei link pendenti, conservazione di profili e premi. Il browser rimuove il token dall’URL e non lo persiste; se un account è già collegato richiede prima un logout esplicito, così non perde progressi da salvare.
- Interfaccia chiara quando la posta non è attiva. Invio disattivato per impostazione predefinita. Nessun servizio, credenziale o configurazione reale aggiunti; nessuna email reale inviata.
- Diagnostica CLI privata di sola lettura: tre booleani sull’account proprietario e sul file di attivazione. Non legge password, hash o contenuto del link. Provata soltanto con database fittizio.
- Documentazione operativa in ACCOUNT_RECOVERY.md, test API/browser dedicati e inclusione nelle verifiche CI.

Verifiche:

- PASS: tutte le verifiche del job verify (sintassi, bundle, contenuti, apprendimento, premi, PWA, API, accesso, classe, avventure, amministrazione, presenza, ripresa, cache, deploy simulato).
- PASS: nuovo test API email, flusso disattivato, casella fittizia, hash, scadenza, CSRF, link invalidati da cambio password, riuso rifiutato, revoca sessioni, conservazione profilo/codice e limiti anche su indirizzo inesistente.
- PASS: nuovo browser email, richiesta, pulizia URL, nessun token in localStorage, password discordanti, recupero/accesso, logout esplicito, link già usato, viewport 320/390/1360px.
- PASS: browser UX, apprendimento, ripresa, PWA e premi.
- PRESENZA: prima esecuzione fallita per timeout aspettando «Accetta ⚡»; ripetizione isolata PASS. Possibile instabilità non ancora attribuita a una causa. Non dichiarata risolta.
- PASS: browser movimento e accesso, completati dopo PWA e premi.
- NON ESEGUITI: diagnostica su hosting reale, recupero del vero account, invio/consegna reale della posta, nuova pubblicazione. Nessuna password, codice o autorizzazione reale cambiati.

Limite per pubblicazione: la pipeline corrente esegue anche il provisioning proprietario; se l’account mancasse creerebbe nuove credenziali. L’ultima istruzione richiede conferma specifica prima di tale operazione. Questo blocco resta quindi sul ramo work finché non sia verificato in sola lettura lo stato del proprietario o adeguato esplicitamente il provisioning. Non è un diniego automatico degli strumenti.

Intervento minimo: il proprietario verifica dal proprio SiteGround se esiste `.wordyland-data/admin-activation.txt` e usa personalmente il link già presente. Non incollarlo in chat. Se il file manca, predisporre una procedura di recupero assistito da confermare specificamente; non consentire reset dal solo indirizzo email.

## Coda successiva

1. Conservare la memoria degli errori/aiuti alla ripresa di una domanda e distinguere risposte autonome da correzioni, senza cambiare i premi già ottenuti.
2. Misurare carico iniziale e scene WebGL su telefono; ottimizzare l’inizializzazione fuori schermo mantenendo interazioni e movimento ridotto.
3. Riprodurre l’instabilità del test inviti con diagnostica mirata, poi migliorare navigazione/onboarding e verificare nuovamente mobile/desktop.
