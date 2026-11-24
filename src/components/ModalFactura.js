// src/components/ModalFactura.js
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
  Share,
} from "react-native";
import { useTema } from "../context/TemaContext";
import { formatearFecha, formatearHora } from "../utils/fechaHelpers";

const ICONO_PAGO = {
  Efectivo: "💵",
  Transferencia: "📲",
  Tarjeta: "💳",
};

export function ModalFactura({ venta, onCerrar }) {
  const { tema, esOscuro } = useTema();
  const [copiado, setCopiado] = useState(false);

  if (!venta) return null;

  const numeroFactura =
    venta.numeroFactura || `FAC-${String(venta.id).slice(-4)}`;
  const fechaTexto = formatearFecha(venta);
  const horaTexto = formatearHora(venta);
  const cliente = venta.cliente || "Consumidor Final";
  const vendedor = venta.vendedor || "Administrador";
  const metodoPago = venta.metodoPago || "Efectivo";
  const items = Array.isArray(venta.items) ? venta.items : [];

  const construirTextoRecibo = () => {
    const lineasItems =
      items.length > 0
        ? items
            .map(
              (i) =>
                `- ${i.cantidad}x ${i.nombre} ($${i.precioUnitario.toLocaleString("es-CO")} c/u) = $${i.subtotal.toLocaleString("es-CO")}`,
            )
            .join("\n")
        : `- ${venta.descripcionProductos}`;

    const lineaPago =
      metodoPago === "Efectivo" && venta.montoRecibido > 0
        ? `Método: ${metodoPago} | Recibido: $${venta.montoRecibido.toLocaleString("es-CO")} | Cambio: $${(venta.cambio || 0).toLocaleString("es-CO")}`
        : `Método de pago: ${metodoPago}`;

    return [
      `🛍️ PAPELERÍA PILAR`,
      `Comprobante: ${numeroFactura}`,
      `Fecha: ${fechaTexto} - ${horaTexto}`,
      `Atendido por: ${vendedor}`,
      `Cliente: ${cliente}`,
      `------------------------------`,
      lineasItems,
      `------------------------------`,
      `TOTAL: $${venta.total.toLocaleString("es-CO")}`,
      lineaPago,
    ].join("\n");
  };

  const compartirOCopiar = async () => {
    const texto = construirTextoRecibo();
    try {
      if (Platform.OS === "web") {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2500);
        }
        return;
      }
      await Share.share({
        title: `Comprobante ${numeroFactura}`,
        message: texto,
      });
    } catch (error) {
      console.error("Error al compartir recibo:", error);
    }
  };

  return (
    <Modal
      visible={Boolean(venta)}
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
    >
      <View style={styles.fondoOscuro}>
        <View
          style={[
            styles.tarjetaFactura,
            { backgroundColor: tema.tarjeta, borderColor: tema.bordeSuave },
          ]}
        >
          <View
            style={[
              styles.encabezado,
              { borderBottomColor: tema.bordeSuave },
            ]}
          >
            <View>
              <Text style={[styles.marca, { color: tema.primario }]}>
                🛍️ PAPELERÍA PILAR
              </Text>
              <Text style={[styles.numeroFactura, { color: tema.texto }]}>
                Comprobante {numeroFactura}
              </Text>
            </View>
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

          <ScrollView style={styles.cuerpo}>
            <View
              style={[
                styles.cajaMeta,
                {
                  backgroundColor: tema.tarjetaSecundaria,
                  borderColor: tema.bordeSuave,
                },
              ]}
            >
              <View style={styles.filaMeta}>
                <Text style={[styles.labelMeta, { color: tema.textoSuave }]}>
                  Fecha y hora
                </Text>
                <Text style={[styles.valorMeta, { color: tema.texto }]}>
                  {fechaTexto} • {horaTexto}
                </Text>
              </View>
              <View style={styles.filaMeta}>
                <Text style={[styles.labelMeta, { color: tema.textoSuave }]}>
                  Atendido por
                </Text>
                <Text style={[styles.valorMeta, { color: tema.texto }]}>
                  {vendedor}
                </Text>
              </View>
              <View style={styles.filaMeta}>
                <Text style={[styles.labelMeta, { color: tema.textoSuave }]}>
                  Cliente
                </Text>
                <Text style={[styles.valorMeta, { color: tema.texto }]}>
                  {cliente}
                </Text>
              </View>
              <View style={styles.filaMeta}>
                <Text style={[styles.labelMeta, { color: tema.textoSuave }]}>
                  Método de pago
                </Text>
                <Text style={[styles.valorMeta, { color: tema.texto }]}>
                  {ICONO_PAGO[metodoPago] || "💵"} {metodoPago}
                </Text>
              </View>
            </View>

            <Text style={[styles.tituloSeccion, { color: tema.textoSuave }]}>
              DETALLE DE ARTÍCULOS
            </Text>
            <View
              style={[
                styles.tablaItems,
                { borderColor: tema.bordeSuave },
              ]}
            >
              <View
                style={[
                  styles.filaEncabezadoTabla,
                  { backgroundColor: tema.tarjetaSecundaria },
                ]}
              >
                <Text
                  style={[
                    styles.colHeader,
                    { flex: 2, color: tema.textoSecundario },
                  ]}
                >
                  Artículo
                </Text>
                <Text
                  style={[
                    styles.colHeader,
                    {
                      width: 46,
                      textAlign: "center",
                      color: tema.textoSecundario,
                    },
                  ]}
                >
                  Cant.
                </Text>
                <Text
                  style={[
                    styles.colHeader,
                    {
                      flex: 1,
                      textAlign: "right",
                      color: tema.textoSecundario,
                    },
                  ]}
                >
                  Subtotal
                </Text>
              </View>

              {items.length > 0 ? (
                items.map((item, idx) => (
                  <View
                    key={`${item.productoId}-${idx}`}
                    style={[
                      styles.filaItem,
                      { borderTopColor: tema.bordeSuave },
                    ]}
                  >
                    <View style={{ flex: 2, paddingRight: 8 }}>
                      <Text style={[styles.nombreItem, { color: tema.texto }]}>
                        {item.nombre}
                      </Text>
                      <Text
                        style={[
                          styles.precioUnitarioItem,
                          { color: tema.textoSuave },
                        ]}
                      >
                        ${item.precioUnitario.toLocaleString("es-CO")} c/u
                      </Text>
                    </View>
                    <Text style={[styles.cantItem, { color: tema.primario }]}>
                      x{item.cantidad}
                    </Text>
                    <Text style={[styles.subtotalItem, { color: tema.texto }]}>
                      ${item.subtotal.toLocaleString("es-CO")}
                    </Text>
                  </View>
                ))
              ) : (
                <View
                  style={[
                    styles.filaItem,
                    { borderTopColor: tema.bordeSuave },
                  ]}
                >
                  <Text style={[styles.nombreItem, { color: tema.texto }]}>
                    {venta.descripcionProductos}
                  </Text>
                </View>
              )}
            </View>

            <View
              style={[
                styles.cajaTotales,
                { backgroundColor: esOscuro ? "#1E3A8A" : "#1D4ED8" },
              ]}
            >
              <View style={styles.filaTotalPrincipal}>
                <Text style={styles.etiquetaTotal}>TOTAL PAGADO</Text>
                <Text style={styles.montoTotal}>
                  ${venta.total.toLocaleString("es-CO")}
                </Text>
              </View>

              {metodoPago === "Efectivo" && venta.montoRecibido > 0 && (
                <View style={styles.bloqueEfectivo}>
                  <View style={styles.filaDetalleEfectivo}>
                    <Text style={styles.textoEfectivo}>Dinero recibido</Text>
                    <Text style={styles.valorEfectivo}>
                      ${venta.montoRecibido.toLocaleString("es-CO")}
                    </Text>
                  </View>
                  <View style={styles.filaDetalleEfectivo}>
                    <Text style={styles.textoEfectivo}>Cambio / Vueltas</Text>
                    <Text style={styles.valorCambio}>
                      ${(venta.cambio || 0).toLocaleString("es-CO")}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {copiado && (
              <View
                style={[
                  styles.bannerCopiado,
                  {
                    backgroundColor: tema.exitoFondo,
                    borderColor: tema.exito,
                  },
                ]}
              >
                <Text style={[styles.textoCopiado, { color: tema.exito }]}>
                  ✓ Recibo copiado al portapapeles
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.filaBotones}>
            <Pressable
              style={[
                styles.botonCompartir,
                {
                  backgroundColor: tema.primarioSuave,
                  borderColor: tema.primarioBorde,
                },
              ]}
              onPress={compartirOCopiar}
            >
              <Text
                style={[styles.textoBotonCompartir, { color: tema.primario }]}
              >
                {Platform.OS === "web" ? "📋 Copiar recibo" : "📤 Compartir"}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.botonCerrar,
                { backgroundColor: esOscuro ? "#334155" : "#0F172A" },
              ]}
              onPress={onCerrar}
            >
              <Text style={styles.textoBotonCerrar}>Cerrar</Text>
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
    padding: 18,
  },
  tarjetaFactura: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  encabezado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 14,
  },
  marca: { fontSize: 12, fontWeight: "bold", letterSpacing: 0.8 },
  numeroFactura: { fontSize: 19, fontWeight: "bold", marginTop: 2 },
  botonCerrarX: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  textoCerrarX: { fontSize: 16, fontWeight: "bold" },
  cuerpo: { marginBottom: 14 },
  cajaMeta: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
    gap: 6,
  },
  filaMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  labelMeta: { fontSize: 12, fontWeight: "600" },
  valorMeta: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1,
  },
  tituloSeccion: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  tablaItems: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
  },
  filaEncabezadoTabla: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  colHeader: { fontSize: 11, fontWeight: "bold" },
  filaItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  nombreItem: { fontSize: 13, fontWeight: "700" },
  precioUnitarioItem: { fontSize: 11, marginTop: 2 },
  cantItem: {
    width: 46,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
  },
  subtotalItem: { flex: 1, textAlign: "right", fontSize: 13, fontWeight: "700" },
  cajaTotales: { borderRadius: 14, padding: 16 },
  filaTotalPrincipal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  etiquetaTotal: { color: "#BFDBFE", fontSize: 12, fontWeight: "bold" },
  montoTotal: { color: "#FFFFFF", fontSize: 24, fontWeight: "bold" },
  bloqueEfectivo: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    gap: 4,
  },
  filaDetalleEfectivo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  textoEfectivo: { color: "#DBEAFE", fontSize: 12 },
  valorEfectivo: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  valorCambio: { color: "#86EFAC", fontSize: 14, fontWeight: "bold" },
  bannerCopiado: {
    marginTop: 10,
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  textoCopiado: { fontSize: 12, fontWeight: "bold" },
  filaBotones: { flexDirection: "row", gap: 10 },
  botonCompartir: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  textoBotonCompartir: { fontWeight: "bold", fontSize: 14 },
  botonCerrar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  textoBotonCerrar: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
});