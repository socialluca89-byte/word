# Grafica e gioco: verifica del lotto

Base: rilascio1537a74, run41637701431. Questo documento descrive il candidato alla redazione, non anticipa il risultato della pubblicazione. La pipeline deve verificare il commit finale prima di distribuire i file.

## Skill e risultato

Applicate frontend-design di Anthropic e web-design-guidelines di Vercel, già presenti nel progetto. Installata webapp-testing dalla fonte ufficiale Anthropic, con licenza, commit fissato e hash originali/installati. Nessun installer, servizio o dipendenza dell'applicazione aggiunto. La sola normalizzazione locale della guida rimuove uno spazio finale e viene dichiarata in UPSTREAM.json.

Il layout dell'allenamento raccoglie immagine, parola e azione in uno spazio illustrato coerente. Nel modello, l'azione principale precede gli strumenti audio; nelle domande, l'audio resta prima delle risposte. Pausa, lettura, ascolto, stop e aiuto rimangono disponibili. Il richiamo d'ascolto non rivela la grafia prima dell'aiuto confermato.

| Viewport | Azione prima, alto–basso | Azione dopo, alto–basso | Immagine / parola dopo |
| --- | --- | --- | --- |
| 320×844 | 916–999px | 604–687px | 174px / 34px |
| 390×844 | 916–972px | 575–631px | 174px / 34px |
| 1360×900 | 667–726px | 593–649px | 180px / 46px |

La categoria attiva del guardaroba è visibile già all'apertura; tutte le dodici categorie rimangono raggiungibili senza spostare focus o scroll verticale. La home conserva l'isola e tutti i sette ingressi nella prima schermata mobile.

Ogni mondo giocabile mostra obiettivo e tre scoperte derivati dallo stesso controller della partita. Reset, replay e cambio renderer non inventano avanzamenti. Nell'oceano restano i tre set esistenti. Le informazioni duplicate vengono eliminate dalla sola presentazione; controlli e feedback restano disponibili. Il nuovo pannello non aggiunge regioni live.

Nel kart il ritratto realmente equipaggiato, corona e distintivo compongono il pilota in primo piano. Il trascinamento orizzontale sceglie la corsia; Guida conferma. Rimangono pulsanti e tastiera. Scorrimento verticale, annullamento, uscita prima della cattura, cambio renderer e pausa non lasciano gesti pendenti; la conferma intermedia conserva il focus.

## Verifiche e confini

Le nuove suite `visual-journey` e `kart-pilot` usano solo fixture locali sintetiche e sono passate sul candidato. Restano obbligatorie tutte le59suite precedenti: matrice totale61, gruppi31+30, stessi timeout e asserzioni. I47controlli verify e i54file applicativi/47statici rimangono, senza aggiungere skill o documenti al pacchetto pubblico.

La revisione indipendente di training/guardaroba non rileva nuovi blocchi. Sedici funzioni di memoria, aiuti e API dell'allenamento restano identiche alla base. Le prove mirate foundations e training-memory passano con i nuovi raggruppamenti DOM, inclusi cambio profilo, errori di salvataggio, pausa e ripresa. La review del kart ha individuato due difetti di gesture/focus, poi corretti e coperti dalla nuova suite. Le attese finite della harness non sostituiscono le asserzioni di completamento.

Collaudo locale concluso sul pacchetto congelato: tutti i47verify, inclusi isolamento API e deploy simulato;15suite browser pertinenti PASS (`visual-journey`, `wardrobe-layout`, `learning-experience`, `training`, `foundations`, `training-memory`, `kart-pilot`, `performance`, `engine-lazy`, `world-driving`, `illustrated-actions`, `appearance-consistency`, `classic-illustrated`, `world-play`, `motion`). La performance è stata eseguita una sola volta, isolata dalle altre prove: load556ms locale, limite5s invariato; nessun WebGL prima della richiesta della scena. Versionamento idempotente e tutti i54hash del pacchetto invariati durante le prove finali. Questo pass mirato locale non viene presentato come l'intera matrice61: quella resta obbligatoria in CI prima del deploy.

L'audio usa le capacità già presenti: le voci sintetiche dei test non attestano la qualità delle voci sul dispositivo. Nessuna prova su tablet originale o screen reader reale, nessun nuovo asset generato e nessuna promessa di fotorealismo o grafica3D aggiuntiva. Nessuna modifica a backend, account, permessi, punti o premi. Il Grinch e le verifiche reali di account/email/hosting restano separati.

Pubblicazione solo tramite workflow ordinario autorizzato: verify,61browser, preflight intatto, deploy e controlli live sul commit esatto. Nessuna nuova sonda per superare il precedente403 cloud, identità alternativa o modifica delle protezioni.
