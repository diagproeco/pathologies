/* Pathologies audit : garde une copie de l'appli pour l'ouvrir sans réseau.
   Page : réseau d'abord (3,5 s au plus), sinon la copie ; le reste : la copie d'abord. */
const CACHE = "pathologies-v2";
const FICHIERS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./icon-180.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const url = new URL(r.url);
  if (url.origin !== location.origin) return;
  if (r.mode === "navigate") {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const net = await Promise.race([fetch(r), new Promise((_, j) => setTimeout(() => j(new Error("lent")), 3500))]);
        if (net && net.ok) c.put("./index.html", net.clone());
        return net;
      } catch (err) {
        return (await c.match("./index.html")) || (await c.match("./")) || Response.error();
      }
    })());
    return;
  }
  e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => {
    if (res.ok) { const copie = res.clone(); caches.open(CACHE).then((c) => c.put(r, copie)); }
    return res;
  })));
});
