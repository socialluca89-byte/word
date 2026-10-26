# Alternative delle lettere:2→3→4

Lotto successivo al rilascioa52715b. Sviluppato suwork, pubblicazione da verificare: non equivale al completamento della roadmap.

## Regola e limiti didattici

Ogni nuova attività parte dal proprio storico, separando **lettera vista→lettera** da **nome inglese ascoltato→lettera**. Sono nomi delle lettere, non fonemi. Una risposta di lettura non sblocca alternative nella modalità ascolto.

- Due scelte iniziali; tre dopo almeno3risposte senza aiuti/errori in almeno2date per quella lettera/competenza.
- Quattro richiedono almeno6risposte autonome in3date **e** pratica autonoma reale con tre alternative in almeno2date. Lo storico precedente di sole due alternative non permette il salto diretto a quattro.
- Le alternative aggiuntive provengono soltanto da lettere già incontrate dallo stesso profilo/ospite; se non bastano, le scelte restano meno numerose. Non vengono introdotti distrattori sconosciuti per raggiungere un numero.
- Due errori nella stessa attività offrono automaticamente modello e ritorno a due scelte. «Un aiuto · torniamo a2lettere» è disponibile anche prima. L'aiuto è salvato e la risposta successiva resta correttamente registrata con supporto.
- Difficoltà recenti ripetute (almeno2errori, meno di3risposte autonome nella stessa competenza negli ultimi7giorni) fanno proporre di nuovo due alternative nelle nuove attività. Lo storico non viene sottratto o azzerato. Le date non devono essere consecutive; una pausa lunga non toglie premi o progressi.

Sono regole comprensibili per proporre attività, non una diagnosi, una misura certificata di padronanza o un livello Cambridge. Il bambino può sempre usare gli aiuti e le altre modalità. Nessun timer o confronto fra bambini.

## Sessioni, modalità e compatibilità

Il piano salva le alternative per lettura/ascolto al momento dell'avvio; ordine e lettere non sono ricalcolati durante pausa/ricaricamento/cambio dispositivo. Gli aiuti confermati restano monotoni. La pagina usa lo storico della modalità reale: se manca la voce o si sceglie di leggere, non viene simulato l'ascolto. Il passaggio di modalità aggiorna le alternative e conserva il focus quando possibile.

I piani precedenti senza choiceSets restano validi con due scelte. Nessun reset di sessioni, guestversion1, profili o premi. I client precedenti continuano a inviare risposte a due alternative e non producono falsi progressi della fase atre. I campi locali aggiuntivi sono sanificati e ricostruiti dal catalogo; markup/lettere non valide ricadono sulla coppia valida.

L'audio usa ancora le voci locali con controllo adulto per lettera/dispositivo. I test sono sintetici e non dimostrano la qualità della pronuncia reale. Il ritorno a lettura può presentare un numero diverso di scelte perché le due competenze hanno storici distinti.

## Dati e permessi

Nessun nuovo servizio, credenziale, ruolo o collegamento genitore–bambino. Le API esistenti verificano sempre il proprietario del profilo. I report adulti mantengono il proprio contesto e aggiungono solo le attività effettive con3/4alternative, distinte per competenza; nessun dato inventato per il passato.

Nuova tabella privata additiva training_choice_steps: aggregati per profilo/lettera/competenza/3o4scelte, conteggio autonomo, giorni e ultima data. Al massimo104combinazioni per profilo; nessuna risposta libera o voce conservata. Cancellazione in cascata col profilo. Gli aggregati piccoli restano per non azzerare il percorso dopo una pausa; nessuna migrazione distruttiva. I dati giornalieri e sessioni mantengono la conservazione già definita. Guest: stesso tipo di evidenza locale nel contenitore training, separato da economia/account; nessuna importazione automatica online.

Il server verifica il numero di alternative contro il piano e gli aiuti salvati. Replay e secondo dispositivo non duplicano i progressi della fase. Un aiuto non confermato dal server/localStorage è segnalato; la risposta trasporta comunque il supporto usato. Come per audioUsed già esistente, la modalità/numero descrivono l'interfaccia usata, non provano fisicamente ciò che il bambino ha ascoltato/visto.

Nessuna scrittura a portafoglio, XP, stelle, inventario, premi dei giochi, ruoli, classi o stato generale del profilo. I tre adesivi personali restano finiti, senza premi nuovi o penalità.

## Prove

Nuovi test API e browser letter-progression: soglie su date diverse, assenza di salti e distrattori mai incontrati, modalità separate, vera fase atre, piani vecchi/congelati, secondo dispositivo, nonce/replay, aiuti salvati, ritorno guidato, conservazione dopo pausa lunga, cronologia corrotta, focus/tastiera,320/390/768/1360px, report privato, economia invariata e cancellazione completa. Test sintetici; [anteprima](review/letter-progression-4-390.png) con voce simulata.

Collaudo locale:57controlliverifyPASS, inclusa nuovaAPI;22suitebrowserdistintePASS durante il lotto. L’ultimo affinamento UI usa un solo comandoAiuto ed è stato riprovato nella suite nuova, con screenshot verificato. Nessun test saltato/timeoutaumentato/retryautomatico. La CI completa e lo stato live restano da verificare e registrare: non trattare questa descrizione come prova di pubblicazione.

## Pubblicazione verificata

Live:b3ca230ff76ee708bde4d2d760e174e012bfb046; run [40399687794](https://github.com/socialluca89-byte/word/actions/runs/40399687794) verify/browser/deploySUCCESS; install/livecheck20:57:59→20:58:42UTC26ottobre. Tutte22suite eseguite, nessun retry o test eliminato. I controlli normali del deploy verificano checksum/health e33statici.

Sonda indipendente21:01:25UTC:home/index/health/trainingJS/arena/island/PWA/catalogo tutti200, byteidentici al commit, nessuna challenge. Prova pubblica browserospite fresco con solo storico locale sintetico:2,3,4scelte; Aiuto→2 e pausa/ricaricamento→2con aiuto conservato, zeroerrori/POST/CAPTCHA. Nessun account reale creato o progresso alunni letto/modificato; nessuna voce reale validata. [Anteprima del frontend pubblicato](review/live-letter-progression-20261026-390.png), storia sintetica e modalità lettura, controllata visivamente.

Questo chiude R1. Non chiude R2contenuti base, relazione parent-child verificata, estrazione foto/PDF, phonics/Cambridge, Allenamentooffline o verifiche audio/email/owner. La documentazione successiva viene aggiornata solo suwork, senza un nuovo deploy inutile.
