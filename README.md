# Turni-accesso

Link di ingresso a Calendario Turni 1.0. Registra in forma anonima i dispositivi
(codice casuale + data della prima visita) e poi apre Turni 1.0.

- `public/index.html` pagina di accesso
- `src/worker.js` servizio che registra il codice (la tabella si crea da sola)
- `wrangler.jsonc` configurazione e collegamento al database D1 `accesso-turni-1-0`

## Letture utili (console del database D1)

Totale dispositivi:
    SELECT COUNT(*) AS dispositivi FROM dispositivi;

Nuovi dispositivi per giorno:
    SELECT substr(prima_visita, 1, 10) AS giorno, COUNT(*) AS nuovi
    FROM dispositivi GROUP BY giorno ORDER BY giorno DESC;

Cancellare le righe di prova:
    DELETE FROM dispositivi;
