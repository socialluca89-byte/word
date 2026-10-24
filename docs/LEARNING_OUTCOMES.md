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
