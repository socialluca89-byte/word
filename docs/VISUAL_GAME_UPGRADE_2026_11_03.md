# Nuovo intervento grafico e di gioco

Base: main1537a74, rilascio verificato dal run41637701431. Richiesta corrente: cercare/installare skill pertinenti e procedere con migliorie a grafica e gioco. Il nuovo lotto conserva tutte le funzioni, account, progressi, personaggi e premi. Nessuna modifica a ruoli, email, hosting o economia. Il Grinch resta separato e non viene rigenerato.

## Skill applicate

- frontend-design: direzione visiva e gerarchia, già installata dalla fonte ufficiale Anthropic.
- web-design-guidelines: accessibilità e interazione, già installata dalla fonte ufficiale Vercel; regole aggiornate acquisite il3novembre, checksum invariato.
- webapp-testing: aggiunta dal repository ufficiale Anthropic al commit ca45fc496a3436251f191354091d557da31c15b5, con licenza, helper e provenienza verificabile. Le suite di regressione mantengono il Playwright Node fissato del repository e le fixture locali esistenti; si applica il percorso ricognizione→screenshot→azione→verifica. Nessun installer remoto, servizio o nuova dipendenza runtime.

La vecchia posizione develop-web-game non esiste nel catalogo OpenAI corrente; non viene dichiarata installata. L'elenco effettivo è verificato sul repository ufficiale. Il nuovo helper è stato letto per verifica, controllato con --help e parsing; gli hash originali e installati sono in UPSTREAM.json; è documentata la sola rimozione di uno spazio finale nel Markdown.

## Direzione: un piccolo teatro illustrato

Pubblico: bambini di6–7anni, con adulto per gli accessi. Il tratto distintivo sono le illustrazioni già presenti e il personaggio realmente scelto, coerenti fra scheda e gioco. La grafica deve rendere evidente ciò che si può fare.

Palette: inchiostro #193E55, bosco #22654F, mare #168BA5, sole #FFD16A, corallo #E97984, carta #F4FAFC. Colori forti solo sulle azioni e sui segnali di gioco; parola e istruzioni restano su superfici leggibili. Outfit per titoli/parole/comandi, DM Sans per spiegazioni, senza nuovi font o richieste esterne.

Schema scelto:

```text
Home                 Allenamento             Mondo
isola illustrata     ritorno + pausa          illustrazione + pilota
7 ingressi chiari    passo confermato          obiettivo e3scoperte
                     immagine + parola        gesto o pulsanti
                     azione principale        conferma e ripresa
                     strumenti audio          esercizi / rigioca
```

Revisione del piano: una nuova griglia di card o badge decorativi ripeterebbe il problema già criticato. Manteniamo quindi la home compatta positiva, rendiamo l'illustrazione il centro dell'esercizio e usiamo lo spazio dei messaggi della scena per dati reali. Nessun premio o avanzamento inventato per riempire la grafica. Il movimento risponde alla scelta, alla guida e alla raccolta; niente nuove animazioni infinite.

## Lotto finito

1. Modello del dettato mobile: azione Continua visibile nella prima schermata con illustrazione, parola e istruzioni leggibili; audio, lettura, pausa e aiuti restano raggiungibili. Layout coerente per lettere/parole/frasi, senza alterare la memoria dell'aiuto.
2. Guardaroba: categoria attiva visibile alla prima apertura e nei cambi, con anteprima/identità e accessori preservati. Dodici categorie e focus invariati.
3. Scene: fascia dedicata con obiettivo e tre scoperte derivate dal controller, disponibile dall'ingresso; nessuna sovrapposizione a volto o bersagli.
4. Kart illustrato pilota: personaggio scelto dentro il veicolo e trascinamento orizzontale per scegliere la corsia. Il comando Guida conferma; pulsanti e tastiera restano equivalenti. Scorrimento verticale, annulla, pausa e cambio vista restano supportati; nessun timer o premio dal gesto.

## Baseline e criteri

Audit locale:27PNG a320/390/1360, zero errori JavaScript e nessun POST. Home attuale positiva: illustrazione140px e tutti7ingressi entro la prima schermata320×844. Il modello dettato ha Continua a916–999px; la categoria Personaggio attiva del guardaroba resta oltre il margine della barra; l'oceano ha80px vuoti prima dell'azione.

Prove richieste: schermate prima/dopo; target almeno48px; testi principali almeno18px; zero overflow; touch/drag/annulla e tastiera; stato invariato tra renderer/reload dove previsto; avatar equipaggiato coerente; nessun cambiamento a saldi/premi o POST ospite; movimento ridotto e nessuna animazione dopo dispose. Tutte le59suite precedenti e47verify restano obbligatorie; nuovi controlli vanno aggiunti senza indebolire i precedenti.

Nessuna nuova richiesta al sito reale per superare il403 supplementare del precedente controllo cloud. Collaudo su fixture sintetiche; pubblicazione soltanto tramite pipeline ordinaria e verificata. Questo piano non è una dichiarazione di rilascio.
