# WordyLand: grafica, gioco e chiarezza

Base: `6445b4b`, con 35 controlli e 44 suite browser superati. Il nuovo lavoro mantiene ogni funzione e i dati esistenti. Pubblico: bambini di 6–7 anni, con gestione separata per adulti. La pubblicazione resta distinta dal lavoro locale e dal blocco SiteGround documentato.

## Direzione prima del codice

L'illustrazione deve essere un ingresso vero nel gioco. Il bambino tocca un mondo e arriva alla scena e ai suoi comandi, senza attraversare il passaporto e l'intero catalogo. Dopo una scoperta, la prossima azione è visibile. L'errore indica cosa è stato scelto e mostra il modello corretto, senza voti o penalità aggiuntive.

Colori: carta `#fffdf6`, inchiostro `#163b50`, cielo `#cdeffe`, foglia `#1b765f`, sole `#f4c65b`, corallo `#ee806c`. Restano Outfit per titoli e DM Sans per istruzioni, con fallback locali leggibili; nessun nuovo servizio font. Testi esercizi grandi e controlli almeno 48px. La scena originale è il punto memorabile; gli altri elementi aiutano a scegliere e agire.

Home desktop:

```
[titolo e istruzione breve]
[illustrazione cliccabile originale     ] [Allenati]
[stesso mondo delle schede             ] [Classe]
[                                     ] [Personaggi]
[missione, ripresa e percorsi esistenti raggiungibili]
```

Home telefono: titolo, scena compatta e tre entrate leggibili; i comandi adulti restano raggiungibili. Luogo selezionato: intestazione con Cambia mondo, scena, obiettivo e scelte; descrizione, traguardi e personalizzazioni restano disponibili. Niente contenuti o premi eliminati.

## Critica del piano

La baseline ripete molte schede prima di mostrare un'immagine: sulla home da 390px non si vede il mondo. Dopo il clic su Oceano la scena inizia a 1422px; dopo Allenati la prima attività a 968px; la continuazione dopo 3 scoperte a 1043px, tutti fuori dal viewport 844px. Aggiungere altre decorazioni non correggerebbe questi gesti. Si usano le illustrazioni originali e si correggono ordine, focus e destinazione dello scroll. La struttura resta specifica di un gioco illustrato, senza trasformarsi in un catalogo amministrativo.

## Lotto finito

1. Home illustrata e azionabile, con le tre entrate esistenti; tutti i percorsi conservati.
2. Ingressi a esercizi e mondi nel punto realmente utile; ritorno all'elenco; seguito del minigioco visibile.
3. Feedback Allenamento con segni grandi, confronto reale e modello; gestione del parlato su cambio domanda, pausa e uscita.
4. Atlanti lossless con pixel invariati; lavoro grafico differito fuori vista. Baseline misurata: 1.459.253 byte risparmiabili nei due atlanti, 409.472 byte di circuiti evitabili con pratica chiusa, 1 contesto GL e 128 draw iniziali evitabili nel preview fuori vista.

Le misure sono locali, con renderer software; non simulano il tablet originale. Le attività gratuite non assegnano monete; aiuti, errori, progressi e premi dei percorsi conservano le regole già esistenti. Prove solo sintetiche, nessun account reale, invio email o modifica hosting. Confronto visivo e regressioni mobile/desktop prima della consegna; niente garanzia di perfezione universale.

## Critica durante il collaudo

La prima composizione spingeva il terzo ingresso fuori dalla schermata da 320px: corretta con testi più brevi e scena compatta, mantenendo i caratteri e i bersagli grandi. La regressione `navigation` originale ora conferma tutte e tre le scelte interamente visibili a 320/390/768/1360px. Il controllo nuovo `child-experience` richiede anch’esso questa proprietà.

La selezione sbagliata dell’Allenamento ereditava testo bianco su fondo chiaro: corretta e verificata con contrasto almeno 4,5. L’illustrazione della home conserva le proporzioni invece di stirare un’intera cella quadrata nel banner. La posa finale davanti al tesoro lascia libera la didascalia; raccolta e ripetizione restano testate.

