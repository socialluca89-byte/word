# Piano WordyLand — stato verificabile

L’utente ha confermato il piano e richiesto l’aggiornamento quando tutti i punti saranno sviluppati. Non dichiarare «tutto completato» se restano dipendenze bloccate. Non avviare attività sulla richiesta separata Caffè Oro: non fa parte di questo task.

Vincolo: nessuna funzione rimossa o resa irraggiungibile. La home può soltanto riorganizzare e raggruppare quanto esiste. Vedi NAVIGATION_INVENTORY.md e regressioni navigation/access/community/school.

Stato di riferimento: release live verificata `22f2d6028b87c0ae22029eaa211c148a7964ef69`, run https://github.com/socialluca89-byte/word/actions/runs/40127589132, conclusione SUCCESS e vero passo deploy/live-check success. Include gli aiuti e i conteggi di 6161ca7. Il precedente run 40126383092 era fallito e non aveva eseguito il deploy; non viene considerato una pubblicazione riuscita.

| Punto concordato | Sviluppato | Testato | Pubblicato / dipendenza |
| --- | --- | --- | --- |
| Accesso, logout, cambio password e recupero | Flussi codice/password esistenti; alternativa email predisposta | API/browser sintetici PASS | Codice/password live; email non attivata, servono trasporto/mittente e consegna verificati |
| Recupero proprietario Luca | Diagnostica/probe pronti; procedura assistita CLI preparata con conferma esplicita, mai automatica | Solo database fittizio PASS, inclusi rollback e conservazione di profili/premi | Stato reale non verificato: serve dispatch autenticato del probe o controllo personale su SiteGround; nessun reset automatico |
| Home chiara, progressi e mobile | Tre destinazioni principali, ripresa e proposta di missione conservate | Quattro larghezze, screenshot, raggiungibilità principali PASS | Live 52122a9; nessuna funzione eliminata |
| Varietà e ripasso guidato | Otto luoghi, tre sfide, temi didattici esistenti; nuova memoria aiuti e distinzione risposte autonome/corrette con aiuto | API/browser e CI PASS per aiuti/conteggi e ripasso recente; vedi esito deploy distinto | Giochi, aiuti e conteggi live in 22f2d60; ripasso recente 77e071c testato, deploy bloccato da anti-bot e ripristinato a 22f2d60 |
| Avatar e premi non punitivi | Sei personaggi, 48 premi; anteprime gratuite anche degli oggetti non posseduti, focus tastiera conservato | Wardrobe/characters/rewards/learning PASS locali, con quattro viewport | Funzioni esistenti live; nuove anteprime su work, non pubblicate |
| Area adulto/docente e classe privata | Strumenti esistenti conservati; aggiunto riepilogo delle missioni dei soli profili del proprio account | API parent-summary e browser sintetici PASS: autorizzazioni, sola lettura, cambio profilo, offline e bozze conservate | Area esistente live; nuovo riepilogo su work. Accesso proprietario effettivo ancora dipendente dal recupero |
| Accessibilità e velocità | Testi grandi, audio su richiesta, spiegazioni errori, movimento ridotto; mappa caricata su richiesta; su work font facoltativi dopo il caricamento e comandi guardaroba più grandi | UX/learning/motion/performance PASS locali, anche con font remoto trattenuto | Live in 22f2d60, incluse notifiche ospite identiche senza ricostruzione delle scene |
| Web app e offline | Installazione, aggiornamenti e ripasso offline pubblico | PWA/learning PASS | Live; API e dati account non vengono messi nella cache offline |
| Qualità didattica delle alternative | Espressioni equivalenti non usate come risposte sbagliate; entrambe le forme conservate | Statici, API e regressione completa con school PASS locali | Pronto su work; non pubblicato finché il blocco hosting non è chiarito |

## Sequenza successiva

1. Mantenere la diagnosi per suite senza retry o test disattivati. Il run successivo al fallimento è riuscito con nuovo codice; non è stata provata la causa del precedente fallimento isolato.
2. Raggiungibilità delle voci di servizio e relativi ingressi protetti verificata, insieme a tutte le sei modalità classiche su quattro larghezze; mantenere questa copertura prima di altre riorganizzazioni.
3. Ripasso recente già testato in 77e071c; pubblicazione bloccata dall’health intercettato da SiteGround. Non allentare i controlli o tentare di aggirare la protezione. Ripristino a 22f2d60 verificato; serve chiarire il blocco dell’hosting prima di riprovare.
4. Mantenere il recupero reale separato: nessun bootstrap, password nuova o nuovo servizio senza i requisiti già indicati.

Le anteprime consultabili via GitHub sono in docs/review, con dati ospite fittizi. Non trattare i percorsi locali della sessione come link condivisibili. Non è disponibile uno strumento Library/upload in questo ambiente.

## Incremento successivo su work

Anteprime e riepilogo sono sviluppati e testati localmente; tutte le API e 17 suite browser distinte sono PASS nel blocco 11 di NIGHT_PROGRESS.md. Corrette anche dipendenza bloccante dai font e notifica obsoleta dopo un salvataggio confermato. La nuova CI remota non è ancora stata eseguita. Nessun nuovo accesso ai dati dei compagni: il riepilogo richiede adulto/admin e proprietà del profilo anche per l’amministratore globale. Gli strumenti docente esistenti non sono stati sostituiti.

Restano parziali la verifica su telefoni fisici e il recupero reale del proprietario. Restano bloccati consegna email e pubblicazione per le dipendenze indicate. Non è corretto dichiarare tutti i punti completati o questi incrementi live.

## Diagnosi conclusiva delle dipendenze

Vedi [DELIVERY_READINESS.md](DELIVERY_READINESS.md): richieste health e limiti dei log storici, HTTP 200 attuale da curl/Chromium attraverso la rete configurata, prova locale dei controlli complementari di integrità, requisiti esatti PHP mail senza richiesta di password SMTP, probe proprietario già in main e conseguenze da autorizzare solo dopo l’esito reale. Include matrice sintetica dei cinque punti e testo unico da sottoporre a SiteGround; nessun contatto o invio è stato eseguito automaticamente.

Audit successivo del probe: [READ_ONLY_PROBE_AUDIT.md](READ_ONLY_PROBE_AUDIT.md). Il workflow completo non è limitato ai tre booleani: include altri metadati e runner di crosscheck. Nessun dispatch eseguito con il nuovo vincolo; account e configurazione email reale restano non verificati. Nessun ticket aperto.

## Chiusura del lotto preparato

Consegna dei cinque punti, anteprime, test e impedimenti residui in [FINAL_HANDOFF.md](FINAL_HANDOFF.md). Diagnostica minimale indipendente pronta e testata con dati fittizi in [READ_ONLY_READINESS.md](READ_ONLY_READINESS.md); restituisce tre booleani e soli stati mail. Nessuna esecuzione reale. Template single-runner fuori da .github/workflows, inattivo; nessuna registrazione o deploy. Le azioni esterne restano in attesa dell’utente, senza estendere il piano.
