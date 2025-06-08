//version1.04 trying

// 🚀 설치되자마자 새로 적용
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// 🔔 푸시 알림
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || '알림', {
      body: data.body || '새 메시지가 있습니다.',
      icon: 'icon-512.png',
      data: { url: '/' } // 알림 클릭 시 열릴 URL
    })
  );
});


// 👆 푸시 알림 클릭 시 index로 이동
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
}); 
