# Motore su richiesta e baia: verifica locale del 3 novembre 2026

## Modifiche

`three.min.js` non è più uno script iniziale della pagina. La mappa, quando
raggiunge il viewport, e le scene per cui si sceglie **3D classico** chiedono la
stessa libreria locale, con una sola promessa condivisa e un URL versionato.
Il caricamento ha un limite di dieci secondi. In caso di errore restano i
comandi testuali del gioco; non partono richieste ripetute a ogni cambio scena.
La mancanza degli observer o di WebGL usa il ripiego esistente.

I comandi sono disponibili anche prima della libreria e prima del renderer.
Navigare via o cambiare aspetto durante il download invalida la vista vecchia:
la risposta tardiva non può creare un canvas sul contenitore eliminato o
sostituire la nuova illustrazione. Cambiare soltanto aspetto conserva lo stesso
controller, gli oggetti già trovati e il set corrente. Uscire dal mondo continua
a ricominciare il gioco libero, come indica il testo esistente.

Anche la scelta esplicita **3D classico** è una richiesta della scena: attiva il
renderer del solo pannello scelto e lo porta in vista, pure quando il selettore
esterno è raggiunto dopo aver scorso oltre l'illustrazione. Un secondo click
sulla scelta già attiva non crea un renderer nuovo. La verifica cumulativa aveva
rilevato il caso nel guardaroba: il selettore cambiava preferenza, ma la scena
restava differita perché nessun observer la vedeva. Il test `engine-lazy` riproduce
ora questo caso con la scena oltre il margine del viewport; l'asserzione originale
del canvas reale in `appearance-consistency` resta invariata.

La **Baia dei tesori** è il pilota riutilizzabile per piccoli set variabili.
Ogni completamento mantiene tre obiettivi; **Rigioca nel mondo** alterna:

1. `shell`, `fish`, `pearl`: il set iniziale conservato;
2. `crab`, `starfish`, `turtle`: gli amici della baia;
3. `red`, `blue`, `yellow`: le gemme colorate.

I due renderer condividono obiettivi e ordine; mesh reali, marcatori, testi e
pulsanti cambiano insieme. Il reset elimina anche il feedback del set precedente
e libera la geometria vecchia. Gli altri sette mondi conservano i set originali.
Nessuna azione di questi minigiochi accredita punti, monete o premi: il pulsante
per continuare negli esercizi usa il percorso didattico già presente.

## Prove locali

Le prove usano Chromium con SwiftShader, PHP/SQLite temporanei e profili
sintetici. Non interrogano il sito live né usano account o dati di bambini.

| Suite | Copertura |
| --- | --- |
| `engine-lazy` | Zero richieste Three nella visita illustrata lontana dalla mappa; una richiesta condivisa; download trattenuto, navigazione e risposta tardiva; comandi durante il download; raycast/touch sui tre set; stesso controller/progressi tra viste; ripiego dopo errore; nessuna scrittura API o variazione dell'economia |
| `compatibility` | Avvio normale, assenza WebGL, assenza observer, libreria Three bloccata, script critico bloccato o restituito come HTML, API browser facoltative mancanti |
| `world-play` | Otto giochi 3D reali, raycast e tastiera, errore/ripetizione/replay, quattro larghezze, pausa, perdita del contesto, portali con hash già corrente |
| `world-driving` | Guida/mira effettiva di kart, calcio e spazio nei due renderer; cambio aspetto senza perdere il risultato; pausa e ripiego |
| `characters` | Sei modelli classici e corona, tre giochi, ricarica, profili sintetici isolati, secondo dispositivo, logout e ripiego WebGL |
| `illustrated` | Otto mondi, venti ritratti identici alle schede, input touch/tastiera, identità e accessori salvati, scelta 3D, atlanti lossless e formato alternativo |

Gli osservatori dei test 3D si installano all'evento di disponibilità della
libreria, anziché presumere che `THREE` esista a `DOMContentLoaded`. Il test
personaggi esamina la scena associata al canvas realmente renderizzato; non
prende genericamente l'ultima scena creata. Le verifiche di raycast restano
attive e non sono sostituite da chiamate dirette ai metodi del gioco.

