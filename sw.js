// Service worker — agora faz sentido cachear o app inteiro (antes só os
// estáticos, já que o HTML vinha do servidor a cada visita; agora não tem
// mais servidor nenhum, então o app pode e deve funcionar 100% offline
// depois da primeira visita). Estratégia cache-first simples.
const CACHE = "minhas-pendencias-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./css/estilo.css",
  "./js/app.js",
  "./js/db.js",
  "./js/pendencias.js",
  "./js/calendario.js",
  "./js/tela-pendencias.js",
  "./js/tela-notas.js",
  "./js/backup.js",
  "./js/auth.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) => Promise.all(nomes.filter((nome) => nome !== CACHE).map((nome) => caches.delete(nome)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evento) => {
  evento.respondWith(
    caches.match(evento.request).then((resposta) => resposta || fetch(evento.request)),
  );
});
