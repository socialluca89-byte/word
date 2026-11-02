# Giocare e scegliere prima delle istruzioni

Base: `e9476524e032d98b141999010b6d2d6f39be5eca`, pubblicata e verificata con39controlli e51suite browser. Nuova richiesta: usare skill UX/UI e avviare miglioramenti concreti. Non si ricreano funzioni già presenti e non si dichiara perfetto il prodotto. Il Grinch resta una richiesta separata non completata.

## Direzione e critica prima del codice

Pubblico: bambini di6–7anni, con informazioni e gestione per adulti raggiungibili separatamente. Le illustrazioni originali e i personaggi rimangono il centro visivo. Colori coerenti con il gioco: carta `#fffdf6`, inchiostro `#193e55`, acqua `#d6ebf0`, pino `#22654f`, sole `#f4c65b`, corallo `#ee806c`. Outfit per titoli e azioni; DM Sans per istruzioni. Nessun nuovo font, servizio o animazione automatica. Istruzioni principali almeno18px e azioni almeno48px; focus evidente e movimento ridotto conservati.

La critica alla base riguarda la gerarchia: i bei disegni ci sono, ma testi, filtri e informazioni ritardano l'azione. Nel guardaroba la prima carta si trova1806/1613/959px dopo l'intestazione a320/390/1360px; i dodici filtri occupano425/365/125px. Nel gesto reale home→villaggio, il primo avvio richiede ancora1,99/1,44/0,97schermate di scorrimento alle medesime larghezze; una sfida sospesa richiede2,30/1,63/1,18schermate. Sono distanze relative dal gesto osservato, non coordinate assolute del documento né promesse su ogni dispositivo. Non basta cambiare colori o aggiungere carte decorative. Occorre portare l'azione vicino alla scena e rendere consultabili i dettagli quando servono.

Concept:

```
Villaggio: [titolo breve + vai alla sfida]
          [scena originale] [progresso + domanda/avvio]
          [calendario, regole, collezione, Birillo raggiungibili]

Guardaroba: [titolo breve + personaggio attuale]
            [anteprima originale] [scelta e carte]
            [tutte le categorie + informazioni consultabili]
```

Su telefono si privilegiano scena, scelta e azione con un accesso diretto alla sfida. Sul desktop anteprima e scelta possono stare affiancate. Nessun controllo deve coprire viso/accessori o diventare irraggiungibile sotto barre fisse. Le categorie restano tutte presenti e usabili da tastiera; eventuale scorrimento appartiene al loro contenitore e non all'intera pagina.

## Lotto finito e proprietà delle modifiche

1. **Villaggi:** ridurre la distanza dall'avvio/ripresa/nuovo giro, mostrare vicino il progresso reale e separare istruzioni e calendario dalla fase di gioco. Tutti i periodi, gli scherzi, le collezioni e i distintivi restano raggiungibili. Nessun nuovo POST automatico, premio o limite.
2. **Guardaroba:** ridurre testi e filtri prima delle scelte, mantenere anteprime originali, ritorno all'oggetto e uso del personaggio già equipaggiato. Nessuna modifica a cataloghi, prezzi, inventario, accessori o soglie. Tutte le dodici categorie e le tre entrate ai giochi rimangono.
3. **Interazione accessibile:** verificare e correggere focus delle lettere, riepilogo fonetica e modifica soprannome ospite; stato/nome del suono coerenti se l'audio non è disponibile. Le autorizzazioni, i dati e le regole di apprendimento restano invariati.

Prima delle modifiche funzionali si conservano misure e screenshot della base con dati sintetici. Le parti principali vengono implementate separatamente, poi integrate sugli stessi byte. Non si modificano account reali, profili degli alunni, servizi email, sicurezza hosting o credenziali.

## Accettazione

