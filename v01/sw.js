'use strict';
// Tender Tour Capture - service worker (app shell cache, offline first)
const CACHE = 'ttc-v01-test-2';   // V.01 test copy: distinct cache, never shares with live v1.0.0
const SHELL = ['./', './index.html', './manifest.webmanifest', './jszip.min.js', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ttc-v01-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin (Gemini) calls
  if (url.pathname.endsWith('/ping.txt')) return; // connectivity check must hit the network
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    })
  );
});

// Background Sync (Chromium): wake the page so it can run the queued AI checks.
self.addEventListener('sync', (e) => {
  if (e.tag === 'ttc-ai-queue') {
    e.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then((cs) => cs.forEach((c) => c.postMessage({ type: 'run-queue' })))
    );
  }
});
