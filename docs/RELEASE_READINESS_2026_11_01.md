# Pacchetto pronto e limite di pubblicazione — 1 novembre 2026

## Versioni e stato

- Codice applicativo integrato e sottoposto alla verifica cumulativa locale: `c56b45abe45332a9099a6554856a5fcddaf7c4cb`, ramo work. Comprende le correzioni account/classe/UX di main `f1c537a778ac29ead8a262867f4254ec7b561bde`, senza sovrascriverle.
- Il run di main [41115583749](https://github.com/socialluca89-byte/word/actions/runs/41115583749) ha superato verify e browser, ma il deploy si è fermato al preflight pubblico. Nessuna pubblicazione di quel commit è dimostrata.
- Ultimo rilascio riuscito documentato: `e6f2a75e011de048aa458fe27d72dff4da5c87ee`, [run 41092906001](https://github.com/socialluca89-byte/word/actions/runs/41092906001). Non si attribuisce questa versione al sito attuale senza una nuova verifica, ora impedita dal 403.
- Nessun push su main, nuovo tentativo di deploy, modifica hosting o messaggio all'assistenza è stato effettuato in questo lotto.

## Contenuto sviluppato, ancora non pubblicato

1. Dettato Classroom con le 12 parole della scheda: pencil, pen, book, eraser, scissors, glue stick, crayons, notebook, sharpener, marker, bookbag, desk. Composizione con spazio, riconoscimento, scrittura con aiuti graduali e ripasso; catalogo iniziale esteso a 43 parole in 7 percorsi senza rimuovere i precedenti.
2. Villaggi stagionali con calendario server Europe/Rome: Natale dal 1 novembre al 7 gennaio incluso; altre finestre per Carnevale, Pasqua e Halloween. Sfide di tre esercizi e premi persistenti, senza monete/XP aggiuntivi o classifiche della difficoltà.
3. Natale: 27 ricompense guadagnabili, tra cui 12 personaggi giocabili. Accessori e personaggi richiedono esercizi confermati dal server; errori e aiuti non penalizzano. Nessun obbligo di giorni consecutivi. I premi già ottenuti restano dopo la chiusura.
4. Birillo, elfo degli scherzi, dall’8 dicembre al 7 gennaio: cinque piccoli giochi reversibili, facoltativi, separati dai crediti della missione.
5. Passaporto delle scoperte annuale: tre esercizi al giorno, ripresa delle missioni interrotte, 12 premi e due personaggi. Prima raccolta finita di 90 esercizi; nessuna promessa di contenuti infiniti già prodotti.
6. Skill grafica ufficiale frontend-design installata nel progetto, sorgente fissata e licenza conservata. Revisione dei pannelli festivi: scena 3D, testi grandi, azione principale prima della raccolta espandibile, tastiera e focus visibile. Tutte le destinazioni precedenti conservate.

Le API e gli acquisti ordinari impediscono di equipaggiare premi stagionali non guadagnati. Date, grant e replay sono verificati con fixture sintetiche: nessun account reale, spostamento di alunni, reset o modifica di permessi.

## Blocco verificato

Le richieste ordinarie a `https://wordyland.eu/api.php?action=health` e `https://wordyland.eu/.wordyland-managed` restituiscono HTTP 403. La risposta health osservata è HTML generico di 52 byte, `403 - Forbidden | Access to this page is forbidden.`, header server `envoy`. Questa sola risposta non prova quale componente abbia negato l'accesso.

Il [job deploy precedente](https://github.com/socialluca89-byte/word/actions/runs/41115583749/job/124271888217) contiene invece annotazioni esplicite:

> Stage public-health-preflight exited with status 1
>
> Public health preflight failed; no SSH connection, upload, install or cache purge was attempted.
>
> SiteGround anti-bot verification intercepted the health endpoint (HTML instead of JSON).

Non si tratta di una prova che il sito sia indisponibile ai visitatori. Non sono stati cambiati IP/identità, ignorati CAPTCHA, disattivate protezioni o saltati controlli. Le connessioni già configurate non vengono richieste nuovamente.

## Richiesta tecnica pronta, non inviata

Destinatario: supporto SiteGround dell'account WordyLand, esclusivamente wordyland.eu.

«Il normale deploy GitHub Actions di wordyland.eu richiede che GET HTTPS `/api.php?action=health` restituisca il JSON applicativo. Nel run 41115583749 del 30 ottobre il preflight ha ricevuto HTML anti-bot e ha interrotto tutto prima di SSH o caricamenti. Ora il normale controllo cloud restituisce 403; anche `/.wordyland-managed` è negato. Potete verificare i log e indicare/ripristinare un percorso supportato per questi controlli legittimi, mantenendo le protezioni? Non chiediamo di disattivare WAF, TLS o anti-bot. Riferimento: https://github.com/socialluca89-byte/word/actions/runs/41115583749/job/124271888217 .»

Solo dopo la risoluzione verificabile: riconciliare di nuovo i rami, CI sul commit esatto, normale workflow main e confronto live. Nessuna pubblicazione manuale alternativa.

## Verifiche e limiti

Esito cumulativo locale: **35 comandi verify e tutte le 34 suite browser passati**, senza eliminazioni o retry automatici. [Rapporto riproducibile con comandi, durate e limiti](LOCAL_VERIFICATION_2026_11_01.json). Sono state corrette due aspettative storiche dei test: acquisto dei soli 19 accessori a prezzo, separati dai nuovi premi guadagnabili; conteggio dei percorsi aggiornato da sei a sette con controllo esplicito del dettato. Solo queste suite sono state rieseguite dopo le rispettive correzioni; il codice applicativo è rimasto byte-identico. Non si tratta di un singolo run CI verde. Ambiente locale Chromium 154; la CI resta fissata a Playwright 1.62.1 / Chromium 151. I test locali non equivalgono a CI o deploy riusciti.

Le suite browser completate richiedono complessivamente 663.44 secondi locali: il vecchio budget di otto minuti era insufficiente. Il gruppo ha ora un limite di quindici minuti, il job di quaranta, senza cambiare i limiti dei singoli test o la copertura. La prossima pubblicazione richiede comunque la CI sul commit esatto.

Restano da validare audio e dispositivi fisici, consegna email reale e collegamento verificato genitore–bambino con account separati. Il materiale iniziale e il primo modulo fonetico non costituiscono un curriculum Cambridge completo. Il tablet vecchio rimane rinviato. Anteprime sintetiche e decisioni grafiche: [piano visivo](VISUAL_DESIGN_2026_11_01.md) e [galleria](review/README.md).