Due precondizioni delle vecchie prove grafiche sono state rese esplicite: verificare la nuova posa di vittoria alla terza scoperta, con forziere aperto e nessuna copertura; portare l’anteprima in vista e leggere la scena del suo canvas dopo il vero rendering, invece dell’ultima scena globale. Tutte le verifiche di costi, 19 accessori, persistenza e isolamento restano. I fallimenti intermedi sono conservati nei log della sessione.

La matrice ha individuato una regressione del nuovo feedback: dopo due errori le alternative passavano correttamente da quattro a due, ma si perdeva il messaggio che spiegava l’aiuto. È stato ripristinato nel prodotto insieme al confronto scelto/modello; il test originale `letter-progression` è rimasto invariato ed è passato. Questa correzione è l’unico cambiamento applicativo dopo la prima parte della verifica; i risultati locali riportano quale digest hanno esercitato.

Le prove di elfo e premi rivelano ora il pannello prima di verificare il suo canvas: nessuna geometria, costo o condizione del calendario è stata esclusa. Il test del vecchio ingresso dell’hero usa il proprio contenitore per distinguerlo dal nuovo ingresso illustrato, verificato separatamente. Nessun retry automatico o soglia aumentata.

La prima CI del nuovo lotto (`41475582231`, commit `f5e5460`) ha passato verify ma fallito la visibilità dei tre ingressi a 320px. La causa è stata riprodotta localmente confrontando i font di ripiego e gli originali DM Sans/Outfit: il pulsante Password dimenticata passava su una riga separata, aumentando la barra account da 73,5 a 129,5px. Il terzo ingresso scendeva da y810,94 a y866,94, oltre gli 844px disponibili. La barra ospite mobile usa ora due colonne esplicite: il testo può andare a capo dentro il pulsante, mantenendo font e bersagli da almeno 48px. Entrambi gli stati dei font mantengono la barra a 73,5px e il terzo ingresso a y810,94. Conferma anche a 390/768/1360px. Non sono state tolte azioni o indicazioni di accesso.

La diagnosi ha usato copie temporanee dei font dal repository ufficiale Google Fonts, soltanto in una fixture locale: nessun nuovo font, servizio o pacchetto è stato aggiunto al prodotto. La regressione ora aspetta il font realmente pronto e registra le misure prima dell’assert, mantenendone la condizione originale. La nuova CI deve ripetere l’intera matrice; il run fallito resta documentato e non conta come successo.

[Copertura e misure](GAME_UPGRADE_VERIFICATION_2026_11_02.json). Il collaudo locale usa due browser isolati e la misura di prestazioni separata a CPU tranquilla; non viene presentato come una matrice unica se i digest differiscono. La CI del commit esatto ripete tutti i 35 controlli e le 46 suite browser in sequenza, con gli stessi limiti temporali. Le misure sintetiche non certificano il tablet originale, la pronuncia reale o l’invio di email.


## Verifica delle scene dopo la seconda CI

Il run `41477888499` ha passato verify e le prime dieci suite browser, inclusa la home a 320px con il font reale. La successiva prova dei personaggi natalizi usava ancora l’ultima scena globale registrata a DOMContentLoaded, senza collegarla al canvas della schermata. È stata sostituita da una spia installata prima dell’app, associata al canvas che ha effettivamente disegnato la scena; la prova porta prima in vista l’anteprima o la missione. Non si attribuisce al rendering fuori vista la causa CI specifica senza una misura che lo dimostri.

Lo stesso problema di identificazione è stato corretto nelle prove di guardaroba, collezioni e villaggio. Tutte e quattro sono passate localmente: nove famiglie natalizie, trenta risposte confermate, ventisette scene con personaggi conquistati, accessori sui sei avatar, sessanta esercizi del percorso permanente, calendario, persistenza, saldi e isolamento restano verificati. Solo i test cambiano dopo `96b4afd`; il digest applicativo resta `32dd087e87fdf2022269a1dba12d7eaf3cf8bc1bf1ababe50b0f03f641914275`. Il nuovo commit deve comunque superare tutta la CI.
