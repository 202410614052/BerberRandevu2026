importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBCVO_TsjCS1JGqG5R4Yjydn_83PJRPyM8",
  authDomain: "berberrandevu2026.firebaseapp.com",
  projectId: "berberrandevu2026",
  storageBucket: "berberrandevu2026.firebasestorage.app",
  messagingSenderId: "213989020310",
  appId: "1:213989020310:web:b4f8a7663c3caa6ee2e8b7",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Arka planda bildirim alındı:", payload);

  const notificationTitle =
    payload.notification?.title || "Yeni Randevu";

  const notificationOptions = {
    body:
      payload.notification?.body ||
      "Yeni bir randevu oluşturuldu.",
    icon: "/logo192.png",
    badge: "/logo192.png",
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});