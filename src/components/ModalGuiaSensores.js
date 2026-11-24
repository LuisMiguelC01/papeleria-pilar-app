// src/components/ModalGuiaSensores.js
import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
} from "react-native";
import { useTema } from "../context/TemaContext";

export function ModalGuiaSensores({ visible, onCerrar }) {
  const { tema } = useTema();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
    >
      <View style={styles.fondoOscuro}>
        <View
          style={[
            styles.tarjetaGuia,
            { backgroundColor: tema.tarjeta, borderColor: tema.bordeSuave },
          ]}
        >
          <View
            style={[
              styles.encabezadoGuia,
              { borderBottomColor: tema.bordeSuave },
            ]}
          >
            <Text style={[styles.tituloGuia, { color: tema.texto }]}>
              💡 Guía Rápida de Ventas y Sensores
            </Text>
            <Pressable
              style={[
                styles.botonCerrarX,
                { backgroundColor: tema.tarjetaSecundaria },
              ]}
              onPress={onCerrar}
            >
              <Text
                style={[styles.textoCerrarX, { color: tema.textoSecundario }]}
              >
                ✕
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.cuerpoGuia}>
            <View
              style={[
                styles.itemGuia,
                {
                  backgroundColor: tema.tarjetaSecundaria,
                  borderLeftColor: tema.primario,
                },
              ]}
            >
              <Text style={[styles.subtituloItem, { color: tema.texto }]}>
                1. 🖐️ Sensor Real (Teléfono)
              </Text>
              <Text
                style={[styles.textoItem, { color: tema.textoSecundario }]}
              >
                Activa "🖐️ Sensor Real" para ajustar cantidades sin tocar la
                pantalla: inclina a la derecha (+1 unidad), a la izquierda (-1
                unidad) o sacude el dispositivo para limpiar la factura actual.
              </Text>
            </View>

            <View
              style={[
                styles.itemGuia,
                {
                  backgroundColor: tema.tarjetaSecundaria,
                  borderLeftColor: tema.primario,
                },
              ]}
            >
              <Text style={[styles.subtituloItem, { color: tema.texto }]}>
                2. 🎛️ Simulación (PC / Web)
              </Text>
              <Text
                style={[styles.textoItem, { color: tema.textoSecundario }]}
              >
                Si estás usando la app desde navegador o sin acelerómetro,
                activa "🎛️ Simulación" para probar los mismos gestos con botones
                en pantalla.
              </Text>
            </View>

            <View
              style={[
                styles.itemGuia,
                {
                  backgroundColor: tema.tarjetaSecundaria,
                  borderLeftColor: tema.primario,
                },
              ]}
            >
              <Text style={[styles.subtituloItem, { color: tema.texto }]}>
                3. 📷 Verificador Visual con Cámara
              </Text>
              <Text
                style={[styles.textoItem, { color: tema.textoSecundario }]}
              >
                Pulsa "📷 Cámara" para abrir la vista previa del empaque en
                mostrador y cargar el artículo disponible. Si rechazas el
                permiso, la venta manual sigue funcionando normalmente.
              </Text>
            </View>

            <View
              style={[
                styles.itemGuia,
                {
                  backgroundColor: tema.tarjetaSecundaria,
                  borderLeftColor: tema.primario,
                },
              ]}
            >
              <Text style={[styles.subtituloItem, { color: tema.texto }]}>
                4. 🛒 Facturas Multi-Producto
              </Text>
              <Text
                style={[styles.textoItem, { color: tema.textoSecundario }]}
              >
                Selecciona un artículo disponible, elige su cantidad y pulsa "+
                Agregar" para sumar más artículos a la misma factura. Finaliza
                con "✓ Registrar Venta".
              </Text>
            </View>
          </ScrollView>

          <Pressable
            style={[styles.botonEntendido, { backgroundColor: tema.primario }]}
            onPress={onCerrar}
          >
            <Text style={styles.textoEntendido}>
              Entendido, volver a Ventas
            </Text>
          </Pressable>
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
  tarjetaGuia: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "85%",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  encabezadoGuia: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 12,
  },
  tituloGuia: { fontSize: 17, fontWeight: "bold", flex: 1 },
  botonCerrarX: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textoCerrarX: { fontSize: 16, fontWeight: "bold" },
  cuerpoGuia: { marginBottom: 14 },
  itemGuia: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  subtituloItem: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  textoItem: { fontSize: 13, lineHeight: 19 },
  botonEntendido: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  textoEntendido: { color: "#FFFFFF", fontWeight: "bold", fontSize: 15 },
});