// src/components/ModalMensaje.js
import React from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { useTema } from "../context/TemaContext";

export function ModalMensaje({ dialogo, onCerrar }) {
  const { tema } = useTema();
  if (!dialogo) return null;

  const tipo = dialogo.tipo || "info";
  const esConfirmacion = tipo === "confirmar";

  const visualPorTipo = {
    exito: {
      icono: "✅",
      fondo: tema.exitoFondo,
      borde: tema.exito,
    },
    error: {
      icono: "⚠️",
      fondo: tema.peligroFondo,
      borde: tema.peligroBorde,
    },
    confirmar: {
      icono: "🗑️",
      fondo: tema.peligroFondo,
      borde: tema.peligroBorde,
    },
    info: {
      icono: "ℹ️",
      fondo: tema.primarioSuave,
      borde: tema.primarioBorde,
    },
  };

  const visual = visualPorTipo[tipo] || visualPorTipo.info;

  const ejecutarConfirmacion = () => {
    const accion = dialogo.onConfirmar;
    onCerrar();
    if (typeof accion === "function") {
      accion();
    }
  };

  return (
    <Modal
      visible={Boolean(dialogo)}
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
    >
      <View style={styles.fondoOscuro}>
        <View
          style={[
            styles.tarjeta,
            { backgroundColor: tema.tarjeta, borderColor: tema.bordeSuave },
          ]}
        >
          <View
            style={[
              styles.circuloIcono,
              { backgroundColor: visual.fondo, borderColor: visual.borde },
            ]}
          >
            <Text style={styles.icono}>{visual.icono}</Text>
          </View>

          <Text style={[styles.titulo, { color: tema.texto }]}>
            {dialogo.titulo || "Aviso"}
          </Text>
          <Text style={[styles.mensaje, { color: tema.textoSecundario }]}>
            {dialogo.mensaje}
          </Text>

          <View style={styles.filaBotones}>
            {esConfirmacion && (
              <Pressable
                style={[
                  styles.botonCancelar,
                  { backgroundColor: tema.tarjetaSecundaria },
                ]}
                onPress={onCerrar}
              >
                <Text
                  style={[
                    styles.textoCancelar,
                    { color: tema.textoSecundario },
                  ]}
                >
                  {dialogo.textoCancelar || "Cancelar"}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.botonAceptar,
                { backgroundColor: esConfirmacion ? "#DC2626" : tema.primario },
              ]}
              onPress={esConfirmacion ? ejecutarConfirmacion : onCerrar}
            >
              <Text style={styles.textoAceptar}>
                {dialogo.textoConfirmar || "Aceptar"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondoOscuro: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  tarjeta: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  circuloIcono: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  icono: { fontSize: 24 },
  titulo: {
    fontSize: 17,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  mensaje: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  filaBotones: { flexDirection: "row", gap: 10, width: "100%" },
  botonCancelar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  textoCancelar: { fontWeight: "bold", fontSize: 14 },
  botonAceptar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  textoAceptar: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
});