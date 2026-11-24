// src/services/firebaseConfig.js
import { Platform } from "react-native";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim(),
};

export const FIREBASE_CONFIGURADO = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

let db = null;

if (FIREBASE_CONFIGURADO) {
  const yaExiste = getApps().length > 0;
  const app = yaExiste ? getApp() : initializeApp(firebaseConfig);

  if (Platform.OS !== "web" && !yaExiste) {
    try {
      // Necesario en Expo Go (Android/iOS) para que Firestore no se quede colgado
      db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
    } catch {
      db = getFirestore(app);
    }
  } else {
    db = getFirestore(app);
  }
} else {
  console.warn(
    "[Firebase] No se detectaron EXPO_PUBLIC_FIREBASE_API_KEY o PROJECT_ID en .env",
  );
}

export { db };