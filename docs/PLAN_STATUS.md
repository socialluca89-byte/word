# Piano WordyLand — stato verificabile

L’utente ha confermato il piano e richiesto l’aggiornamento quando tutti i punti saranno sviluppati. Non dichiarare «tutto completato» se restano dipendenze bloccate. Non avviare attività sulla richiesta separata Caffè Oro: non fa parte di questo task.

Vincolo: nessuna funzione rimossa o resa irraggiungibile. La home può soltanto riorganizzare e raggruppare quanto esiste. Vedi NAVIGATION_INVENTORY.md e regressioni navigation/access/community/school.

Stato di riferimento: ultima release live verificata `52122a9`, run 40124834427. Il commit `6161ca7` è su main ma il run 40126383092 è fallito nel job browser, quindi non è pubblicato sul sito.

| Punto concordato | Sviluppato | Testato | Pubblicato / dipendenza |
| --- | --- | --- | --- |
| Accesso, logout, cambio password e recupero | Flussi codice/password esistenti; alternativa email predisposta | API/browser sintetici PASS | Codice/password live; email non attivata, servono trasporto/mittente e consegna verificati |
| Recupero proprietario Luca | Diagnostica CLI privata e probe di sola lettura pronti | Solo database fittizio PASS | Stato reale non verificato: serve dispatch autenticato del probe o controllo personale su SiteGround; nessun reset automatico |
| Home chiara, progressi e mobile | Tre destinazioni principali, ripresa e proposta di missione conservate | Quattro larghezze, screenshot, raggiungibilità principali PASS | Live 52122a9; nessuna funzione eliminata |
| Varietà e ripasso guidato | Otto luoghi, tre sfide, temi didattici esistenti; nuova memoria aiuti e distinzione risposte autonome/corrette con aiuto | Locali API/browser PASS; CI del nuovo blocco da risolvere | Giochi live; nuovo conteggio/aiuti 6161ca7 ancora non live |
| Avatar e premi non punitivi | Sei personaggi, 48 premi; aiuti gratuiti e regole XP/monete conservate | Characters/rewards/learning PASS | Funzioni esistenti live |
| Area adulto/docente e classe privata | Classi, iscritti/presenza, amministrazione, segnalazioni e classifica privata esistenti | API/browser con utenti fittizi PASS | Live; accesso proprietario effettivo dipende dal suo recupero |
| Accessibilità e velocità | Testi grandi, audio su richiesta, spiegazioni errori, movimento ridotto; mappa caricata su richiesta | UX/learning/motion/performance PASS locali | Base live; ottimizzazione notifiche ospite identiche in verifica su work |
| Web app e offline | Installazione, aggiornamenti e ripasso offline pubblico | PWA/learning PASS | Live; API e dati account non vengono messi nella cache offline |

## Sequenza successiva

1. Risolvere il blocco CI con diagnosi della singola suite, senza retry o test disattivati; verificare il vero deploy prima di aggiornare lo stato live.
2. Raggiungibilità delle voci di servizio e relativi ingressi protetti verificata, insieme a tutte le sei modalità classiche su quattro larghezze; mantenere questa copertura prima di altre riorganizzazioni.
3. Valutare un ripasso più aderente agli errori recenti, preservando il credito storico e le funzioni esistenti.
4. Mantenere il recupero reale separato: nessun bootstrap, password nuova o nuovo servizio senza i requisiti già indicati.

Le anteprime consultabili via GitHub sono in docs/review, con dati ospite fittizi. Non trattare i percorsi locali della sessione come link condivisibili. Non è disponibile uno strumento Library/upload in questo ambiente.
