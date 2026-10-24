# Consegna al bot — miglioramenti WordyLand

Richiesta: lavorare autonomamente durante la prossima notte per migliorare il gioco di inglese per una classe di bambini di 6–7 anni. Questa consegna non equivale all’avvio di un’attività in background.

Preparata: 2026-10-24 20:39 CEST. Orizzonte richiesto: prossima notte, rapporto entro 2026-10-25 07:00 CET. Non aggiungere esecuzioni giornaliere ricorrenti senza una nuova richiesta. Se ricevi questa consegna dopo la scadenza, usa la notte successiva e dichiaralo nel rapporto iniziale.

## Progetto e stato da preservare

Repository: socialluca89-byte/word. Produzione: main. Lavoro: work. Leggi AGENTS.md e docs/DEPLOYMENT.md e confronta il remoto prima di modificare file; non assumere che il commit iniziale sia ancora quello attuale. Baseline alla consegna: a7514b0, con logout visibile, recupero tramite codice e cambio password già pubblicati e verificati. La PWA è già installabile; non ricrearla da zero.

Il gioco comprende tredici schede didattiche, preposizioni visive, missioni, sfide a turni kart/calcio/spazio, sei personaggi e 48 premi. Gli ultimi 22 premi comprendono tre distintivi ottenuti automaticamente. Mantieni le funzioni esistenti e la coerenza fra gioco ospite e account.

La classe iniziale comprende gli alunni iscritti tramite il link condiviso. Il link li iscrive automaticamente alla stessa classe; ogni bambino deve avere il proprio soprannome/account. Gli ospiti restano locali e non si possono ricostruire retroattivamente come iscritti. Il proprietario ha configurato l’account amministratore luca@perrone.it. Conoscere o scrivere un’email non concede privilegi: non promuovere altri account e non esporre dati dei minori nei log o nelle PR.

## Come lavorare

Fai un audit mirato, scegli gli interventi con il maggiore beneficio e realizza piccoli lotti completi e verificabili. Non passare la notte soltanto a generare proposte o a rilanciare test già passati senza motivo. Dopo ogni lotto registra problema, correzione, evidenza e stato. Continua con il successivo finché il tempo disponibile e le capacità della sessione lo consentono; non simulare operatività continuativa se l’esecuzione finisce prima.

Usa eventuali agenti paralleli per parti indipendenti, con responsabilità esplicite sui file e un unico integratore. L’utente ha richiesto la delega; questo non autorizza ad avviare processi non tracciati, disattivare protezioni o usare credenziali non configurate.

## Priorità immediata aggiornata: recupero proprietario

Il coordinatore dot ha preso in carico il task esistente. Il proprietario segnala di non avere i dati di accesso di luca@perrone.it. Prima di qualunque reset reale occorre conferma specifica: nessuna generazione automatica di credenziali o modifica dei privilegi. Verificare soltanto quell’account e la presenza del file privato di attivazione, senza leggerne i segreti né consultare dati degli alunni. Il nuovo flusso email è documentato in ACCOUNT_RECOVERY.md; l’invio resta disattivato finché non configurato e verificato. Vedi NIGHT_PROGRESS.md per risultati e limiti effettivi.

## Priorità 1: apprendimento coerente

Verifica la differenza tra le statistiche del browser e il conteggio practice.good sul server: nel browser una risposta dopo errore/aiuto non vale come successo autonomo, mentre il server può incrementare good dopo la correzione. Definisci e implementa una distinzione coerente fra tentativi, correzioni, aiuti e risposte autonome, preservando i premi per l’impegno. Il conteggio degli XP non deve essere presentato come prova di padronanza.

Aggiungi regressioni per errore→correzione, aiuto→corretto, risposta autonoma, riapertura e secondo dispositivo. Non fidarti del browser per assegnare saldi o privilegi. Conserva i dati precedenti con migrazioni additive quando servono.

## Priorità 2: esercizi adatti a 6–7 anni

