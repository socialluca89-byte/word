# Consegna del lotto sviluppato — azioni esterne in attesa

Questo lotto termina con codice e diagnostica preparati/testati su work. Non dichiara completato l’intero progetto. Codice funzionale di riferimento e anteprima: e4b9d2d3c3928426f352f18d1e60c2a926058eb3. La diagnostica minimale successiva è separata e non è stata eseguita sul server.

## Cinque punti concordati

| Punto | Sviluppato e verificato | Differenza dal live / ciò che manca |
| --- | --- | --- |
| Accesso e recupero utilizzabile | Logout/cambio/codice; alternativa email predisposta e testata con outbox fittizia; recupero proprietario CLI con guardie; nuova diagnostica minima testata localmente | Base live; recupero reale Luca e consegna email non verificati né attivati |
| Home chiara, progressi e mobile | Tre ingressi principali, destinazioni preservate; quattro viewport; font opzionali dopo load; gestione focus e comandi leggibili | Home base live; ultimi miglioramenti font/guardaroba su work. Telefono fisico non provato |
| Giochi e ripasso dagli errori | Temi/preposizioni, undici missioni/13 schede; aiuti persistenti e ripresa; ripasso recente; equivalenti esclusi dalle alternative errate; avviso obsoleto corretto dopo risposta confermata | Giochi/aiuti live; ripasso recente, alternative equivalenti e ultimo avviso corretto non pubblicati |
| Avatar e ricompense non punitive | Sei personaggi, 48 premi; anteprime gratuite senza spese o equipaggiamento involontario, mantenuti tutti i giochi e premi | Catalogo base live; nuove anteprime/focus/comandi su work |
| Area adulto/docente, classe privata e accessibilità | Classi/presenza/amministrazione/segnalazioni conservate; nuovo riepilogo online dei soli profili propri, nessun nuovo accesso ai compagni; errori di rete/cambio profilo/bozze gestiti | Strumenti precedenti live; riepilogo nuovo su work; accesso reale proprietario da recuperare |

## Anteprime consultabili

Solo dati ospite fittizi, nessun dato di alunni:

- [Home prima](https://github.com/socialluca89-byte/word/blob/e4b9d2d3c3928426f352f18d1e60c2a926058eb3/docs/review/mobile-before-390.png)
- [Home riorganizzata](https://github.com/socialluca89-byte/word/blob/e4b9d2d3c3928426f352f18d1e60c2a926058eb3/docs/review/mobile-after-390.png)
- [Anteprima gratuita guardaroba](https://github.com/socialluca89-byte/word/blob/e4b9d2d3c3928426f352f18d1e60c2a926058eb3/docs/review/wardrobe-preview-390.png)

Le prime due illustrano la riorganizzazione già rilasciata; la terza riguarda work e non prova che sia live.

## Test e pubblicazione

Blocco funzionale: tutte le verifiche API e 17 suite browser distinte PASS locali (ux, learning, resume, presence, pwa, rewards, motion, access, email, performance, navigation, autonomy, review, wardrobe, parent-summary, characters, school). Testano anche rete interrotta, risposte perse/ritardate, secondo dispositivo, isolamento, gratuità e conservazione delle funzioni. Fallimenti e correzioni registrati in NIGHT_PROGRESS.md; nessun retry o test disattivato per nasconderli.

Diagnostica nuova: PHP lint, shell syntax, protocollo/fixtures/fake SSH e invariabilità del database/configurazione PASS; bundle pubblico verificato invariato. Test iniziale passphrase errata in attesa corretto con timeout/cleanup, poi suite PASS. Test applicativi già passati non ripetuti: nessun codice del gioco modificato in questa preparazione. Nessuna nuova CI remota, diagnostica reale, email o pubblicazione.

Ultima release live verificata: 22f2d6028b87c0ae22029eaa211c148a7964ef69, run https://github.com/socialluca89-byte/word/actions/runs/40127589132. Main 77e071ca24438881121786d0d1cd80d90a71ea99: verify/browser PASS ma deploy fallito, rollback a 22f2d60 verificato. I nuovi incrementi restano work.

## Tre impedimenti residui e autorizzazioni minime

1. **Pubblicazione / anti-bot.** Il run40128858645 ricevette HTML sgcaptcha su health; oggi curl e Chromium del cloud hanno restituito 200 JSON, senza prova della causa della differenza. Servono regola/motivo e percorso supportato del provider, quindi CI e veri live check. Il coordinatore deve autorizzare esplicitamente l’eventuale contatto SiteGround su WordyLand; nessun ticket aperto. Nessuna autorizzazione a disabilitare protezioni o ritentare un deploy.
2. **Email.** Stato pubblico false; trasporto PHP mail previsto, configurazione reale/mittente/consegna non noti. La diagnostica restituisce solo stati, non credenziali né indirizzi. Prima occorrono esecuzione autorizzata nel contesto esistente e conferma del provider; poi consenso distinto per un messaggio innocuo all’adulto e successiva attivazione solo dopo ricezione verificata. Non servono password SMTP per il codice attuale; non sono stati attivati servizi.
3. **Luca.** Esistenza/ruolo/file reali ancora da verificare. Serve autorizzare ed eseguire solo la nuova diagnostica minima tramite un percorso autenticato disponibile, senza riutilizzare implicitamente il workflow multi-runner. Se il file esiste, il proprietario usa personalmente il link privato. Solo se l’account è già admin e il file manca, serve conferma specifica per generare nuovo recupero: invalida il vecchio codice e revoca sessioni, conserva password/ruolo/progressi/premi finché il proprietario non sceglie la nuova password. Nessun reset o codice reale generato.

La diagnostica e il template di runner singolo sono descritti in [READ_ONLY_READINESS.md](READ_ONLY_READINESS.md). Il template è inattivo; installarlo in main non è autorizzato e attiverebbe la pipeline ordinaria attualmente sospesa. Non sono state introdotte nuove credenziali, permessi o vie per superare il blocco. Le azioni esterne restano in attesa dell’utente; nessuna promessa di lavoro autonomo dopo la chiusura del lotto.

## Incremento successivo del 25 ottobre, ancora non live

Vedi [LETTER_COMPOSITION_REVIEW.md](LETTER_COMPOSITION_REVIEW.md): composizione delle lettere nelle missioni corretta da tastiera, testo/spazi accessibili, focus visibile su telefono e guardie di affidabilità. Confronto prima/dopo e nuove prove di annullamento, Indietro/Avanti, doppio click e risposta persa. Questo incremento non cambia l’ultimo live verificato e non sblocca automaticamente hosting, email o recupero proprietario.
