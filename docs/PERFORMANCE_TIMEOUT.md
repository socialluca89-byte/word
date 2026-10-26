# Diagnosi del timeout prestazioni — solo ambiente locale

Nessun deploy, modifica di sicurezza, richiesta a SiteGround o prova con dati reali.

## Cosa era osservato

Nel lotto precedente una promessa `waitForRequest` del font restava senza handler quando il caricamento falliva; la chiusura della pagina generava “Target page … closed” e nascondeva l'errore originario. Dopo l'attesa congiunta Promise.all è diventato visibile un timeout `page.goto`/`load` di5000ms. Il vecchio log non contiene dati sufficienti per stabilire quale risorsa o condizione avesse causato quel caricamento lento. Non viene attribuito arbitrariamente al nuovo modulo offline o all'anti-bot del deploy, che è un problema distinto.

## Diagnostica e controlli

Il test mantiene lo stesso timeout5s, le stesse assertion sulla pagina utilizzabile con font esterno trattenuto e le stesse misure di inizializzazione WebGL. Navigazione e osservatore font sono entrambi attesi immediatamente: non rimane un rifiuto secondario senza handler. Ora sono registrati solo percorsi delle risorse pendenti, readyState, eventi DOM/load e Navigation Timing; nessun contenuto di sessione o dato account.

Cinque prove diagnostiche prestabilite, con esito conservato per ciascuna (non retry fino al primo PASS):

| Campione | DOMContentLoaded (ms) | Evento load (ms) | Esito |
| --- | ---: | ---: | --- |
| 1 |2077.5|2217.1|PASS |
| 2 |2180.5|2361.0|PASS |
| 3 |1802.4|1970.0|PASS |
| 4 |2240.4|2361.0|PASS |
| 5 |2170.9|2369.9|PASS |

Tutti con stylesheet del font ancora trattenuto,1contestoWebGL iniziale,0contesti della mappa fuori schermo e2totali/1mappa dopo scroll su390/1360px. Sono misure delle fixture locali, non prestazioni garantite sul tablet reale.

Controllo negativo separato: con `WORDYLAND_PERFORMANCE_HOLD_CRITICAL=1` il test trattiene il CSS locale necessario. Deve fallire; è fallito a5000ms, risorsa pendente `/pwa.css`, readyState=`loading`, DOM/load=0, elapsed5011ms. Nessun errore secondario “Target page … closed”. Questa opzione diagnostica non è impostata nella CI e non permette di saltare controlli: provoca soltanto un fallimento. Non cambia soglie, codice applicativo o rete del sito.

## Conclusione e limite

L'osservazione degli errori è stata stabilizzata e verificata positivamente/negativamente. Il timeout storico non si è riprodotto nelle cinque prove; la sua causa precisa resta non dimostrata. Non è corretto dichiarare il prodotto perfetto o aumentare il limite per far passare il test. Una futura ricorrenza produrrà la risorsa/evento mancante; i fallimenti precedenti rimangono documentati. La verifica cronometrata viene eseguita separatamente dalle altre suite locali per evitare di confondere la diagnosi con la contesa di più browser; il limite e la copertura della CI restano invariati.

Verifica finale sul candidato lettere offline: PASS, DOM1949.1ms/load2074.2ms, font ancora trattenuto,1contestoWebGL iniziale e2dopo scroll su390/1360px. È una prova distinta dai cinque campioni iniziali, con la stessa soglia5s. Il deploy resta fermo per il challenge SiteGround: questa diagnosi non autorizza un nuovo tentativo.
