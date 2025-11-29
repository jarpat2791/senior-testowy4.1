// Service Worker dla Senior-Easy PWA
const CACHE_NAME = 'senior-easy-v3.0';
const STATIC_CACHE = 'senior-easy-static-v3.0';
const DYNAMIC_CACHE = 'senior-easy-dynamic-v3.0';

// Zasoby do cache'owania podczas instalacji
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/css/styles.css',
  '/js/app.js'
];

// Ikony do cache'owania
const ICON_ASSETS = [
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png', 
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico'
];

// Zasoby zewnętrzne
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'
];

// Instalacja Service Workera
self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker: Instalowanie...');
  
  event.waitUntil(
    Promise.all([
      // Cache dla zasobów statycznych
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('📦 Cacheowanie zasobów statycznych...');
          return cache.addAll(STATIC_ASSETS);
        }),
      
      // Cache dla ikon
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('🎨 Cacheowanie ikon...');
          return cache.addAll(ICON_ASSETS);
        }),
      
      // Cache dla zasobów zewnętrznych
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          console.log('🌐 Cacheowanie zasobów zewnętrznych...');
          return cache.addAll(EXTERNAL_ASSETS);
        })
    ]).then(() => {
      console.log('✅ Service Worker: Zainstalowany pomyślnie');
      return self.skipWaiting();
    }).catch((error) => {
      console.error('❌ Service Worker: Błąd instalacji', error);
    })
  );
});

// Aktywacja Service Workera
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Aktywacja...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Usuwanie starych cache'ów
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== CACHE_NAME) {
            console.log('🗑️ Usuwanie starego cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Aktywowany pomyślnie');
      return self.clients.claim();
    })
  );
});

// Interceptowanie requestów
self.addEventListener('fetch', (event) => {
  // Pomijanie żądań innych niż HTTP/HTTPS
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Zwróć zasób z cache jeśli istnieje
        if (cachedResponse) {
          console.log('📂 Zasób z cache:', event.request.url);
          return cachedResponse;
        }

        // W przeciwnym razie pobierz z sieci
        return fetch(event.request)
          .then((networkResponse) => {
            // Cache'owanie tylko dla pomyślnych odpowiedzi
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  // Cache'owanie tylko dla zasobów z tej samej domeny
                  if (event.request.url.startsWith(self.location.origin)) {
                    console.log('💾 Cacheowanie nowego zasobu:', event.request.url);
                    cache.put(event.request, responseToCache);
                  }
                });
            }
            
            return networkResponse;
          })
          .catch((error) => {
            console.log('🌐 Błąd sieci, sprawdzam cache...');
            
            // Dla strony głównej - zwróć offline.html
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html')
                .then((offlineResponse) => {
                  return offlineResponse || new Response('Brak połączenia z internetem', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                      'Content-Type': 'text/html'
                    })
                  });
                });
            }
            
            // Dla obrazków - zwróć placeholder
            if (event.request.destination === 'image') {
              return new Response(
                '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#e5e7eb"/><text x="50" y="50" font-family="Arial" font-size="10" text-anchor="middle" fill="#6b7280">Brak obrazka</text></svg>',
                {
                  headers: { 'Content-Type': 'image/svg+xml' }
                }
              );
            }
            
            // Dla innych zasobów - zwróć podstawową odpowiedź
            return new Response('Zasób niedostępny offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Obsługa wiadomości
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Obsługa synchronizacji w tle
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Synchronizacja w tle...');
    event.waitUntil(doBackgroundSync());
  }
});

// Funkcja synchronizacji w tle
function doBackgroundSync() {
  return new Promise((resolve) => {
    // Tutaj można dodać logikę synchronizacji danych
    console.log('🔄 Wykonywanie synchronizacji w tle...');
    resolve();
  });
}

// Obsługa powiadomień push
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Nowa wiadomość z Senior-Easy',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Otwórz aplikację',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Zamknij',
        icon: '/icons/icon-72x72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Senior-Easy', options)
  );
});

// Obsługa kliknięć w powiadomienia
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});
