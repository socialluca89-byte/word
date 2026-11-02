# Nuovo lotto approvato: gioco, allenamento e area genitori

Autorizzazione: «ok procedi e poi pubblica», successiva alla roadmap con sette priorità. Base `6819fe41583435938519592cb5f733bad0d0e35c`, verificata da run41480237388 (35 controlli e46suite browser), ancora distinta dal live. Nessun account o dato reale viene usato per lo sviluppo.

## Piano e critica prima dell'integrazione

Pubblico: bambini di6–7anni, con gestore e genitore nelle aree protette. Colori/illustrazioni/font del gioco esistente restano: carta `#fffdf6`, inchiostro `#163b50`, acqua `#cdeffe`, foglia `#1b765f`, sole `#f4c65b`, corallo `#ee806c`; Outfit per titoli e DM Sans per istruzioni. Testi grandi, pulsanti da48px, focus visibile, movimento ridotto e tutti i percorsi precedenti.

- **Gioco:** guidare/mirare deve spostare un oggetto reale nella scena, con azione coerente. Tre pulsanti che cambiano soltanto un'etichetta ripeterebbero il problema iniziale. Kart, calcio e spazio usano lo stesso contratto di scelta nelle illustrazioni, nel3D e nel ripiego; le tre scelte dirette restano. Niente nuova economia o timer competitivo.
- **Allenamento:** una proposta breve costruita sulle evidenze disponibili, con priorità alla ripresa; nessuna diagnosi o difficoltà inventata per dati assenti.3–5minuti è un'indicazione orientativa, non un timer o una prestazione promessa. Tutti i percorsi restano selezionabili.
- **Calendario:** quattro festività e periodo dell'elfo leggibili usando il calendario del server. Prima dell'8dicembre Birillo è annunciato, non eliminato; personaggi elfo/elfa e visitatore restano distinti. Non si anticipano date o premi.
- **Genitori:** un adulto già registrato genera un codice breve, il gestore autorizza l'alunno specifico e il genitore conferma. Solo report di progresso, nessun accesso automatico per email/nickname/linkclasse e nessun cambio del profilo attivo. Revoca, scadenza, consumo atomico e cambi di ruolo/proprietario devono impedire il ritorno di vecchi permessi.

Layout dei nuovi controlli:

```
[illustrazione del mondo con veicolo/mirino reale]
[obiettivo inglese]
[sinistra] [Guida / Tira / Vola] [destra]
[le tre scelte dirette conservate]
[progresso; al completamento Continua con gli esercizi]
```

Il pannello suggerito presenta una sola proposta e il motivo in parole semplici. Il calendario espanso conserva la missione come azione principale. L'area genitori usa i moduli esistenti, con autorizzazione separata dalla gestione dei propri profili.

## Criteri finiti di accettazione

1. I tre nuovi controlli agiscono visibilmente sul mondo; errore, ripetizione, tastiera, touch, pausa, ripiego e replay conservano progresso/economia.
2. La proposta Allenamento usa sessioni/evidenze del contesto corrente; cambi di account, dati mancanti e offline non creano statistiche o premi.
3. Calendario e Birillo rispettano Roma, confini inclusivi, nuovo anno e orologio browser errato; tutti gli eventi precedenti restano.
4. Collegamento genitore–alunno limitato ai progressi, con doppia conferma, contesti separati, revoca permanente e prove concorrenti. Nessun collegamento reale viene creato dagli strumenti di sviluppo.
5. Tutti39controlli e50suite browser devono passare sul candidato finale. I test mirati dei singoli moduli usano fixture6819fe4+deltaproprio e non provano l'integrazione completa. Due browser locali al massimo; prestazioni a CPU tranquilla. In CI due gruppi25+25 conservano ogni test e il limite individuale, con15minuti ciascuno e job40minuti.
6. Pubblicazione soltanto con il workflow normale e le sue verifiche, senza rimuovere protezioni, cambiare identità/IP, creare credenziali o riscrivere dati. Su nuovo challenge fermarsi con prova dell'esito, senza tentativi alternativi. Test verdi non significano sito pubblicato.

## Parti che richiedono una verifica umana o una dipendenza esterna

La qualità delle voci sul dispositivo, le clip fonemiche verificate, la consegna email reale e il recupero dell'account proprietario non sono dimostrati dai mock. Non vengono attivati nuovi servizi o invii. L'[inventario didattico](LEARNING_COVERAGE_2026_11_02.md) documenta copertura attuale e passi successivi: non è una certificazione Cambridge o una promessa di curriculum completo. Il vecchio tablet resta rinviato secondo l'indicazione dell'utente.

La pubblicazione precedente era stata intercettata dal preflight SiteGround. I run sul ramo di revisione non dimostrano la risoluzione: occorrono un esito normale del workflow di rilascio e la successiva verifica live. Nessun messaggio all'assistenza è implicito nella pubblicazione autorizzata.


## Esito cumulativo locale

Il candidato applicativo con digest `f71b070ca9dc057e7c3f501857a705510787ffab5667cf4cb515e1762ae25024` ha superato tutte le **50suite browser** sugli stessi byte, comprese prestazioni eseguite da sole. I **39controlli** risultano passati: la prima esecuzione si era fermata all'ultimo test di deploy, che ha individuato un vero problema di ripristino dei nuovi moduli. Le correzioni degli helper e il test completo finale sono passati senza cambiare l'applicazione. [Prove strutturate](NEXT_GAME_RELEASE_VERIFICATION_2026_11_02.json).

Il rollback ora elimina soltanto i file gestiti che non esistevano nel backup e rifiuta link/directory prima di modificare la destinazione. Ogni backup è univoco anche nello stesso secondo; la scelta dell'ultimo e la conservazione dei cinque usano l'orario del filesystem, con compatibilità per i nomi precedenti. Il caso è stato riprodotto e verificato su un server fittizio. Nella prima revisione dell'helper una pipe con head terminava in SIGPIPE; è stata sostituita con lettura completa e il test successivo è passato. Non sono state tolte asserzioni o protezioni.

[Anteprime reali](review/README.md). Il risultato locale non sostituisce la CI del commit esatto o la verifica dopo la pubblicazione.
