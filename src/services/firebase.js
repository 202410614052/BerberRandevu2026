import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBCVO_TsjCS1JGqG5R4Yjydn_83PJRPyM8",
  authDomain: "berberrandevu2026.firebaseapp.com",
  projectId: "berberrandevu2026",
  storageBucket: "berberrandevu2026.firebasestorage.app",
  messagingSenderId: "213989020310",
  appId: "1:213989020310:web:b4f8a7663c3caa6ee2e8b7",
  measurementId: "G-D7CB3MB9ZS",
};

const VAPID_KEY =
  "BL_7YuqLSDAukUFugVH2pQLtpwPPysaePb3wGAzc0d444CCLvKI6HZEbrX-GCiESuz56ixYnDHH3BtbTdlCbt7c";

const firebaseApp = initializeApp(firebaseConfig);

export const requestNotificationToken = async () => {
  try {
    const messagingSupported = await isSupported();

    if (!messagingSupported) {
      throw new Error(
        "Bu cihaz veya tarayıcı bildirim sistemini desteklemiyor."
      );
    }

    if (!("Notification" in window)) {
      throw new Error("Bu tarayıcı bildirimleri desteklemiyor.");
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      throw new Error("Bildirim izni verilmedi.");
    }

    const serviceWorkerRegistration =
      await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );

    const messaging = getMessaging(firebaseApp);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration,
    });

    if (!token) {
      throw new Error("Bildirim cihaz anahtarı oluşturulamadı.");
    }

    return token;
  } catch (error) {
    console.error("Bildirim anahtarı alınamadı:", error);
    throw error;
  }
};

export const listenForegroundNotifications = async (
  callback
) => {
  const messagingSupported = await isSupported();

  if (!messagingSupported) {
    return null;
  }

  const messaging = getMessaging(firebaseApp);

  return onMessage(messaging, (payload) => {
    console.log("Yeni bildirim:", payload);

    if (typeof callback === "function") {
      callback(payload);
    }
  });
};

export { firebaseApp };