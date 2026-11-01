# Correzioni dei percorsi effettivamente usati

La verifica del precedente rilascio copriva le nuove scene e i loro asset, ma non il percorso separato del Box di allenamento classico. Una pagina raggiungibile e un'immagine corretta non dimostrano che ogni ingresso mantenga la stessa esperienza.

## Difetti riprodotti e correzioni

1. Il Box di allenamento mostrava sei belle schede da race-circuits.webp, poi passava alla vecchia schermata. Ora lo stesso file e la stessa cella della scheda compaiono nell'esercizio, con il personaggio effettivamente equipaggiato. Le sei modalità, le domande, i progressi e le ricompense precedenti restano invariati. L'avatar emoji resta solo come fallback quando la scena non è disponibile.
2. Su mobile, premere Giochiamo avviava la domanda a y891.59 in una finestra alta844: il risultato restava fuori dallo schermo. Ora il pulsante porta alla domanda e sposta il focus sul contenitore del gioco, senza aprire automaticamente la tastiera.
3. Nelle scene illustrate, Tira in porta/Lancia il razzo e le altre dimostrazioni mostravano un messaggio e un saltello del ritratto. Ora otto azioni creano oggetti visibili con movimento su gesto e risultato leggibile: pallone, kart, razzo, luci, pittura, cuori, dinosauro e forziere. Movimento ridotto e pausa conservano il risultato visibile senza animazione. Le dimostrazioni non avanzano il minigioco, non attribuiscono premi e non scrivono API.
4. I bersagli iniziali non coprono più la faccia del personaggio; la nuova suite controlla geometricamente tutti gli otto mondi. Dopo una scelta il personaggio raggiunge l’oggetto trovato, che scompare lasciando visibile il ritratto.
5. Il replay cancella il risultato visivo precedente e i timer: il forziere torna chiuso finché non si ritrovano i tre oggetti. Ogni scena elimina effetti e controlli quando viene smontata.

## Verifiche

Due nuove suite usano il default illustrato reale, senza la preferenza3D usata dalle regressioni dei modelli classici:

- classic-illustrated: ingresso dal box, sei schede e celle originali, sei modalità, avvio mobile realmente visibile senza auto-scroll del test, errore/corretta, avanzamento, cambio mondo e chiusura senza perdita della domanda, avatar posseduto e corona distinti da anteprima temporanea, saldo,380/390/desktop.
- illustrated-actions: otto oggetti, vere animazioni, esito finale, tocco, click ravvicinati senza accumulo, colori, forziere3/3 e replay, movimento ridotto/pausa, pulizia e assenza di POST. Anche i pulsanti reali delle scene calcio/spazio sono verificati nella pagina locale completa.

Revisione statica indipendente su lifecycle, equipaggiamento, punteggi, privacy e input. Fixture esclusivamente sintetiche. Nessuna modifica a account, classi, API, permessi, dati reali, cataloghi o impostazioni hosting. Nessuna nuova dipendenza o immagine; si riusano le illustrazioni già pubblicate.

La verifica completa e la pubblicazione vanno riferite al relativo commit/run, non dedotte dal solo pass di queste suite. Audio reale e tablet originale restano verifiche distinte.

## Integrazione del build verificata

Il primo workflow main21f8a3f ha passato verify, ma la suite nuova classic-illustrated ha fermato il deploy: il generatore URL modificava anche un identificatore privo di versione. Il sito precedente è rimasto attivo. Il generatore ora cambia esclusivamente il registro degli URL; gli identificatori restano stabili. Due generazioni consecutive producono file identici e la suite classica passa dopo la generazione effettiva. La CI completa del commit corretto resta il criterio per la pubblicazione, senza saltare o indebolire il test che ha trovato il problema.
