# Lotto 25 ottobre — lettere utilizzabili da tastiera e ripresa affidabile

Ambito: laboratorio delle lettere nelle missioni, preservando contenuti, metodi di risposta, aiuti, premi e tutte le destinazioni. Nessuna modifica PHP/database, accessi, posta o hosting. Non è una riprogettazione dei giochi classici e non dichiara pubblicato il codice.

## Problema e confronto prima/dopo

Fixture ospite sulla seconda domanda di una missione del corpo, parola eye. Prima della correzione, Invio su una tessera distruggeva tutti i pulsanti della banca con innerHTML: il focus tornava al body. Il nuovo test falliva esattamente su «Choosing a letter must keep keyboard focus on an available tile or Check» (actual false). Dopo la correzione l’asserzione passa.

| Interazione | Prima | Dopo verificato |
| --- | --- | --- |
| Scegliere una lettera da tastiera | Focus perso dopo la selezione | Focus sulla prossima tessera disponibile; sull’ultima passa a Controlla |
| Avvio della composizione | Prima casella vuota raggiungibile | Prima tessera utilizzabile focalizzata, caselle vuote disabilitate |
| Correzione | Ricostruzione dell’intera banca | Togli la lettera dalla casella, focus sulla tessera liberata; banca con nodi stabili |
| Comprensione dello stato | Caselle e simbolo di spazio senza nomi specifici | Gruppi nominati, lettere/spazi e caselle descritti, conteggio parlato e visibile |
| Conferma su telefono piccolo | Non coperta dal vecchio controllo | Controlla focalizzato e visibile anche dopo una frase lunga a 320px |

Le guardie contro tessera duplicata e modifiche durante il salvataggio sono verificate dal nuovo test. Non si afferma che ciascun caso fosse già stato riprodotto nel vecchio browser: la regressione prima/dopo documentata è la perdita del focus, insieme alla ricostruzione dei nodi osservabile nel codice.

## Anteprime

Entrambe mostrano la stessa fase (una tessera scelta), con soli dati ospite fittizi. Le lettere restano mischiate dal gioco; il confronto riguarda focus, caselle e chiarezza, non la correttezza della risposta.

- [Prima, 390px](review/tiles-before-390.png)
- [Dopo, 390px](review/tiles-after-390.png)

Caselle piene e vuote hanno aspetti distinti. Le lettere confermate mantengono il riempimento anche quando i comandi vengono disabilitati dopo il successo. Nessuna animazione nuova o audio automatico; testi/touch target esistenti grandi conservati.

## Verifiche del lotto

`scripts/test-tiles-browser.cjs` usa un server/SQLite temporanei e verifica:

- tastiera, annullamento di una lettera e ritorno alla tessera, lettere ripetute/spazi, caselle vuote non tabbabili, focus finale e aspetto della parola confermata;
- doppio click sul vecchio riferimento alla tessera senza duplicati;
- 320/390/768/1360px, nessun overflow e target almeno 44px; frase lunga con Controlla visibile a 320px;
- Pausa → personaggi → Indietro/Avanti → ripresa: rimane la prima domanda non confermata, progressi già confermati conservati;
- profilo adulto fittizio e scheda personale; nel solo SQLite temporaneo il tipo casuale della seconda domanda viene fissato a build per rendere la prova deterministica;
- doppio Controlla con risposta server trattenuta: una richiesta, composizione immutata mentre salva; risposta committata poi persa, Riprendi riapre la domanda successiva senza duplicare la risposta.

Estesa anche presence browser: Annulla invito con doppio click invia una sola richiesta, entrambi i profili fittizi vedono l’annullamento e monete/XP restano invariati. È copertura aggiuntiva, non una nuova funzione o modifica al codice delle sfide.

La ripresa conserva le risposte confermate. Le tessere non ancora confermate non sono una nuova bozza persistente: resta il comportamento precedente, senza promettere salvataggi aggiuntivi. Non usati account/dati reali né inviati messaggi o email. Risultati finali delle regressioni in NIGHT_PROGRESS.md.

## Stato consegna

Solo work, non main e non live. Ultima release live verificata rimane 22f2d6028b87c0ae22029eaa211c148a7964ef69. Restano gli impedimenti hosting, email reale e account proprietario descritti in FINAL_HANDOFF.md; nessun nuovo tentativo remoto. La nuova suite tiles è aggiunta al futuro job browser, senza retry o aumento dei timeout esistenti.
