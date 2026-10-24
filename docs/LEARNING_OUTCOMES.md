# Aiuti, correzioni e risposte autonome

Gli XP e le monete premiano l’attività e mantengono le regole esistenti. Non sono una misura di padronanza linguistica. Il browser continua a proporre aiuti gratuiti e feedback positivo anche dopo un errore.

La distinzione server si applica alle missioni gestite da `quest-answer`; non modifica i punteggi delle sfide o attribuisce valutazioni server al ripasso offline.

Il nuovo conteggio conserva integralmente `practice.good` e `practice.wrong`. La tabella aggiuntiva `practice_outcomes` registra soltanto le nuove risposte corrette:

- `independent`: risposta senza errori precedenti né aiuto nella stessa domanda;
- `assisted`: risposta dopo l’uso di un aiuto;
- `corrected`: risposta dopo almeno un errore;
- `observed`: totale delle risposte corrette osservate dal nuovo sistema.

Una risposta può essere sia assisted sia corrected; questi due conteggi non vanno sommati per ottenere un totale. I vecchi risultati non vengono riclassificati retroattivamente come autonomi. Il ripasso conserva il credito storico usando `practice.good - observed + independent`: non toglie credito già maturato, mentre le nuove correzioni/risposte con aiuto non fanno avanzare il conteggio autonomo.

Il server registra l’uso di un aiuto con `quest-hint`, vincolato a proprietario, token e domanda corrente. Le richieste ripetute non incrementano punti o contatori. La risposta finale riporta una distinzione calcolata sul server: il client non può cancellare errori o aiuti già registrati. Il campo assisted della risposta può soltanto segnalare un aiuto aggiuntivo, mai concedere autonomia o premi.

Per gli ospiti, l’aiuto è salvato nel browser insieme alla domanda corrente, anche se la connessione cade. Gli account lo salvano online: se la conferma manca, l’interfaccia lo segnala. La risposta successiva include comunque l’aiuto e lo registra atomicamente con il risultato, così una richiesta separata interrotta non diventa un successo autonomo. Un aiuto confermato dal server resta disponibile alla ripresa su un altro dispositivo; offline non si può garantire sincronizzazione tra dispositivi. Se il server non ha ricevuto alcuna scrittura e la pagina viene chiusa prima della riconnessione, l’avviso non promette un salvataggio che non è avvenuto.

I test usano solo database e account sintetici e verificano migrazione additiva, vecchi progressi, aiuti gratuiti, proprietà/CSRF, retry, errori, cambio dispositivo, perdita della conferma, contatori singoli e premi invariati. La scelta del ripasso resta una guida didattica: il gioco mostra prima la parola e non costituisce un esame antifrode.

## Ripasso degli errori recenti

Una parola con tre successi precedenti non deve scomparire dal ripasso se viene appena sbagliata o richiede un aiuto. I metadati additivi `needs_review` e `review_at` tengono separata questa necessità dai successi acquisiti: non azzerano i contatori o i premi. Le parole da rivedere più recenti vengono prima nel prossimo gruppo di domande della stessa scheda/tema. Una correzione dopo errore o aiuto mantiene la richiesta di ripasso; una successiva risposta autonoma la chiude. Il normale credito storico continua a valere.

La migrazione aggiunge le due colonne soltanto se assenti, con controllo sotto lock, e conserva le righe della versione precedente. Non ricostruisce eventi storici sconosciuti. Si riordinano soltanto missioni nuove: le domande già salvate di una missione in pausa restano nell’ordine originale.

## Alternative semanticamente equivalenti

Nelle scelte multiple, hello/hi e le forme spaziali by/next to previste nelle scene non vengono usate come distrattori reciprocamente sbagliati. Restano entrambe disponibili come parole/frasi obiettivo, nelle missioni ospite/account e nelle sfide. Le alternative hanno significati distinti; il normale catalogo e il numero di funzioni non cambiano. Nelle prove di scrittura si allena la forma mostrata/ascoltata: la spiegazione riconosce l’equivalenza e indica la forma della scheda, invece di affermare che una posizione equivalente sia diversa.

La regola è limitata alle equivalenze curate per questi esercizi; non tenta di giudicare automaticamente tutti i sinonimi inglesi. I test usano piccoli dizionari fittizi per verificare entrambe le forme come obiettivi e i punteggi delle sfide.

## Riepilogo per l’adulto (work, non ancora live)

Account e progressi → Progressi nelle missioni carica su richiesta i dati delle sole missioni online confermate del profilo scelto. Richiede ruolo adulto/admin e proprietà del profilo: non aggiunge visibilità sui compagni di classe. Il nuovo GET learning-summary è di sola lettura e non crea wallet o assegna premi.

Mostra risposte autonome, aiutate, corrette dopo un errore, missioni complete/in pausa e fino a dodici parole da ripassare. Aiuto e correzione possono sovrapporsi: non sono voti né categorie da sommare. I successi precedenti senza il nuovo dettaglio sono indicati separatamente. Ospiti, offline e modalità classiche sono esclusi esplicitamente. Errori di rete cancellano il riepilogo obsoleto; risposte arrivate dopo un cambio profilo/account non vengono mostrate. Le bozze delle schede dell’adulto restano inalterate.