I log, le impronte dei sorgenti verificati e sei schermate locali dei tre set a
390px sono raccolti nella cartella di lavoro
`wordyland-resolution-2026-11-03/engine`. Un primo fallimento del nuovo test era
una competizione fra l'evento di richiesta e il contatore del route handler:
è conservato nei log e corretto attendendo entrambi, senza rimuovere l'asserzione.
La revisione visiva ha inoltre rilevato e corretto il testo del set precedente
visibile brevemente dopo il replay.

Una seconda verifica visiva ha riprodotto il messaggio della dimostrazione sopra
il volto nella posizione iniziale della baia. Il personaggio ora viene mantenuto
nel rettangolo dell'illustrazione, escludendo la fascia della didascalia, e spostato
subito sotto il messaggio se necessario. Il margine considera anche il piccolo
salto dell'animazione; messaggio e didascalia restano presenti. La regressione
`illustrated-actions` verifica fotogrammi animati e il pulsante reale a 320, 390
e 1180px, oltre alle otto azioni e ai controlli preesistenti. La correzione è nel
solo JavaScript; la fascia inferiore della didascalia è gestita dal lotto UX.

## Misure e limiti

Alla base `b23e98a` i sedici script iniziali totalizzavano **1.190.627 byte**;
Three da solo è **669.884 byte**. Il motore ora richiede quindici script iniziali
e Three è escluso dal loro parsing. Il totale finale va misurato sul candidato
cumulativo perché gli altri interventi aggiornano più script.

Questa è una riduzione deterministica dei byte iniziali, non una promessa di
tempo di caricamento sui dispositivi reali. La prima prova prestazioni è PASS
in un'unica esecuzione isolata sul primo candidato versionato, mantenendo il controllo
originale di cinque secondi: `load` 443,5ms e `DOMContentLoaded` 384,7ms con i font
remoti trattenuti. A 390 e 1360px l'avvio non crea contesti WebGL; scorrere alla
mappa ne crea uno, e le notifiche ospite identiche non li ricreano. Il risultato
è locale Chromium/SwiftShader. Dopo la successiva correzione dell'attivazione
esplicita3D occorre ripetere questa verifica sul nuovo candidato congelato.
Il tablet antico e gli screen reader fisici
restano verifiche manuali. La scadenza del caricamento è limitata nel codice; il test negativo
automatico esercita un errore esplicito di rete, non una connessione reale lenta.

Nessuna illustrazione o immagine è stata modificata. Gli atlanti più grandi
restano ritratti (1.918.648 byte) e festività (2.699.502 byte): una futura consegna
per singole celle o risoluzioni potrebbe ridurre la memoria decodificata, ma
richiede una pipeline di asset con equivalenza visuale e fallback verificati.
Non sono state generate varianti, ritagli o ricompressioni in questo lotto.

Il controllo degli URL e hash della libreria differita deve restare nel
versionatore e nel verificatore del bundle, affidati al coordinamento del
rilascio. Queste prove locali non attestano una pubblicazione o una verifica
live; il candidato complessivo richiede ancora versione asset, verifica bundle,
suite cumulative e normale pipeline di rilascio.

## Freeze finale dopo la regressione cumulativa

La prova isolata finale è passata in una sola esecuzione sul candidato aggiornato: DOM418,9ms/load484,1ms, soglia5s invariata, zero contesti iniziali e una mappa dopo scroll a390/1360. I54file coincidono con il manifest congelato. Totale finale degli script iniziali555.872byte; la precedente misura443,5ms descrive il primo freeze e non viene confusa con quello definitivo. Prova: PERFORMANCE_FREEZE2.json nel registro di lavoro.

Il successivo follow-up della memoria degli aiuti modifica solo training.js e mantiene il motore esaminato. Una nuova prova isolata sul suo freeze definitivo è PASS: DOM489,1ms/load532ms, cinque secondi invariati,54file integri, zero renderer iniziali e una mappa dopo scroll. Le misure precedenti restano i rispettivi snapshot, non dati del rilascio finale.
