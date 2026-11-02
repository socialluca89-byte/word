# Richieste aggiuntive da conservare — 2 novembre 2026

## Grinch: richiesta confermata, ancora da completare

L'utente ricorda espressamente di aver chiesto **il Grinch come personaggio** fra le aggiunte inviate mentre era in corso il lavoro. Il catalogo pubblicato `f99e498b14a0f60f89a0dd35dddf221c884c5566` non contiene il Grinch: questa voce non va dichiarata consegnata.

Integrazione prevista, coerente con i premi natalizi già richiesti: tredicesimo personaggio natalizio, sbloccato da esercizi confermati nel villaggio e utilizzabile dopo la fine dell'evento. Gli altri personaggi, premi e soglie devono restare invariati. La bozza tecnica usa 33 esercizi, id `grinch`, e prepara cataloghi, modello, identità e regressioni di soglia/replay/permanenza.

Il generatore di immagini ha rifiutato il ritratto con controllo di sicurezza sull'output, categoria `other`, senza una spiegazione specifica. Nessun nuovo tentativo, prompt sostitutivo o percorso alternativo è stato usato per aggirare il blocco. Non è disponibile l'immagine definitiva coerente fra anteprima e gioco. La bozza **non è pronta né pubblicata**.

La preparazione è stata archiviata fuori dalla workingtree applicativa in `/workspace/wordyland-release-2026-11-02/grinch-draft/`, con patch applicabile alla base `f99e498`, copie dei file e `status.json`. Il codice dell'applicazione è rimasto sulla versione funzionante. La sola sintassi JS/AST Python e i controlli statici sono passati; test API/browser non eseguiti, per runtime PHP assente e asset non disponibile. Restano inoltre da completare CSS/asset e allowlist di distribuzione, controlli di rendering e collaudo cumulativo prima di un eventuale rilascio.

## Altre aggiunte

L'utente invierà gli altri punti se li ricorda. Non inventarli né considerarli già recuperati. Il registro ricostruito precedente è in `/workspace/wordyland-release-2026-11-02/REGISTRO_CORREZIONI.md`; non è un'esportazione integrale dei messaggi non più visibili nell'interfaccia.

## Sfide per personaggi: più giri nello stesso giorno

Richiesta successiva esplicita: una sola sfida al giorno impedisce di progredire negli sblocchi. Durante l'apertura del villaggio il bambino deve poter avviare altre sfide e conquistare i personaggi con gli esercizi confermati, senza aspettare il giorno successivo.

Implementazione in collaudo: pulsante **Un’altra sfida**, tre prove per giro, avanzamento dei premi a esercizi anche con più giri nella stessa data. I distintivi per giornate diverse rimangono distinti; nessun premio al semplice avvio, doppio accredito o nuova moneta/XP. Il Passaporto annuale conserva il proprio percorso giornaliero. I dati esistenti rimangono validi e il nuovo archivio dei giri è aggiuntivo.

Questo requisito è separato dal ritratto del Grinch ancora bloccato. Le prove locali del singolo modulo non bastano per dichiararlo pubblicato: occorrono il collaudo cumulativo e il normale rilascio verificato.
