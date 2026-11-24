// src/context/TemaContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const TEMAS = {
  claro: {
    modo: "claro",
    esOscuro: false,
    fondo: "#EEF2F6",
    tarjeta: "#FFFFFF",
    tarjetaSecundaria: "#F8FAFC",
    borde: "#CBD5E1",
    bordeSuave: "#E2E8F0",
    texto: "#0F172A",
    textoSecundario: "#475569",
    textoSuave: "#64748B",
    primario: "#1D4ED8",
    primarioSuave: "#EFF6FF",
    primarioBorde: "#BFDBFE",
    exito: "#16A34A",
    exitoFondo: "#DCFCE7",
    peligro: "#DC2626",
    peligroFondo: "#FEF2F2",
    peligroBorde: "#FECACA",
    alerta: "#D97706",
    alertaFondo: "#FEF3C7",
    inputFondo: "#F8FAFC",
    barraFondo: "#FFFFFF",
    headerMovilFondo: "#1D4ED8",
  },
  oscuro: {
    modo: "oscuro",
    esOscuro: true,
    fondo: "#0F172A",
    tarjeta: "#1E293B",
    tarjetaSecundaria: "#0F172A",
    borde: "#334155",
    bordeSuave: "#334155",
    texto: "#F8FAFC",
    textoSecundario: "#CBD5E1",
    textoSuave: "#94A3B8",
    primario: "#3B82F6",
    primarioSuave: "#1E3A5F",
    primarioBorde: "#2563EB",
    exito: "#22C55E",
    exitoFondo: "#14532D",
    peligro: "#F87171",
    peligroFondo: "#450A0A",
    peligroBorde: "#7F1D1D",
    alerta: "#FBBF24",
    alertaFondo: "#451A03",
    inputFondo: "#0F172A",
    barraFondo: "#1E293B",
    headerMovilFondo: "#1E293B",
  },
};

const TemaContext = createContext({
  tema: TEMAS.claro,
  esOscuro: false,
  alternarTema: () => {},
});

export function TemaProvider({ children }) {
  const [modo, setModo] = useState("claro");

  useEffect(() => {
    const cargarTema = async () => {
      try {
        const guardado = await AsyncStorage.getItem("@papeleria_tema");
        if (guardado === "oscuro" || guardado === "claro") {
          setModo(guardado);
        }
      } catch (error) {
        console.error("Error al cargar el tema:", error);
      }
    };
    cargarTema();
  }, []);

  const alternarTema = async () => {
    const nuevoModo = modo === "claro" ? "oscuro" : "claro";
    setModo(nuevoModo);
    try {
      await AsyncStorage.setItem("@papeleria_tema", nuevoModo);
    } catch (error) {
      console.error("Error al guardar el tema:", error);
    }
  };

  const tema = TEMAS[modo];

  return (
    <TemaContext.Provider
      value={{ tema, esOscuro: tema.esOscuro, alternarTema }}
    >
      {children}
    </TemaContext.Provider>
  );
}

export function useTema() {
  return useContext(TemaContext);
}