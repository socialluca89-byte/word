# Stato unico WordyLand

Questo documento distingue codice preparato, collaudo e pubblicazione. Le note datate in altri documenti restano cronologia.

Base pubblicata verificata alla redazione del candidato: `b23e98a74fcccfbb16cf88dd7161b92740a342db`, run41534729291,39verify/54browser/deploy riusciti. Ultimo controllo cloud extra health403: nessuna nuova sonda o identità alternativa in questo lotto.

Richiesta corrente: «ok risolvi tutto», riferita all’analisi `/workspace/wordyland-analysis-2026-11-03/ANALISI.md`. Tutte le funzionalità precedenti restano raggiungibili, account/progressi/premi conservati.

| Lotto | Stato del codice | Prova/criterio |
| --- | --- | --- |
| Elenco giocatori e feedback Unicode | Implementato; prove specifiche PASS | Feste/Allenamento/fonetica con risposte reali, start/modelli esclusi, isolamento, paginazione e confini Unicode |
| Recupero assistito e gestione inviti | Implementato; prove specifiche PASS | Gestore autorizzato, token privato monouso/scadenza/revoca, nessuna mutazione all’emissione, credenziali e sessioni aggiornate solo alla conferma finale; vecchi iscritti conservati |
| Navigazione bambini e dettato | Implementato; prove specifiche PASS | Dettato entro due azioni, portali vicini, tutti i percorsi, focus/48px,320/390/1360 |
| Ripresa feste e ponte ripasso | Implementato; prove specifiche PASS | Sessioni entro stagione, date server di completamento, badge distinti e transazioni; segnali spelling separati da XP/aiuti |
| Classroom e nuove basi finite | Implementato; prove specifiche PASS | 12 oggetti originali distinti, numeri11–20,12frasi/8consegne con API/UI effettive e contenuti curati |
| Motore leggero e mondo pilota | Implementato; prove specifiche PASS | Three.js su richiesta, dispose/fallback/switch, tre set oceano riusabili senza premi dalle sole azioni |
| Diagnostica e ripristino dati | Implementato; prove specifiche PASS | Correlazione privata senza dati personali, backup/restore solo su fixture sintetiche; copertura hosting reale resta da verificare |
| Consegna degli asset e regressione cumulativa | Integrato; bundle54 e versionamento idempotente PASS | Allowlist/hash/MIME aggiornati, suite obbligatorie complete, versioni e pubblicazione distinte |

Dipendenze che il software non dimostra da solo: voci e fonemi affidabili sul dispositivo, stato reale Luca/email, appartenenza reale Best2, backup hosting reale e tablet originale. Non si attivano servizi, invii email, reset, chiavi o permessi reali per inferenza. I nuovi flussi vengono costruiti e provati su dati sintetici.

Grinch: preparazione API locale5119ce1, ritratto bloccato da precedente output moderation categoriaother senza motivo specifico disponibile. Nessun nuovo tentativo, immagine alternativa o personaggio sostitutivo; non è incluso automaticamente nel nuovo catalogo.

## Collaudo e pubblicazione

Il primo giro cumulativo ha passato tutti i 47 gruppi verify, ma ha riprodotto regressioni di home mobile, consiglio a16px, feedback che sconfinava di0,109px e scelta3D fuori viewport. Questi difetti sono stati corretti e le relative suite originali sono passate senza indebolire le asserzioni. Il solo messaggio di recupero conserva anche la spiegazione sui progressi separati; access PASS. Log falliti e correzioni restano nel registro di lavoro.

La pipeline corrente richiede **47 gruppi verify e 58 suite browser**, nei due gruppi completi30+28. Il nuovo candidato è congelato per questa verifica: le prove specifiche non vengono presentate come un pass cumulativo. Le date di completamento festive sono server-side, gli archivi ospite delle nuove attività sono additivi e il backup privato è stato revisionato indipendentemente. [Mappa delle modifiche e limiti](RESOLUTION_2026_11_03.md).

**Stato alla redazione: candidato sviluppato, pubblicazione ancora da confermare.** Per la versione effettiva leggere il commit del deploy riuscito nella [pipeline ufficiale di main](https://github.com/socialluca89-byte/word/actions?query=branch%3Amain). Un run sul ramo di verifica non pubblica; push, suite locali o job deploy saltato non sono prove di pubblicazione. Il coordinatore registra il run terminale e il controllo live dopo il rilascio; questa fotografia versionata non preannuncia quell'esito.

La precedente risposta403 del controllo cloud extra non viene aggirata o riprovata. L'eventuale rilascio usa soltanto la pipeline ordinaria autorizzata, con preflight intatto; un nuovo challenge interrompe il deploy senza identità alternative o modifiche alle protezioni.
