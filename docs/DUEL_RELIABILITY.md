# Sfide: pausa, conferme perse e audio — work, non live

Lotto successivo della roadmap,25ottobre2026. La verifica Chrome/tablet è rimandata su richiesta dell'utente; questo intervento riguarda le altre funzioni. Nessun dato reale, account alunni, modifica hosting o deploy.

## Difetti e correzioni

- **Pausa dopo una risposta:** prima era disabilitata insieme alle risposte e restava tale durante il feedback. Riprodotto sul file precedente: pausa abilitata=false dopo la conferma. Ora torna disponibile appena il risultato è confermato, senza dover passare alla domanda successiva. Durante una richiesta ancora pendente le azioni restano protette.
- **Conferma persa:** prima tutti i pulsanti risposta tornavano attivi dopo un errore di rete. Il server respingeva i passi duplicati, ma l'interfaccia invitava a rispondere a una domanda potenzialmente già salvata. Ora le vecchie risposte restano disabilitate; «Riprendi dal salvataggio» legge lo stato prima di renderle nuovamente utilizzabili. Pausa disponibile anche in questa condizione. Nessun reinvio automatico.
- **Messaggi:** mantenuta la spiegazione del server/rete e aggiunta l'azione di recupero. Una risposta esplicitamente rifiutata dal server non viene descritta come sicuramente persa; un errore di connessione non viene descritto come mancato salvataggio certo. La pausa promette soltanto la conservazione delle risposte confermate.
- **Voce:** domanda audio interrotta su risposta, pausa, domanda successiva e uscita/cambio profilo. Si cancella l'audio posseduto dalla sfida, con riferimenti/callback limitati alla domanda corretta. Alla rimozione dell'area sono rilasciati anche scena e listener presenza. Nessuna nuova registrazione o servizio audio.

Nessuna modifica a API, schema database, punti per risposta, classifiche, premi, proprietà profili o appartenenze delle classi. Non è un cambiamento delle regole della sfida: il server resta autorità su passo e punteggio.

## Verifiche locali

Nuova suite `duel-resilience` con due account di classe sintetici e un secondo dispositivo dello stesso proprietario:

1. doppio click invia una sola risposta; feedback permette Pausa e ripresa alla domanda successiva;
2. server salva, ma la risposta HTTP viene persa: lettura di recupero riparte dal passo salvato con punteggio invariato;
3. richiesta interrotta prima dell'invio: recupero mantiene la domanda non risposta;
4. un secondo dispositivo risponde prima: il client vecchio riceve409, conserva «Risposta già registrata» e recupera il nuovo passo senza duplicare punti;
5. bottoni della vecchia domanda bloccati finché non viene verificato lo stato; economia generale del profilo invariata;
6. voce sintetica arrestata su risposta, pausa e cambio route. Il mock verifica il ciclo di vita, non qualità della pronuncia.

Regressioni browser: resume, presence, community. API: resume, presence, classroom. Statici: sintassi arena/nuova suite/runner, PWA/cache e integrità bundle39. Suite aggiunta al futuro browser job; nessuna CI remota eseguita da questo lotto.

Fallimento iniziale del nuovo test: provava a cliccare una destinazione nascosta dalla modalità di gioco. Corretto il test per simulare il cambio route, senza rendere visibile un pulsante nascosto o allungare timeout. Poi prova completata; estesa in seguito al conflitto fra due dispositivi. Nessun retry automatico.

## Limiti

Non dimostra che ogni rete reale consegni le risposte; rende esplicito e recuperabile l'esito incerto. Le normali scadenze di sfida e autorizzazioni restano attive. Nessun nuovo rilascio: tutte le modifiche sono sul ramo work e dipendono ancora dallo sblocco hosting già documentato. La verifica tablet resta volontariamente rimandata e non impedisce il lavoro indipendente.
