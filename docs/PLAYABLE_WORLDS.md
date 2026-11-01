# Mondi da giocare — progetto del lotto

Richiesta: la scena è bella ma il bambino deve poter fare qualcosa. Pubblico 6–7 anni. Si usa la skill frontend-design già installata, senza nuovi pacchetti o servizi.

## Piano grafico e di interazione prima della modifica

La scena 3D resta il giocattolo principale. Sotto di essa un solo obiettivo alla volta, tre comandi grandi e il progresso reale del piccolo gioco. Gli stessi oggetti si possono toccare nella scena: i pulsanti sono un percorso equivalente da tastiera o senza WebGL. Nessun trascinamento obbligatorio, cronometro o velocità richiesta.

Palette coerente con WordyLand: neve `#f2f8fb`, inchiostro `#193e55`, abete `#22654f`, sole `#ffd36e`, rosso `#da6279`, blu `#629dcd`. Outfit per titoli/azioni, DM Sans per istruzioni. Istruzioni 22px, comandi 18px con altezza minima 56px. Colore sempre accompagnato da parola/icona; il successo ha testo e segno, non solo colore.

```
[         oggetti nella scena 3D        ]
[obiettivo inglese con aiuto italiano]
[oggetto A] [oggetto B] [oggetto C]
[scoperte 0/3 · messaggio chiaro]
[rigioca al termine] [missione in inglese esistente]
```

Critica: aggiungere altre otto animazioni di risposta ripeterebbe il limite segnalato. Ogni mondo deve invece chiedere tre azioni distinguibili, cambiare gli oggetti visibili e arrivare a un completamento verificabile. I pulsanti non assegnano monete: gli esercizi e i premi già esistenti conservano le loro regole. La prima versione è una miniattività guidata per mondo, non un simulatore di guida/calcio con fisica completa.

## Otto miniattività previste

- Casa: accendere tre luci scegliendo i colori richiesti.
- Animali: trovare acqua, cibo e amicizia per il compagno.
- Atelier: scegliere i colori e trasformare la scena.
- Kart: raggiungere tre segnali del percorso, muovendo davvero il kart.
- Calcio: mirare a tre bersagli colorati; il pallone segue la direzione scelta.
- Spazio: trovare stella, luna e pianeta, con spostamento del razzo.
- Oceano: raccogliere conchiglia, pesce e perla e aprire il tesoro.
- Dinosauri: cercare uovo, foglia e impronta e completare la scoperta.

Progressi di questo gioco libero solo nella scena aperta; uscendo o rigiocando si ricomincia. Non si importa né si altera lo storico degli esercizi. Azioni ripetute su oggetti già trovati non incrementano il progresso. Nessuna scrittura API, nuova valuta o premio fittizio. Pausa e movimento ridotto restano rispettati; con WebGL assente si gioca con gli stessi comandi e obiettivi, dichiarando la modalità semplificata.

Lotto isolato nel ramo feature/playable-worlds-20261101; candidato eventi precedente c1a13b9 preservato. Nessun deploy o nuova richiesta al sito in questo lotto.


## Implementato e collaudato

Otto attività guidate, tre scoperte ciascuna. I bersagli sono geometria 3D selezionata tramite raycast reale, con comandi equivalenti grandi da tastiera/touch. Ogni oggetto trovato sparisce, non conta due volte e porta alla scoperta successiva; Rigioca ripristina scena e oggetti. Il kart raggiunge il segnale, il pallone viene indirizzato verso il bersaglio e il razzo si sposta verso la scoperta. Alla fine si può aprire l'esercizio dal comando Continua con gli esercizi, attraverso il flusso missione già esistente. Gli altri comandi e tutte le destinazioni restano presenti.

Il tesoro richiede i tre oggetti del gioco; il comando Esplora il tesoro invita a cercarli invece di promettere un'apertura anticipata. La modalità semplificata e la perdita del contesto WebGL mantengono gli stessi obiettivi e comandi. Il replay con movimento ridotto riporta anche il razzo a terra.

Questa versione non offre ancora guida analogica libera, una partita di calcio con avversari o navigazione spaziale con fisica. Non vengono dichiarati già sviluppati perché la scena risponde al tocco. Offre piccole attività effettivamente completabili nei mondi, distinte dagli esercizi con ricompense.

## Difetto dei portali riprodotto e corretto

Sequenza riprodotta nel browser: aprire #festivita, selezionare la scheda Missione di oggi e premere il portale del villaggio. L'URL era già #festivita e restava aperto il Passaporto. La stessa situazione riguardava #scoperte. Correzione minima: includere .holidayPortal nel gestore dei collegamenti alla rotta già corrente. La classe comprende anche journeyPortal; la regressione verifica entrambi i percorsi prima dei giochi. Nessun refactor di autorizzazioni o routing delle altre pagine.

## Prove e consegna

La matrice locale completa sul commit dd426ea ha superato 35 controlli e tutte le 35 suite browser in un'unica esecuzione, senza retry o rimozione della copertura precedente; le deadline dei singoli test restano invariate. Il budget complessivo del gruppo,15 minuti, è quello già motivato nel candidato eventi c1a13b9. Include missioni, account/classe, eventi, nuovi personaggi, premi, progressi, materiali, performance, movimento, navigazione, accessibilità da tastiera e offline. La nuova suite verifica otto giochi con tocchi 3D, tastiera e un tap touch, quattro larghezze 320/390/768/1360, errore/doppio input, completamento/replay, spostamento degli attori, ripristino del razzo, ingresso agli esercizi, fallback senza WebGL/perdita contesto e dati economici/didattici invariati senza POST API. Le voci dei dispositivi non sono validate da questi test.

Una rifinitura successiva modifica soltanto i testi del tesoro e gli hash generati, aggiungendo due asserzioni al relativo test; sei verifiche mirate finali tutte passate (sintassi, bundle, PWA e browser world-play/motion/pwa) sul commit da21bae, documentate nel [rapporto](PLAYABLE_WORLDS_VERIFICATION.json). Il backend, gli storici, l'economia e le regole di gioco non cambiano fra i due commit. La strumentazione iniziale del test è stata corretta per acquisire il renderer dell'istanza dopo il rendering differito, e l'asserzione di ingresso verifica la missione già avviata (#readyChallenge), non un pulsante iniziale nascosto: nessuna soglia applicativa indebolita.

Tutto è sul ramo feature/playable-worlds-20261101, derivato dal candidato eventi c1a13b9. Nessun merge/deploy/GET produzione o nuova CI remota da questo lotto. Il candidato comprende entrambi i lavori; occorrono CI sullo SHA finale e un solo rilascio coordinato prima di dichiararlo online.