- Confronto prima/dopo a320/390/1360px: meno scorrimento per l'azione, testi leggibili, nessuna sovrapposizione o overflow di pagina.
- Raggiungibilità di tutte le destinazioni inventariate, filtri e anteprime; tastiera/touch, pausa/Indietro e ritorno all'oggetto.
- Nessun acquisto, sblocco, risposta o cambio personaggio dal semplice uso di un collegamento/anteprima.
- Focus sensato dopo azioni che ricreano il DOM; messaggi accessibili coerenti con stato reale.
- Regressioni esistenti conservate. Tutti i controlli verify, nuove prove pertinenti e CI del candidato finale prima di una pubblicazione ordinaria già autorizzata. Su challenge si ferma il rilascio senza aggiramenti.

Questo documento è un piano di lavoro, non una dichiarazione di test superati o di pubblicazione del nuovo lotto. Le prove finali devono identificare commit/digest e distinguere esiti locali, CI e live.

## Skill applicate

- [Frontend Design](../.agents/skills/frontend-design/SKILL.md), già installata con provenienza/licenza conservate.
- [Web Design Guidelines](../.agents/skills/web-design-guidelines/SKILL.md), skill ufficiale Vercel appena scaricata alla revisione `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62`; le linee guida fresche sono state lette alla revisione `434b7f91364665f2f733b310ec54809bf8f37937`. Provenienza, hash e fonte della dichiarazione MIT in [UPSTREAM.json](../.agents/skills/web-design-guidelines/UPSTREAM.json). Nessun installer o servizio è stato eseguito/aggiunto all'applicazione.

Le skill sono istruzioni di lavoro e revisione, non componenti del gioco: non sostituiscono misure, verifica dei dati o test del candidato finale. Si applicano al contesto italiano dei bambini; non giustificano cambi generici a framework, permessi o navigazione già funzionante.

## Risultato implementato e misure locali

Il villaggio affianca scena e attività sul desktop. Su telefono un comando diretto porta al vero controllo senza avviare richieste; calendario, regole, album e Birillo rimangono dopo il gioco. La distanza dall'avvio scende2321→761px a320,1854→702px a390 e1487→288px desktop. Il pulsante di avvio inline resta sotto la prima schermata mobile: è il collegamento superiore a renderlo subito raggiungibile, non una scomparsa di tutti gli scorrimenti.

Nel guardaroba le prime carte passano1806→804px a320,1613→753px a390 e959→311px desktop, dall'intestazione. Tutti97gli ID e tutte12le categorie restano presenti. Le informazioni lunghe sono consultabili, i filtri scorrono nel loro contenitore mobile e l'anteprima affianca le scelte su desktop. La sidebar usa `:has`/`overflow:clip` e rimane statica nelle finestre basse. Non vengono introdotti override globali dello scorrimento o soglie più larghe per mascherare problemi.

Il testo dell'anteprima è stato accorciato dopo una misura: il precedente messaggio faceva crescere la sidebar di91px e provocava un salto105px. Nome candidato e personaggio effettivamente in uso restano distinti; il messaggio breve conserva anteprima gratuita e scelta invariata. Focus con margine16px e limite80px di correzione quando l'immagine era già visibile sono stati mantenuti nei test.

Le quattro correzioni di interazione sono provate con35controlli: Lettere da tastiera, fine percorso fonetico, apertura/chiusura/salvataggio del soprannome ospite, suoni assenti o falliti. Un avviso audio dedicato resta leggibile mentre la mappa finisce di caricarsi; un tentativo riuscito lo cancella e callback obsolete non cambiano la nuova scelta. I cinque comandi mappa e Cambia soprannome hanno bersagli48px.

## Collaudo e correzioni individuate

Le nuove suite holiday-layout, wardrobe-layout e interaction-focus sono passate. La revisione indipendente ha individuato e fatto correggere il comando superiore del villaggio durante un POST incerto: rimane inattivo durante la richiesta e poi porta al vero recupero tramite GET, senza ripetere il POST. La regressione trattiene una risposta già committata e ne simula la perdita.

La successiva suite storica holidays ha trovato due comandi con lo stesso nome «Verifica e riprendi». È stata corretta la UI: il salto si chiama **Vai al recupero**, l'azione effettiva di verifica mantiene il nome originale ed è unica. Il vecchio test è passato senza modifiche; la nuova suite verifica esplicitamente nomi distinti. Il fallimento precedente resta registrato separatamente.

