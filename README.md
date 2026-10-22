# WordyLand

Gioco educativo di inglese per bambini e bambine di circa 7 anni.

## Versione attuale

- Sei ambientazioni selezionabili: spazio, animali, dinosauri, sport, oceano e creatività.
- Personaggio e soprannome personalizzabili sul dispositivo.
- Percorso guidato: osserva, completa, scrivi.
- Dettato, lettere da riordinare, ascolto con immagini e scrittura sul quaderno.
- Lessico tratto dai materiali scolastici forniti.
- Progressi e ripasso salvati nel browser con localStorage.

Questa versione è un prototipo statico: non implementa ancora account, database o sincronizzazione tra dispositivi. Il soprannome non è un account utente.

## File

`dist/index.html`: interfaccia e stili.
`dist/data.js`: parole e suggerimenti.
`dist/worlds.js`: ambientazioni e personaggio.
`dist/app.js`: giochi e progressi locali.

## SiteGround

La demo statica può essere servita caricando il contenuto di `dist/` nella cartella web del dominio scelto. L'area utenti e il database richiedono una successiva implementazione server, da configurare dopo la verifica dell'hosting.

Non caricare chiavi SSH, password o configurazioni contenenti segreti nel repository. La configurazione `.openai/hosting.json` appartiene alla demo Sites e non è necessaria per SiteGround.
