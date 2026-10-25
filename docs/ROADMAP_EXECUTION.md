# Esecuzione roadmap — 25 ottobre 2026

Avviata dopo il consenso dell'utente a procedere dal punto1 ai successivi. Tutto il lavoro nuovo resta su work; nessun rilascio o operazione su account reali. I test locali non sostituiscono le verifiche hosting/audio/dispositivi. L'ordine dei blocchi esterni resta prioritario; attività indipendenti possono proseguire senza far finta che i blocchi siano risolti.

| Punto della consegna all'utente | Risultato effettivo | Da completare / dipendenza |
| --- | --- | --- |
| 1 Affidabilità/tablet | Corretto e provato fallback mappa:0→8 luoghi senza WebGL; observer/animazioni facoltativi; avviso di avvio indipendente. Diagnosi HTTP/HTTPS già documentata | SiteGround: spiegare/correggere risposte di verifica sul percorso legittimo; certificato/HTTPS Enforce da verificare. Android/browser e prova tablet mancanti. Non chiamarlo risolto |
| 2 Account | Recupero email, recupero proprietario e diagnostica minima già predisposti; verifiche sintetiche e di privacy. Nessun reset/provisioning reale | Accesso autenticato autorizzato al contesto WordyLand, stato reale Luca; consegna email/mittente e attivazione da verificare. Nessuna chiave/password in chat |
| 3 Allenamento/Spelling | Primo modulo precedente conservato; esteso a13 blocchi/26 lettere con presentazione graduale, Y/Z riprendibile; zero nuovi punti/monete o adesivi duplicati | Audio sul dispositivo e rilascio controllato; non è curriculum completo. Espansioni di lessico/fonemi richiedono set revisionati e audio affidabile |
| 4 Classe/sfide | Regressioni di iscrizione, link, roster privato/online, inviti/annullamento, sfida chiusa/riaperta con domanda/punti e secondo dispositivo | Prova pilota sul sito dopo sblocco; verificare segnalazioni d'uso senza spostamenti automatici o lettura alunni |
| 5 Dinamismo/UX | Conservati mondi e feedback; aggiunta resa leggera navigabile. Navigazione4viewport e preferenze movimento testate | Iterazioni visive su evidenze del pilota, baseline su dispositivi reali. Non aggiunte animazioni decorative indiscriminate |
| 6 Premi/area adulti | Guardaroba,48 premi esistenti, adesivi finiti e riepiloghi privati conservati; regressioni su dati sintetici | Nuovi accessori solo con valore verificato; collegamento genitore–iscrizione autonoma non esiste automaticamente e richiede verifica del rapporto/permessi |
| 7 Web app | PWA esistente verificata: installazione, aggiornamento in attesa, cache privata esclusa, ripasso offline precedente | Allenamento offline non implementato: richiede progetto di coda/sincronizzazione/privacy. Nessuna app nativa promessa |
| 8 Prestazioni/manutenzione | Confronti dei contesti WebGL, asset aggiornati, bundle controllato, nuova suite compatibility nella CI preparata | Nessuna CI/deploy/live-check nuovo; misurazione rete/dispositivo e prove di ripristino reali solo quando prerequisiti hosting pronti |

Per il dettaglio test per lotto vedere COMPATIBILITY_REVIEW.md e NIGHT_PROGRESS.md, non sommare vecchie suite e chiamarle tutte eseguite sull'ultimo commit. Le verifiche sintetiche non confermano consegna email, pronuncia o stato account del proprietario.

Prossima azione esterna concreta: ottenere versione Android/browser (domanda già inviata) e far verificare dal corretto contesto SiteGround i riscontri pubblici del25ottobre. Non è una richiesta di riconfermare il piano; mancano informazioni/accessi tecnici che il codice locale non può sostituire. Il coordinatore gestisce il contatto hosting già autorizzato: nessun ticket duplicato.
