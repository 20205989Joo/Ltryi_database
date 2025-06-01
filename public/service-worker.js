// service-worker.js
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || '알림', {
      body: data.body || '새 메시지가 있습니다.',
      icon: 'icon.png'
    })
  );
});
