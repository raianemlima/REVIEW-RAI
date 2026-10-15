// Revisão DPE · service worker
// Offline: o app e as fontes ficam guardados no aparelho. Atualização: a versão nova espera o aviso "Atualizar".
const CACHE = "revisao-dpe-v65", DADOS = "revisao-dpe-dados";
const CORE = ["./", "index.html", "manifest.webmanifest", "privacidade.html", "termos.html", "icons/icon.svg", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
  "fonts/fonts.css", "fonts/ibm-plex-sans-latin-400-normal.woff2", "fonts/ibm-plex-sans-latin-500-normal.woff2", "fonts/ibm-plex-sans-latin-600-normal.woff2",
  "fonts/ibm-plex-mono-latin-400-normal.woff2", "fonts/ibm-plex-mono-latin-500-normal.woff2",
  "fonts/newsreader-latin-400-normal.woff2", "fonts/newsreader-latin-500-normal.woff2", "fonts/newsreader-latin-600-normal.woff2", "fonts/newsreader-latin-400-italic.woff2"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE))); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== DADOS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", e => {
  const d = e.data || {};
  if (d.type === "SKIP_WAITING") self.skipWaiting();
  if (d.type === "LEMBRETE_AGORA") e.waitUntil(avisar(true));
  if (d.type === "LEMBRETE_CHECAR") e.waitUntil(avisar(false));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return;   // só o próprio site: a API do GitHub (sincronização) nunca passa pelo cache
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match("index.html"))));
});

// ---- lembrete diário (Android/Chrome com o app instalado: Periodic Background Sync) ----
const dia = ts => { const d = new Date(ts - 4 * 3600000); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
async function lerResumo() { try { const c = await caches.open(DADOS), r = await c.match("resumo.json"); return r ? await r.json() : null; } catch (e) { return null; } }
async function gravar(nome, obj) { const c = await caches.open(DADOS); await c.put(nome, new Response(JSON.stringify(obj))); }
async function avisar(forcar) {
  const r = await lerResumo(); if (!r || (!r.on && !forcar)) return;
  const agora = new Date(), hoje = dia(agora.getTime());
  if (!forcar) {
    const [hh, mm] = String(r.hora || "19:00").split(":").map(Number);
    if (agora.getHours() * 60 + agora.getMinutes() < hh * 60 + mm) return;          // ainda não é a hora
    const u = await (async () => { try { const c = await caches.open(DADOS), x = await c.match("ultimo.json"); return x ? await x.json() : {}; } catch (e) { return {}; } })();
    if (u.dia === hoje) return;                                                       // já avisou hoje
  }
  const venc = (r.vencidos && r.vencidos[hoje]) != null ? r.vencidos[hoje] : (r.vencidosHoje || 0);
  const corpo = venc > 0 ? `Você tem ${venc} ${venc === 1 ? "revisão" : "revisões"} para hoje. Dá para fazer em poucos minutos.` : "Abra o app e veja o plano de hoje.";
  await self.registration.showNotification("Hora de revisar", { body: corpo, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "lembrete-diario", data: { url: "./?acao=sessao" } });
  if (!forcar) await gravar("ultimo.json", { dia: hoje });
}
self.addEventListener("periodicsync", e => { if (e.tag === "lembrete-diario") e.waitUntil(avisar(false)); });
self.addEventListener("notificationclick", e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => { for (const c of cs) if ("focus" in c) { c.focus(); if (c.navigate) c.navigate(url); return; } return self.clients.openWindow(url); }));
});
