// Registra in forma anonima i dispositivi che aprono il link di accesso
// e, con password, mostra le statistiche (solo lettura).
// Salva solo: codice casuale del dispositivo + data della prima visita.
// Nessun IP, nessun nome, nessun altro dato.

const CODICE_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CREA_TABELLA =
  "CREATE TABLE IF NOT EXISTS dispositivi (codice TEXT PRIMARY KEY, prima_visita TEXT NOT NULL)";
const FUSO = "Europe/Rome";
const GIORNI_MOSTRATI = 14;

function risposta(corpo, stato = 200) {
  return new Response(corpo === null ? null : JSON.stringify(corpo), {
    status: stato,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Confronto a tempo costante, per non rivelare la password un carattere alla volta.
function uguali(a, b) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

// Giorno (AAAA-MM-GG) nel fuso italiano.
function giornoItalia(data) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

async function registra(request, env) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }
  let codice = "";
  try {
    const testo = await request.text();
    if (testo.length > 100) return new Response(null, { status: 400 });
    codice = String(JSON.parse(testo).codice || "").toLowerCase();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!CODICE_VALIDO.test(codice)) return new Response(null, { status: 400 });

  try {
    await env.DB.batch([
      env.DB.prepare(CREA_TABELLA),
      env.DB.prepare(
        "INSERT OR IGNORE INTO dispositivi (codice, prima_visita) VALUES (?, ?)",
      ).bind(codice, new Date().toISOString()),
    ]);
  } catch {
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

async function statistiche(request, env) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }
  const segreto = env.STATISTICHE_PASSWORD;
  if (!segreto) return risposta({ errore: "password non impostata" }, 503);

  let inviata = "";
  try {
    const testo = await request.text();
    if (testo.length > 300) return risposta({ errore: "richiesta non valida" }, 400);
    inviata = String(JSON.parse(testo).password || "");
  } catch {
    return risposta({ errore: "richiesta non valida" }, 400);
  }
  if (!uguali(inviata, segreto)) {
    await new Promise((r) => setTimeout(r, 600)); // rallenta i tentativi a vuoto
    return risposta({ errore: "password errata" }, 401);
  }

  const adesso = new Date();
  const limite = new Date(adesso.getTime() - 35 * 24 * 3600 * 1000).toISOString();
  let totale = 0;
  let righe = [];
  try {
    const esiti = await env.DB.batch([
      env.DB.prepare(CREA_TABELLA),
      env.DB.prepare("SELECT COUNT(*) AS n FROM dispositivi"),
      env.DB.prepare("SELECT prima_visita FROM dispositivi WHERE prima_visita >= ?").bind(limite),
    ]);
    totale = (esiti[1].results[0] && esiti[1].results[0].n) || 0;
    righe = esiti[2].results || [];
  } catch {
    return risposta({ errore: "database non raggiungibile" }, 500);
  }

  const perGiorno = {};
  for (const r of righe) {
    const g = giornoItalia(new Date(r.prima_visita));
    perGiorno[g] = (perGiorno[g] || 0) + 1;
  }
  const giorni = [];
  for (let i = 0; i < 30; i++) {
    const g = giornoItalia(new Date(adesso.getTime() - i * 24 * 3600 * 1000));
    giorni.push({ g, n: perGiorno[g] || 0 });
  }
  const somma = (k) => giorni.slice(0, k).reduce((s, x) => s + x.n, 0);

  return risposta({
    totale,
    oggi: giorni[0].n,
    sette: somma(7),
    trenta: somma(30),
    giorni: giorni.slice(0, GIORNI_MOSTRATI),
    aggiornato: adesso.toISOString(),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/registra") return registra(request, env);
    if (url.pathname === "/api/statistiche") return statistiche(request, env);
    // Tutto il resto: le pagine e le icone sono servite dalla cartella "public".
    return new Response("Non trovato", { status: 404 });
  },
};
