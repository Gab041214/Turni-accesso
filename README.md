# Turni-accesso

Link di ingresso a Calendario Turni 1.0. Registra in forma anonima i dispositivi
(codice casuale + data della prima visita) e poi apre Turni 1.0.

- `public/index.html` pagina di accesso
- `public/statistiche.html` statistiche (solo per il proprietario, con password):
  indirizzo `/statistiche`
- `src/worker.js` servizio che registra il codice e fornisce i numeri alle statistiche
  (la tabella si crea da sola)
- `wrangler.jsonc` configurazione e collegamento al database D1 `accesso-turni-1-0`

## Password delle statistiche

Si imposta in Cloudflare, nel progetto `turni-accesso`: Impostazioni, Variabili e
segreti, Aggiungi, tipo **Segreto**, nome `STATISTICHE_PASSWORD`.

## Letture manuali (console del database D1)

Totale dispositivi:
    SELECT COUNT(*) AS dispositivi FROM dispositivi;

Nuovi dispositivi per giorno:
    SELECT substr(prima_visita, 1, 10) AS giorno, COUNT(*) AS nuovi
    FROM dispositivi GROUP BY giorno ORDER BY giorno DESC;

Cancellare tutte le righe (non si può annullare):
    DELETE FROM dispositivi;
