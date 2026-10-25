# Audit avatar/premi — 25 ottobre, solo work

Due problemi riprodotti su fixture:

1. Memoria locale piena: l’acquisto ospite equipaggiava Panda in memoria e mostrava successo, pur conservando il vecchio wallet nel browser. Test prima FAIL: panda != fox. Ora la nuova scelta viene preparata su una copia e resa attiva solo dopo il salvataggio riuscito. Con errore restano invariati saldo, inventario e personaggio; messaggio accanto all’oggetto, leggibile, senza falsa conferma. Vale anche per scelte gratuite. Non cambia il salvataggio delle altre modalità.
2. Due clic sulla stessa anteprima aggiungevano due contesti WebGL (6→8 misurati), senza cambiamento visivo. Ora l’anteprima identica riusa la scena: 6→6, zero contesti aggiunti. Se cambia oggetto la scena viene ancora aggiornata normalmente. Non è una misura FPS.

Audit API: il server già usa transazione e appartenenza all’inventario per evitare doppi addebiti. Test browser con acquisto committato e risposta persa, poi ripetuto: saldo 100→70, una sola copia di Panda; doppio clic genera una sola richiesta. Secondo dispositivo e reload confermano oggetto e saldo. Nessun difetto di doppio addebito emerso in questi casi. Con risposta di rete non confermata l’interfaccia invita a ricaricare per verificare saldo/oggetti, senza fingere un annullamento server.

PASS browser: wallet, wardrobe, rewards, characters, navigation, performance, resume. Dopo l’ultimo miglioramento al messaggio d’errore, wallet e wardrobe rieseguiti PASS; altre modifiche limitate al testo/nota vicino all’oggetto. Statici JS/PWA/rewards/lessons/learning e bundle PASS; API adventures PASS con gli stessi cataloghi/economie. Corretto anche un errore della nuova fixture: dopo UPDATE wallet fuori banda serviva reload esplicito, non navigazione alla stessa URL; il timeout iniziale non viene attribuito al prodotto.

Screenshot [errore memoria ospite, 390px](review/guest-wallet-storage-390.png), solo dati fittizi. Nuova suite wallet aggiunta alla futura CI; nessuna nuova CI remota/deploy o account reale. Tutti i 48 premi e le regole di XP/monete esistenti conservati. Ultima release live verificata resta 22f2d60; questi fix e i precedenti sono solo work.
