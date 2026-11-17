# Verifica delle tre correzioni UI

Fonte applicativa precedente:8de8e233f5a4f0c2ee5295552d5f9d89cf714d79, pubblicata dal run43609838612. Il candidato conserva il commitccd78a4 che installa Taste Skill, senza copiare risorse della skill nel pacchetto pubblico. Perimetro approvato: TASTE_UI_SCOPE_2026_11_17.md.

## Risultato sviluppato

- Il feedback grammaticale vuoto non mostra più bordo, sfondo, ombra o padding. La regione accessibile resta `role=status`, `aria-live=polite`, `display:flex`; errore e successo popolati recuperano la presentazione e i controlli originali.
- Le quattro modalità grammaticali attive usano la stessa scena focalizzata delle parole. Menu, pausa, completamento e uscita ripristinano la corretta navigazione. Una chiusura tardiva non sovrascrive un’altra missione o un duello già attivo.
- La home mantiene tutte le entrate e le illustrazioni, con superfici secondarie più quiete, bordi da1px e ombre alleggerite. Testo, font, ordine, significato dei colori e dimensioni accessibili rimangono.

PHP, JSON didattici, cataloghi, immagini, codice di account/classi, archivi e regole di premi/economia sono invariati. Cambiano soltanto3file prodotto (`grammar.js`, `pwa.css`, `quests.css`) e4file generati dalle versioni degli asset (`index.html`, `offline.html`, `pwa.js`, `sw.js`). Le verifiche confrontano tutti59file congelati con i rispettivi hash.

## Prove locali completate

54gruppi obbligatori `verify`: PASS, incluso deploy/rollback simulato. Nuova suite `taste-ui`: PASS;13suite preesistenti pertinenti: PASS (`grammar-aids`, `grammar`, `best2-materials`, `learning-entry`, `interaction-focus`, `learning-experience`, `training`, `training-memory`, `visual-journey`, `class-program`, `journey-navigation`, `navigation`, `ux`). Prestazioni eseguite da sole: PASS. Sono15suite browser locali complessive; il candidato richiede tutte67suite in CI, senza rimuovere le66precedenti o cambiare le loro soglie.

La nuova regressione verifica9destinazioni, tastiera/focus/contrasto, quattro larghezze320/390/768/1360, stress CSS zoom200%, feedback vuoto/popolato,12passi reali con modello/scelta/composizione/scrittura, doppio clic, annulla, pausa/ripresa/ritorno/completamento, navigazione hash/indietro e cancellazione audio. Nessun POST account e soltanto dati sintetici. La regione live è verificata nel DOM: non è una prova di annunci di uno screen reader fisico.

Confronto omogeneo prima/dopo, con gli stessi stati della home e del percorso number/pencil: altezza del feedback vuoto34px su320/390 e40px su768/1360 →0px; regione viva e feedback popolato conservati. Home nascosta soltanto durante l’esercizio attivo, ripristinata tornando ai menu. Nessun overflow orizzontale nelle quattro larghezze. Sei catture finali comparabili, oltre alle immagini aggiuntive Best2, archiviate nel workspace con metriche e log separati.

Prestazioni locali sulla medesima macchina: baseline653,3ms, candidato446,1ms, con soglia5secondi invariata e nessun altro browser in esecuzione. Sono misure indicative di due esecuzioni isolate: non dimostrano un guadagno percentuale ripetibile o la compatibilità del tablet fisico. Nessun font, shader o pacchetto runtime aggiunto.

Revisione statica indipendente: PASS sui lifecycle e sui CSS. La prima esecuzione della nuova suite è passata; il test finale aggiunge lo stress CSS zoom200%. Per rendere il confronto visivo omogeneo sono state ricatturate le immagini con lo stesso percorso/stato e senza anelli di focus/hover soltanto nelle immagini della home; i controlli di focus restano nel test.

## Fonte aggiuntiva indicata dall’utente

L’utente ha fornito `https://mondoskills.it/categoria/giochi-e-3d/`. Il tentativo di lettura restituisce HTTP403 dall’ambiente disponibile; i diagnostici conservati non ne identificano la causa. Nessun nuovo tentativo dopo il403, cambio di identità, aggiramento o installazione da contenuti non letti. Taste Skill e le altre skill già presenti coprono questo lotto.

## Pubblicazione e limiti

Stato alla redazione: sviluppato e collaudato localmente, non ancora dichiarato online. Il normale workflow deve superare54verify,67browser e il deploy sul commit esatto, con marker/health/51file statici/MIME/homepage e cache verificati. Nessuna sonda supplementare di produzione. Audio, tablet e screen reader reali restano verifiche umane separate; nessun account, classe, consenso, email o protezione hosting è stato modificato dagli strumenti.
