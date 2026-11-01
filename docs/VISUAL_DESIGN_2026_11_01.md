# Revisione grafica per il rilascio

Skill installata: `.agents/skills/frontend-design`, fonte ufficiale Anthropic, commit e checksum in UPSTREAM.json, licenza Apache 2.0 conservata. È una guida di progetto; non viene eseguito codice esterno e non viene installato alcun servizio a pagamento.

## Piano prima della modifica

Pubblico: bambini di 6–7 anni, con genitori/insegnanti nelle aree dedicate. Identità: un piccolo mondo di giocattoli 3D. La scena originale e i personaggi sono il punto memorabile; la pagina accompagna il gioco, non diventa un catalogo di premi da scorrere prima di poter iniziare.

Token: neve `#f2f8fb`, inchiostro `#193e55`, abete `#22654f`, bacca `#c24562`, stella `#ffd36e`, ghiaccio `#d6ebf0`. Restano Outfit per titoli e DM Sans per istruzioni, già usati dal sito; nessun nuovo caricamento di font. Titoli 28–36px, istruzioni 20px, lettere 27–36px, azioni almeno 48px.

Layout, allineato a sinistra per leggere e con la scena centrata:

```
[titolo e periodo]
[       scena 3D       ]
[missione / azione principale]
[elfo facoltativo, quando disponibile]
[collezione espandibile, sempre raggiungibile]
[guardaroba]
```

Per il Passaporto annuale si conserva il prossimo traguardo prima della missione. Tutte le destinazioni inventariate restano raggiungibili: nessun gioco, oggetto, report o comando account viene rimosso. Nuovi percorsi: #scoperte, #festivita/#natale e filtro Personaggi Natale.

## Critica del piano

La base precedente ripeteva pannelli crema con bordi arrotondati e poneva 27 premi prima della missione. Il vero elemento specifico è il giocattolo 3D: concentriamo lì la ricchezza, con uno sfondo neve più sobrio e un'azione netta. La collezione resta espandibile con tastiera; gli stati/errori e la pausa sono invariati. Nessuna nuova animazione automatica, libreria, mascotte o immagine remota in questo lotto.

## Implementazione e verifica

Si modificano solo la composizione dei pannelli festivi e gli stili sotto `.holidayPanel`. Si conserva l'album annuale, il prossimo premio e la logica dei server. La regressione holiday verifica anche apertura/chiusura da tastiera dell'album e presenza di tutti i 27 premi. I colori di focus e le dimensioni del testo sono verificati con gli altri test di navigazione/mobile; le anteprime locali restano sintetiche. Installazione della skill e revisioni locali non provano una pubblicazione riuscita.