I controlli locali sono conservati per segmenti:39gruppi verify e primi test sul digest `e17d4f12dc5785a4f0c711ac68257acc80de5a957536735fb6dcfb88dcacf6b1`; dopo la sola correzione del nome, sintassi/PWA/bundle, nuova holiday-layout e cinque regressioni pertinenti sono passate sul digest `bd815b860c91a28b2ab13bb93c19d13eaac6ab0069cf594d2607edb2000f80eb`. Nessun cambio alle API, ai contatori, ai cataloghi o alle regole dei premi. Le prove dei singoli segmenti non sono presentate come una matrice locale unica sul digest finale. La CI completa del commit esatto resta obbligatoria, con39gruppi verify e54suite browser.

Il riavvio dell'ambiente ha interrotto gli agenti, ma file, misure e log sono stati ritrovati integri. L'ultima parte del guardaroba è stata ripresa nello stesso task e collaudata, senza sostituire il progetto o perdere le correzioni.

## Primo controllo CI e difetto reale di Spazio

Il primo candidato `0ad95a8005a9fcc4bcfd3b79dc7daba0f58dd9eb` ha superato verify e le nuove prove di layout, ma il run [41528526244](https://github.com/socialluca89-byte/word/actions/runs/41528526244) si è fermato su world-play: un vero tocco non raccoglieva il bersaglio di Spazio. Il deploy è stato saltato prima di preflight, SSH o caricamento; la versione live è rimasta `e947652`. Non è stato nascosto il problema con retry o soglie più larghe.

Una prova locale controllata ha trattenuto e rilasciato il vero frame successivo a una scelta errata: la camera cambiava orientamento e spostava il bersaglio di16,9074px tra il calcolo della posizione e il tocco, con canvas e scorrimento invariati. Il punto precedente non intersecava più la geometria; un tocco sulla nuova posizione avanzava regolarmente. Nel minigioco la camera mantiene ora la stessa inquadratura1.3 dall'inizio; la soglia della sequenza cinematica delle altre anteprime rimane invariata. Una nuova regressione confronta tutti e tre i bersagli prima/dopo quel frame, conservando le prove originali di touch, tastiera, pause, ripetizioni e assenza di scritture private.

Il controllo visivo ha poi confermato un secondo difetto preesistente: il razzo rimaneva fuori campo a quota4 con movimento ridotto. Nel solo minigioco è ora a terra durante pausa/movimento ridotto; con movimento normale conserva oscillazione, fiamma e un piccolo salto limitato a0,25unità. Le altre anteprime mantengono la formula di lancio originale. In sei casi320/390px × ridotto/normale/pausa,258frame reali hanno mantenuto l'intera geometria dentro il canvas, anche dopo errore e ciascuna delle tre raccolte. Il feedback cosmetico di due secondi rimane quello esistente; i bounds del canvas non sono presentati come assenza di ogni sovrapposizione temporanea.

World-play rafforzato, world-driving, illustrated e motion sono passati localmente senza modificare soglie o ripetere input per mascherare fallimenti. La nuova condizione di razzo fermo dopo ogni scelta era fallita prima della correzione. La revisione statica indipendente conferma l'isolamento al playground; il nuovo digest applicativo è registrato nel rapporto JSON. Il fallimento CI precedente resta distinto e la nuova matrice completa, il deploy e il controllo live devono ancora essere confermati sul commit corretto.

[Galleria reale](review/README.md). Tutti gli account e i dati usati sono sintetici. Screen reader e dispositivi fisici, qualità della voce reale e vecchio tablet non sono validati. Nessuna nuova richiesta al sito, modifica a credenziali o messaggio esterno è implicita nel collaudo locale.

La nuova esecuzione completa dei39gruppi verify è passata sul digest `db53996b9d16d752c0732484b0299fc1447c468d9e12234d568aeb05f1c2473f`, dopo il versionamento degli asset. Queste prove locali non sostituiscono la CI54 o la conferma della versione pubblicata.
