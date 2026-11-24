// src/services/authGoogleService.js
import { Platform } from "react-native";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth, FIREBASE_CONFIGURADO } from "./firebaseConfig";

export const GOOGLE_AUTH_DISPONIBLE = Boolean(
  Platform.OS === "web" && FIREBASE_CONFIGURADO && auth,
);

export async function iniciarSesionConGoogle() {
  if (!GOOGLE_AUTH_DISPONIBLE) {
    throw new Error(
      "El inicio de sesión con Google está disponible en la versión Web.",
    );
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const resultado = await signInWithPopup(auth, provider);
    const user = resultado.user;

    return {
      uid: user.uid,
      nombre: user.displayName || user.email?.split("@")[0] || "Vendedor Invitado",
      email: user.email || "",
    };
  } catch (error) {
    if (error?.code === "auth/popup-closed-by-user") {
      throw new Error("Cerraste la ventana de Google antes de finalizar.");
    }
    if (error?.code === "auth/popup-blocked") {
      throw new Error(
        "El navegador bloqueó la ventana emergente. Permite ventanas emergentes e intenta de nuevo.",
      );
    }
    if (error?.code === "auth/unauthorized-domain") {
      throw new Error(
        "Este dominio aún no está autorizado en Firebase Authentication.",
      );
    }
    throw new Error(error?.message || "No se pudo iniciar sesión con Google.");
  }
}

export async function cerrarSesionGoogle() {
  if (Platform.OS === "web" && auth) {
    try {
      await signOut(auth);
    } catch {
      // Ignorar si no había sesión activa de Google
    }
  }
}