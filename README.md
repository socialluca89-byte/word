# WordyLand

Gioco educativo di inglese per bambini e bambine di circa 7 anni, basato sui materiali scolastici forniti.

## Funzioni

- Sei mondi: spazio, animali, dinosauri, sport, oceano e creatività.
- Osserva, completa e scrivi; dettato, lettere da riordinare, immagini e quaderno.
- Gioco ospite con progressi sul dispositivo.
- Account adulto e fino a otto profili con soprannome.
- Salvataggio dei progressi sul server e conflitti tra dispositivi segnalati, senza sovrascrivere automaticamente una versione più recente.
- Importazione esplicita dei progressi ospite nel profilo scelto.

## Server

PHP 8.1+ con PDO SQLite. `dist/` è la cartella pubblica. Il database viene creato automaticamente in `.wordyland-data` nella cartella superiore, fuori dalla cartella pubblica. Non caricare database, chiavi o configurazioni segrete nel repository.

Password memorizzate come hash; sessioni HttpOnly, Secure e SameSite Strict; protezione CSRF; richieste SQL preparate; limiti ai tentativi di accesso. I bambini non devono fornire email o date di nascita. Gli account sono gestiti dagli adulti.

## Limiti della prima versione

Il recupero password e la gestione autonoma della cancellazione dell’account non sono ancora implementati. Conservare le credenziali. I progressi ospite restano locali; per sincronizzare occorre scegliere un profilo online. Non usare più dispositivi contemporaneamente sullo stesso profilo: il secondo salvataggio viene bloccato e la copia locale viene conservata per il confronto.

## Verifica

```sh
node scripts/test-lessons.mjs
node scripts/verify-bundle.mjs
php -l dist/api.php
python3 scripts/test-api.py
```

Il test API usa un database temporaneo e verifica accessi, CSRF, persistenza, isolamento degli account e conflitti.

Vedi `docs/DEPLOYMENT.md` per pubblicazione e stato dell’infrastruttura.
