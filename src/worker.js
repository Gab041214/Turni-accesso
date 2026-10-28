// Registra in forma anonima i dispositivi che aprono il link di accesso.
// Salva solo: codice casuale del dispositivo + data della prima visita.
// Nessun IP, nessun nome, nessun altro dato.

const CODICE_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/registra") {
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
          env.DB.prepare(
            "CREATE TABLE IF NOT EXISTS dispositivi (codice TEXT PRIMARY KEY, prima_visita TEXT NOT NULL)",
          ),
          env.DB.prepare(
            "INSERT OR IGNORE INTO dispositivi (codice, prima_visita) VALUES (?, ?)",
          ).bind(codice, new Date().toISOString()),
        ]);
      } catch {
        return new Response(null, { status: 500 });
      }
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }

    // Tutto il resto: la pagina e le icone sono servite dalla cartella "public".
    return new Response("Non trovato", { status: 404 });
  },
};