Evita che la difficoltà dipenda soltanto dalla posizione della domanda nella missione. Valuta un percorso da ascolto e scelta di figure, a lettere, parole brevi e infine frasi. Mantieni la possibilità di riprovare, X chiara con spiegazione precisa e feedback positivo quando la risposta è corretta. Non usare timer obbligatori o penalità per gli aiuti.

Verifica la qualità delle spiegazioni, il significato delle figure e delle preposizioni, plurali e dialoghi. Usa nomi inventati nei contenuti condivisi. Non copiare dati personali dalle foto originarie. Voce del dispositivo e ripasso offline devono restare utilizzabili anche quando l’audio non è disponibile.

## Priorità 3: UX e affidabilità

Prova la navigazione come bambino e come adulto: primo accesso dal link della classe, profilo selezionato, iscritti/online, inviti, pausa/ripresa, personaggi/premi, logout, recupero e cambio password. I testi degli esercizi devono restare grandi e leggibili; la domanda e Ascolta devono essere raggiungibili, con quattro scelte compatte su telefono.

Controlla 320/360/390px, tablet e desktop, tastiera virtuale, frasi lunghe, movimento ridotto e connessione interrotta. Evita regressioni nella modalità concentrata e nelle scene finali. Mantieni distinta la vista amministratore dalla vista classe e dalla modalità ospite.

Ottimizza carichi e aggiornamenti solo dopo una misura o una prova ripetibile: caricamento delle scene quando necessario, query raggruppate e assenza di aggiornamenti che cancellino una risposta o una selezione. Non introdurre raccolta di dati ospite o strumenti pubblicitari.

## Controlli e ambiente

In questo workspace PHP con SQLite è disponibile tramite PATH=/workspace/.wordyland-env/bin:$PATH. Playwright può essere selezionato con WORDYLAND_PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright e WORDYLAND_CHROMIUM=/usr/bin/chromium. Verifica questi percorsi nella nuova sessione, non assumerli universali.

Dopo modifiche JS/CSS esegui node scripts/version-assets.mjs. Esegui tutti i controlli del job verify e i browser pertinenti del runner scripts/test-browser.sh. Le suite disponibili sono ux, learning, resume, presence, community, characters, rewards, school, pwa, motion e access. Il runner usa server, sessioni e database fittizi e li rimuove alla fine.

Non modificare file che un test in corso sta ancora leggendo. In particolare, non generare gli asset mentre il test di deploy confronta il bundle e non cambiare il runner shell mentre è in esecuzione. Non usare i dati degli iscritti reali nei test.

## Pubblicazione e confini

L’utente ha già autorizzato la pubblicazione dei miglioramenti mirati del sito. Usa Git normale e la pipeline esistente, senza force push. Pubblica soltanto lotti completi che superano entrambe le suite e conferma il vero deploy e i controlli online. Un rifacimento esteso o un nuovo servizio esterno deve restare una proposta/PR concreta se richiede accessi o decisioni non già forniti.

Non sostituire il deploy con ZIP, cron o upload manuali. La cache dinamica SiteGround resta attiva; la pipeline la invalida tramite il client privato già configurato. Se l’hosting restituisce una verifica anti-bot, riportala e mantieni i controlli rigorosi. Non aggirarla, non disattivare le protezioni e non dichiarare il sito aggiornato dopo un deploy fallito. La pipeline annota il marker del server e conferma il ripristino in caso di errore.

Non leggere né stampare chiavi private, password, recovery code, link privati di attivazione o link reali delle classi. Il recupero password attuale usa un codice; non dichiarare che vengano inviate email. Nuovi servizi email richiedono una configurazione reale e una verifica concordata.

## Rapporto al termine

Consegna un riepilogo in italiano con interventi completati, test ed evidenze, commit/PR, stato reale della pubblicazione, problemi aperti e prossimi tre interventi. Se manca una capacità o un accesso, documenta il blocco e prosegui il lavoro indipendente che rimane possibile. Distingui sempre proposte, codice pronto e modifiche effettivamente online.
