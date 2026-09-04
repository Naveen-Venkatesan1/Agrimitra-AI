// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker context.
firebase.initializeApp({
  apiKey: "AIzaSyAmd92nFC3n9TiJjQIO2nwMft4-fHyW7UU",
  authDomain: "agrimitra-ai-e8b74.firebaseapp.com",
  projectId: "agrimitra-ai-e8b74",
  storageBucket: "agrimitra-ai-e8b74.firebasestorage.app",
  messagingSenderId: "775036005093",
  appId: "1:775036005093:web:0ceb496dc6f7cf31cd820c",
  measurementId: "G-LLZYYGH8KE"
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);
  
  const notificationTitle = payload.notification?.title || 'Smart Irrigation';
  const notificationOptions = {
    body: payload.notification?.body || "It's time to irrigate your field.",
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
