# Piano WordyLand — stato verificabile

L’utente ha confermato il piano e richiesto l’aggiornamento quando tutti i punti saranno sviluppati. Non dichiarare «tutto completato» se restano dipendenze bloccate. Non avviare attività sulla richiesta separata Caffè Oro: non fa parte di questo task.

Vincolo: nessuna funzione rimossa o resa irraggiungibile. La home può soltanto riorganizzare e raggruppare quanto esiste. Vedi NAVIGATION_INVENTORY.md e regressioni navigation/access/community/school.

Stato di riferimento: release live verificata `22f2d6028b87c0ae22029eaa211c148a7964ef69`, run https://github.com/socialluca89-byte/word/actions/runs/40127589132, conclusione SUCCESS e vero passo deploy/live-check success. Include gli aiuti e i conteggi di 6161ca7. Il precedente run 40126383092 era fallito e non aveva eseguito il deploy; non viene considerato una pubblicazione riuscita.

| Punto concordato | Sviluppato | Testato | Pubblicato / dipendenza |
| --- | --- | --- | --- |
| Accesso, logout, cambio password e recupero | Flussi codice/password esistenti; alternativa email predisposta | API/browser sintetici PASS | Codice/password live; email non attivata, servono trasporto/mittente e consegna verificati |
| Recupero proprietario Luca | Diagnostica CLI privata e probe di sola lettura pronti | Solo database fittizio PASS | Stato reale non verificato: serve dispatch autenticato del probe o controllo personale su SiteGround; nessun reset automatico |
| Home chiara, progressi e mobile | Tre destinazioni principali, ripresa e proposta di missione conservate | Quattro larghezze, screenshot, raggiungibilità principali PASS | Live 52122a9; nessuna funzione eliminata |
| Varietà e ripasso guidato | Otto luoghi, tre sfide, temi didattici esistenti; nuova memoria aiuti e distinzione risposte autonome/corrette con aiuto | API/browser e CI PASS per aiuti/conteggi; ripasso degli errori recenti in verifica separata | Giochi, aiuti e conteggi live in 22f2d60; priorità degli errori recenti ancora su work |
| Avatar e premi non punitivi | Sei personaggi, 48 premi; aiuti gratuiti e regole XP/monete conservate | Characters/rewards/learning PASS | Funzioni esistenti live |
| Area adulto/docente e classe privata | Classi, iscritti/presenza, amministrazione, segnalazioni e classifica privata esistenti | API/browser con utenti fittizi PASS | Live; accesso proprietario effettivo dipende dal suo recupero |
| Accessibilità e velocità | Testi grandi, audio su richiesta, spiegazioni errori, movimento ridotto; mappa caricata su richiesta | UX/learning/motion/performance PASS locali | Live in 22f2d60, incluse notifiche ospite identiche senza ricostruzione delle scene |
| Web app e offline | Installazione, aggiornamenti e ripasso offline pubblico | PWA/learning PASS | Live; API e dati account non vengono messi nella cache offline |

## Sequenza successiva

1. Mantenere la diagnosi per suite senza retry o test disattivati. Il run successivo al fallimento è riuscito con nuovo codice; non è stata provata la causa del precedente fallimento isolato.
2. Raggiungibilità delle voci di servizio e relativi ingressi protetti verificata, insieme a tutte le sei modalità classiche su quattro larghezze; mantenere questa copertura prima di altre riorganizzazioni.
3. Verificare e pubblicare il ripasso degli errori recenti, già riprodotto/corretto su work, preservando il credito storico e l’ordine delle missioni esistenti.
4. Mantenere il recupero reale separato: nessun bootstrap, password nuova o nuovo servizio senza i requisiti già indicati.

Le anteprime consultabili via GitHub sono in docs/review, con dati ospite fittizi. Non trattare i percorsi locali della sessione come link condivisibili. Non è disponibile uno strumento Library/upload in questo ambiente.
