# Mondi da giocare — progetto del lotto

Richiesta: la scena è bella ma il bambino deve poter fare qualcosa. Pubblico6–7 anni. Si usa la skill frontend-design già installata, senza nuovi pacchetti o servizi.

## Piano grafico e di interazione prima della modifica

La scena3D resta il giocattolo principale. Sotto di essa un solo obiettivo alla volta, tre comandi grandi e il progresso reale del piccolo gioco. Gli stessi oggetti si possono toccare nella scena: i pulsanti sono un percorso equivalente da tastiera o senza WebGL. Nessun trascinamento obbligatorio, cronometro o velocità richiesta.

Palette coerente con WordyLand: neve `#f2f8fb`, inchiostro `#193e55`, abete `#22654f`, sole `#ffd36e`, rosso `#da6279`, blu `#629dcd`. Outfit per titoli/azioni, DM Sans per istruzioni. Istruzioni22px, comandi18px con altezza minima56px. Colore sempre accompagnato da parola/icona; il successo ha testo e segno, non solo colore.

```
[         oggetti nella scena3D        ]
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
