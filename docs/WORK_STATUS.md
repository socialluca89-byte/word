# Stato unico WordyLand

Questo documento distingue codice preparato, collaudo e pubblicazione. Le note datate in altri documenti restano cronologia.

Base pubblicata verificata alla redazione del candidato: `53cc376ad1509be716d36c0365d6b86973f3f19b`, [run41621446398](https://github.com/socialluca89-byte/word/actions/runs/41621446398),47verify/58browser/deploy riusciti il3novembre alle10:57:16UTC. La base precedente b23e98a resta l’origine del confronto dell’audit. Ultimo controllo cloud extra health403: nessuna nuova sonda o identità alternativa in questo lotto.

Richiesta corrente: «ok risolvi tutto», riferita all’analisi `/workspace/wordyland-analysis-2026-11-03/ANALISI.md`. Tutte le funzionalità precedenti restano raggiungibili, account/progressi/premi conservati.

| Lotto | Stato del codice | Prova/criterio |
| --- | --- | --- |
| Elenco giocatori e feedback Unicode | Pubblicato in53cc376; prove specifiche PASS | Feste/Allenamento/fonetica con risposte reali, start/modelli esclusi, isolamento, paginazione e confini Unicode |
| Recupero assistito e gestione inviti | Pubblicato in53cc376; prove specifiche PASS | Gestore autorizzato, token privato monouso/scadenza/revoca, nessuna mutazione all’emissione, credenziali e sessioni aggiornate solo alla conferma finale; vecchi iscritti conservati |
| Navigazione bambini e dettato | Pubblicato in53cc376; prove specifiche PASS | Dettato entro due azioni, portali vicini, tutti i percorsi, focus/48px,320/390/1360 |
| Ripresa feste e ponte ripasso | Pubblicato in53cc376; prove specifiche PASS | Sessioni entro stagione, date server di completamento, badge distinti e transazioni; segnali spelling separati da XP/aiuti |
| Classroom e nuove basi finite | Pubblicato in53cc376; prove specifiche PASS | 12 oggetti originali distinti, numeri11–20,12frasi/8consegne con API/UI effettive e contenuti curati |
| Motore leggero e mondo pilota | Pubblicato in53cc376; prove specifiche PASS | Three.js su richiesta, dispose/fallback/switch, tre set oceano riusabili senza premi dalle sole azioni |
| Diagnostica e ripristino dati | Pubblicato in53cc376; prove specifiche PASS | Correlazione privata senza dati personali, backup/restore solo su fixture sintetiche; copertura hosting reale resta da verificare |
| Consegna degli asset e regressione cumulativa | Pubblicato in53cc376; bundle54 verificato | Allowlist/hash/MIME aggiornati, suite obbligatorie complete, versioni e pubblicazione distinte |

Dipendenze che il software non dimostra da solo: voci e fonemi affidabili sul dispositivo, stato reale Luca/email, appartenenza reale Best2, backup hosting reale e tablet originale. Non si attivano servizi, invii email, reset, chiavi o permessi reali per inferenza. I nuovi flussi vengono costruiti e provati su dati sintetici.

Grinch: preparazione API locale5119ce1, ritratto bloccato da precedente output moderation categoriaother senza motivo specifico disponibile. Nessun nuovo tentativo, immagine alternativa o personaggio sostitutivo; non è incluso automaticamente nel nuovo catalogo.

## Collaudo e pubblicazione

Il primo giro cumulativo ha passato tutti i 47 gruppi verify, ma ha riprodotto regressioni di home mobile, consiglio a16px, feedback che sconfinava di0,109px e scelta3D fuori viewport. Questi difetti sono stati corretti e le relative suite originali sono passate senza indebolire le asserzioni. Il solo messaggio di recupero conserva anche la spiegazione sui progressi separati; access PASS. Log falliti e correzioni restano nel registro di lavoro.

La pipeline corrente richiede **47 gruppi verify e 59 suite browser**, nei due gruppi completi30+29. Il nuovo candidato è congelato per questa verifica: le prove specifiche non vengono presentate come un pass cumulativo. Le date di completamento festive sono server-side, gli archivi ospite delle nuove attività sono additivi e il backup privato è stato revisionato indipendentemente. [Mappa delle modifiche e limiti](RESOLUTION_2026_11_03.md).

**Stato alla redazione: il pacchetto principale53cc376 è pubblicato; resta il follow-up di memoria dell’aiuto/importazione, sviluppato e testato localmente, la cui pubblicazione deve ancora essere confermata.** Per la versione effettiva leggere il commit del deploy riuscito nella [pipeline ufficiale di main](https://github.com/socialluca89-byte/word/actions?query=branch%3Amain). Un run sul ramo di verifica non pubblica; push, suite locali o job deploy saltato non sono prove di pubblicazione. Il coordinatore registra il run terminale e il controllo live dopo il rilascio; questa fotografia versionata non preannuncia quell'esito.

La precedente risposta403 del controllo cloud extra non viene aggirata o riprovata. L'eventuale rilascio usa soltanto la pipeline ordinaria autorizzata, con preflight intatto; un nuovo challenge interrompe il deploy senza identità alternative o modifiche alle protezioni.

## Follow-up finale: memoria dei piccoli passi

La review indipendente ha individuato e l’autore ha riprodotto due P2: reimportazione di una preview V1 dopo la retention dei completamenti e modello letto non persistito come aiuto prima di pausa/reload. Corretti con marcatori additivi nel solo archivio ospite ActivitiesV1, esclusione del resume legacy delle attività migrate e conferma server/locale dell’aiuto prima di mostrare la risposta. Uno stamp cambiato in un’altra scheda richiede ricarica, senza copiare uno snapshot vecchio. Nessuna cache di token privati, nuovo endpoint o cambio di punteggi/storici.

La nuova suite `training-memory` passa10casi; training, spelling, learning-experience e learning-entry passano. Review statica indipendente senza ulteriori blocchi nei due rami. I controlli completi59 del nuovo commit e il successivo esito deploy restano obbligatori; il successo precedente58 non li sostituisce.

La verifica prestazioni del follow-up finale passa in una sola esecuzione isolata (load532ms locale, soglia5s invariata), tutti54file congelati invariati. Questa misura non valida il tablet reale.

## Ripresa della pubblicazione: controllo foundations

Il run [41625323778](https://github.com/socialluca89-byte/word/actions/runs/41625323778), commit123219a3, ha passato verify e il gruppo browser dei mondi, ma è fallito in foundations:28: il test cercava «Guardiamo insieme» nel pannello degli indizi che viene intenzionalmente nascosto quando il modello completo è già visibile. Deploy saltato, nessun problema di hosting dimostrato da questo fallimento.

Il comportamento è stato riprodotto localmente. La correzione riguarda soltanto le asserzioni foundations dei richiami in lettura: controllano parola completa visibile, pannello duplicato nascosto, stesso token/passo/piano, aiuto2 ed errore conservati, contatori invariati attraverso aiuto/pausa/ricarica. Il controllo recognize sul pannello degli indizi resta intatto. Foundations passa; review indipendente conferma che non sono stati indeboliti i controlli. Tutti i54file dell’applicazione restano identici a123219a3: le due protezioni della memoria non sono state modificate. Il nuovo commit richiede ancora47verify,59browser e deploy verificato; nessun risultato precedente sostituisce l’esito finale.
