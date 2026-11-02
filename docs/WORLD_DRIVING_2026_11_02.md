# Guidare, mirare e volare nei mondi

Lotto finito: Kart, Calcio e Spazio. Le otto miniattività e tutte le destinazioni precedenti restano disponibili.

Nei tre mondi i comandi Sinistra e Destra selezionano un oggetto reale: cambiano l'anello sul bersaglio e la posizione di kart, pallone o razzo. Guida, Tira e Vola raggiungono la scelta corrente con un'animazione a gesto. Se la scelta non corrisponde alla parola richiesta la prova non avanza; il bambino può riprovare senza perdere punti. Le tre scelte dirette e i bersagli nella scena restano equivalenti.

La stessa selezione muove geometrie reali in 3D. Senza WebGL la traccia delle tre posizioni e tutti i comandi restano utilizzabili. Non è una simulazione fisica infinita: ogni miniattività ha tre obiettivi, replay e ingresso agli esercizi. Nessun nuovo premio, scrittura API, timer competitivo o dato privato. Uscendo si ricomincia, come prima.

Comandi grandi da48px, testo18px, tastiera con frecce e Spazio o pulsanti nativi. I target raccolti non si possono contare due volte; i comandi aggiuntivi spariscono al completamento e il focus passa al pulsante degli esercizi. Riduzione movimento e pausa mostrano comunque lo stato finale. Immagini, personaggi e qualità dell'illustrazione precedente restano; gli oggetti di guida riusano lo stile vettoriale e i colori degli accessori locali, senza asset, servizi o librerie nuovi.

Verifica dedicata: `scripts/test-world-driving-browser.cjs`, da eseguire sul wrapper localhost isolato con default illustrato. Misura movimento visibile e scelta effettiva in entrambi i renderer, controlla errori/ripetizioni/replay, touch e tastiera, larghezze320/390/1180, CTA, pausa, fallback e assenza di modifiche economiche. La validazione fisica su tablet/lettore schermo rimane distinta dai test browser sintetici.

## Verifiche del lotto isolato

PASS locali su snapshot Git `6819fe4` con overlay dei soli file dei mondi e test: `world-driving`, `illustrated`, `world-play`. Non certificano l'integrazione delle modifiche concorrenti ad account, calendario o percorso didattico; quella richiede la verifica cumulativa del coordinatore. Il test prestazioni è riservato alla finestra finale senza altri browser/CPU concorrenti.

Il test ha trovato e corretto un difetto reale di focus: al tocco finale il bersaglio nascosto poteva riprendere il focus dal pulsante degli esercizi tramite gli eventi compatibili del browser. Il touch ora impedisce quel default su pointerdown, preservando scelta, tastiera e idempotenza.

La posa dopo raccolta ora avvicina il personaggio al bersaglio senza tagliarlo o nasconderlo dietro intestazione, feedback o didascalia. L'asserzione di coordinate identiche è sostituita da controlli più forti di contenimento, assenza di sovrapposizioni e riduzione della distanza dal bersaglio, per tutte le raccolte degli otto mondi (la posa finale del tesoro mantiene il controllo dedicato). La posa iniziale e quella di replay restano identiche.

Le catture di un elemento più alto del viewport possono includere erroneamente il link fisso di salto: la verifica separata del viewport ha confermato link non focalizzato, rettangolo completamente sopra lo schermo, trasformazione di occultamento attiva. Le catture viewport reali e i dati geometrici sono la prova di ciò che vede il giocatore; non è stata introdotta una correzione dell'app per mascherare un artefatto di cattura.
