# Stessi contenuti della classe, nuove forme di gioco

Vincolo esplicito più recente del genitore: parole, regole e argomenti didattici nuovi devono derivare esclusivamente dai materiali che condivide, perché seguono l'insegnante. Le attività già presenti restano raggiungibili; questo vincolo guida ogni aggiunta successiva e supera la precedente libertà di ampliare autonomamente il programma.

Base pubblicata: a218c3d, run42263085984, 49 verify/62 suite browser e deploy verificati. Il nuovo intervento riusa esattamente i 40 casi e 16 nomi delle schede grammaticali, senza cambiare JSON, lessico, risposte, regole, numero di casi o calendari. Nessuna nuova materia, raccolta dati, voce registrata, integrazione, spesa o accesso.

## Due aiuti interattivi opzionali

- **Conta con me**: il bambino tocca gli stessi oggetti del disegno e ogni oggetto viene contato una sola volta. Numeri e indicazioni in italiano; nessuna risposta inglese o nuovo lessico. Solo nelle fasi che richiedono distinguere uno/più oggetti o formare il plurale/frase. Un comando permette di ricominciare il conteggio, senza cambiare la domanda.
- **Componi con le lettere**: nella scrittura del plurale, tessere mescolate costruiscono la stessa risposta della scheda. Lettere doppie hanno identità distinte; gli spazi sono espliciti. Annulla e ricomincia; la scrittura normale rimane disponibile. Nessuna lettura TTS delle lettere spacciata per fonemi.

Entrambi sono aiuti: prima di mostrarne l'effetto si conferma e salva hint1 con l'API/archivio esistente. Se il salvataggio fallisce non si apre l'aiuto e la risposta non avanza. Nessun nuovo modo backend, tabella, catalogo o archivio; al ritorno/reload rimane il fatto che l'aiuto è stato usato, mentre i gesti non confermati restano un'interazione locale. La scrittura guidata non diventa una risposta autonoma nel report. Punti, monete, adesivi e permessi restano quelli esistenti.

## Disegno e accessibilità

Si conserva il teatro illustrato: inchiostro #193E55, bosco #22654F, mare #168BA5, sole #FFD16A, carta #F4FAFC. Outfit per parola/comandi, DM Sans per spiegazioni. Gli oggetti del disegno diventano protagonisti dell'azione, senza nuove card decorative o animazioni continue. Testi principali almeno18px, bersagli almeno48px, tastiera e touch equivalenti, focus visibile, movimento ridotto rispettato.

```text
stessa scena della scheda         stessa parola al plurale
Conta con me → tocca gli oggetti  Componi → scegli tessere → controlla
              1,2,3                          annulla / scrivi tu
              ricomincia                    stesso aiuto salvato
```

Pausa, altro profilo, altra domanda o uscita invalidano immediatamente eventi e risposte tardive. Non si modifica la priorità del dettato già corretta, la home o i cinque percorsi. Nessuna nuova richiesta al sito per superare il403 cloud supplementare; prove locali sintetiche e pubblicazione ordinaria dopo tutti i controlli.

## Prove richieste

Contenuti identici byte per byte alla base; nessun nuovo tema. Aiuto confermato prima dell'effetto, quota/errori e profilo/dispose; idempotenza del conteggio; tessere duplicate, spazi e parole composte; annulla/ricomincia/tastiera; input ordinario ancora funzionante; pausa/reload conserva hint; nessuna modifica a economia o archivi legacy. Screenshot320/390/1360, test originali grammatica e dettato senza soglie indebolite; nuova suite dedicata mantenendo tutte le62 precedenti.

## Revisione del rendering reale

La nuova prova a320px ha riprodotto un conflitto già presente nell’atlante: `#trainingHub .trainingWordArt` imponeva180px al temperino e portava la pagina a344px. Il selettore dedicato alla grammatica ora prevale e limita il disegno al proprio oggetto: documento320px su viewport320, senza nascondere contenuti o ridurre i bersagli.

Con17tessere, l’input ordinario non mostra tutta “pencil sharpeners” nello stesso momento. Durante la composizione compare anche un’anteprima grande e avvolta, contenente soltanto i caratteri scelti. La “s” finale resta visibile. Reset e ritorno alla tastiera la nascondono; non anticipa alcuna risposta. Il compositore di frasi conserva ora il focus dopo rimozione/annulla.

La suite obbligatoria `grammar-aids` verifica il checksum dell’intero training.json pubblicato: `aa4ebe404d8516f0047b64c0b34677050402fdae5d4b9517180003565ebdd4cd`. Un futuro materiale dell’insegnante richiederà l’aggiornamento intenzionale di questo vincolo e delle prove; non va eliminato per aggiungere temi autonomamente. Copre tre composti, doppie e spazi,320/390/1360px, aiuto prima dell’effetto, errori quota, navigazione e cambi profilo/passo tardivi, richieste concorrenti, ripresa, report guidato e isolamento degli archivi precedenti.

Le prove locali usano Chromium154 e profili sintetici. La pipeline mantiene tutte le62suite originali e aggiunge questa63esima, con il browser CI fissato dal repository. Audio sul dispositivo reale, vecchio tablet e screen reader fisici non vengono attestati da questi collaudi. Pubblicazione e controlli live devono risultare riusciti sul commit finale: il solo codice o una prova locale non dimostrano la versione online.

Chiusura locale:49verify e8suite browser pertinenti PASS; performance isolata391,5ms con5s invariati. Pacchetto55file/48static e versionamento idempotente. Le prove e immagini della prima collisione sono conservate separatamente da quelle corrette. La nuova pipeline63/deploy deve ancora attestare la pubblicazione del commit finale.
