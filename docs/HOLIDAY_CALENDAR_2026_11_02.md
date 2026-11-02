# Calendario delle feste e arrivi di Birillo

## Direzione del lotto

Il bambino deve riconoscere la festa aperta e sapere quando arriva Birillo, senza confondere il visitatore con Elio e Stella del guardaroba. La missione del giorno rimane davanti agli album e ai dettagli del calendario; nessuna attività precedente sparisce.

Palette: carta `#fffdf6`, inchiostro `#193e55`, foglia `#22583d`, cielo `#f2f7fb`, attesa solare `#fff6d9`. Titoli Outfit da 22–26 px, testo/etichette/date da 18 px; azioni almeno 48 px. Il colore accompagna sempre parole esplicite Aperto/In arrivo.

Layout:

```
[scena del villaggio]
[quattro ingressi alle feste già esistenti]
[Calendario delle feste: aperte/in arrivo ▸]
[nome e periodo della festa scelta]
[missione del giorno / indicazione di chiusura]
[Birillo: annuncio oppure Vai da Birillo]
[scherzo facoltativo, solo quando realmente aperto]
[collezione dei premi ▸]
```

Un secondo elenco sempre aperto avrebbe spinto di nuovo le azioni sotto una lunga pagina. Il calendario usa quindi un dettaglio nativo apribile da tastiera: i quattro ingressi originali restano visibili e le schede aggiungono date/stato e una visita esplicita. La scelta di una scheda porta al titolo del villaggio scelto.

## Contratto dei dati

- Stato/giorno/date arrivano dall'endpoint privato esistente `holiday-state`, con `timezone=Europe/Rome`; l'orologio del dispositivo non decide aperture.
- Le quattro festività conservano `opens`, `closes`, `lastDay` e `active` già presenti.
- Solo Natale riceve `elfSchedule`: `opens`, `closes`, `lastDay`, `active`, `phase`. Sono metadati aggiuntivi, derivati dal server dalla stessa stagione e dalla finestra 8 dicembre–7 gennaio compreso.
- `holidayElf()` non cambia: dopo la chiusura il vero visitatore resta `null`, non viene creato alcuno scherzo, personaggio o premio anticipato.
- Dopo l'8 gennaio il server sceglie la prossima edizione natalizia: la scheda mostra quella prossima visita e il suo anno. Non si inventa una data storica non presente nella risposta.
- Per l'ospite resta un annuncio annuale 8 dicembre–7 gennaio, con invito ad accedere per vedere le attività del giorno. Nessun calendario attivo viene dedotto dal browser e nessun endpoint pubblico nuovo è introdotto.

## Compatibilità e dati

I quattro controlli `data-holiday`, la pausa, il ritorno dagli esercizi, i portali anche a hash invariato, gli album, il guardaroba e il replay degli scherzi restano. La scheda di arrivo ha ID `elfArrivalCard`; il vero `elfPanel` esiste soltanto durante la visita attiva. Elio e Stella sono descritti separatamente come personaggi del guardaroba.

Nessuna modifica alle finestre degli eventi, alle regole dei premi, alle monete o alle autorizzazioni. Nessun servizio nuovo o dato reale utilizzato.

## Verifiche eseguite

- `python3 scripts/test-holiday-calendar.py` — PASS: nove casi tra novembre, 7/8 dicembre, 1/7/8 gennaio, cambio edizione e confini UTC che diventano mezzanotte italiana; portafoglio invariato e vecchio contratto `elf=null` conservato.
- `python3 scripts/test-elf.py` — PASS: regressione precedente con 31 giorni/cinque scherzi, riapertura annuale, premi da esercizi e idempotenza invariati.
- `bash scripts/test-browser.sh holiday-calendar` — PASS: calendario server nonostante data browser 2099; annuncio ospite; arrivo/assenza del vero NPC; tastiera, portale stesso hash, 320/390/1360 px, testo da 18 px, bersagli da 48 px, ricordo già posseduto conservato e nessuna richiesta di scrittura dal calendario.
- Controlli di sintassi JS/PHP/Python e `git diff --check` — PASS.

I test runtime di questo lotto usano una copia locale isolata di `6819fe4`, con i soli file calendario e il relativo wrapper sovrapposti. Non rappresentano ancora la verifica cumulativa delle modifiche degli altri lotti. Dati, account e documenti sono sintetici. Le tre catture della scheda Birillo (attesa, visita, prossima edizione) sono state anche esaminate visivamente; resta da validare il rendering sui dispositivi reali.

Lo stato di pubblicazione e l'esito finale dei test vanno riferiti al commit/run integrato dal coordinatore, non dedotti da questa descrizione.
