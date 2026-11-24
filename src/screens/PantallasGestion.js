// src/screens/PantallasGestion.js
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { useTema } from "../context/TemaContext";
import {
  obtenerEstadoStock,
  UMBRAL_STOCK_BAJO,
} from "../utils/stockHelpers";
import {
  formatearFecha,
  formatearHora,
  perteneceAPeriodo,
} from "../utils/fechaHelpers";
import { ModalFactura } from "../components/ModalFactura";
import { ImagenProducto } from "../components/ImagenProducto";

export function PantallaInicio({
  nombreVendedor = "María López",
  totalVentasHoy = 0,
  facturasHoy = 0,
  productos = [],
  irAVentas,
  irAInventario,
}) {
  const { tema, esOscuro } = useTema();

  const productosAlerta = useMemo(
    () =>
      productos
        .filter((p) => p.stock <= UMBRAL_STOCK_BAJO)
        .sort((a, b) => a.stock - b.stock),
    [productos],
  );

  return (
    <ScrollView
      style={[styles.fondo, { backgroundColor: tema.fondo }]}
      contentContainerStyle={styles.contenedor}
    >
      <View
        style={[
          styles.tarjetaBienvenida,
          { backgroundColor: esOscuro ? "#1E3A8A" : "#1D4ED8" },
        ]}
      >
        <Text style={styles.saludo}>¡Hola, {nombreVendedor}!</Text>
        <Text style={styles.subtitulo}>
          Resumen del día en Papelería Pilar. Control de ventas, caja e
          inventario.
        </Text>
        <View style={styles.filaBotonesHero}>
          <Pressable style={styles.botonAccion} onPress={irAVentas}>
            <Text style={styles.textoBotonAccion}>Ir a Registrar Venta →</Text>
          </Pressable>
          <Pressable
            style={styles.botonAccionSecundario}
            onPress={irAInventario}
          >
            <Text style={styles.textoBotonSecundario}>Ver Inventario</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filaIndicadores}>
        <View
          style={[
            styles.tarjetaMetrica,
            { backgroundColor: tema.tarjeta, borderColor: tema.bordeSuave },
          ]}
        >
          <Text style={[styles.etiquetaMetrica, { color: tema.textoSuave }]}>
            VENTAS DE HOY
          </Text>
          <Text style={[styles.valorMetrica, { color: tema.texto }]}>
            ${totalVentasHoy.toLocaleString("es-CO")}
          </Text>
        </View>
        <View
          style={[
            styles.tarjetaMetrica,
            { backgroundColor: tema.tarjeta, borderColor: tema.bordeSuave },
          ]}
        >
          <Text style={[styles.etiquetaMetrica, { color: tema.textoSuave }]}>
            FACTURAS HOY
          </Text>
          <Text style={[styles.valorMetrica, { color: tema.texto }]}>
            {facturasHoy}
          </Text>
        </View>
        <View
          style={[
            styles.tarjetaMetrica,
            { backgroundColor: tema.tarjeta, borderColor: tema.bordeSuave },
          ]}
        >
          <Text style={[styles.etiquetaMetrica, { color: tema.textoSuave }]}>
            CATÁLOGO
          </Text>
          <Text style={[styles.valorMetrica, { color: tema.texto }]}>
            {productos.length}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.tarjetaAlertas,
          { backgroundColor: tema.tarjeta, borderColor: tema.bordeSuave },
        ]}
      >
        <View style={styles.encabezadoAlertas}>
          <Text style={[styles.tituloAlertas, { color: tema.texto }]}>
            ⚠️ Alertas de Reabastecimiento ({productosAlerta.length})
          </Text>
          <Pressable onPress={irAInventario}>
            <Text style={[styles.enlaceAlertas, { color: tema.primario }]}>
              Ver catálogo →
            </Text>
          </Pressable>
        </View>

        {productosAlerta.length === 0 ? (
          <Text style={[styles.textoSinAlertas, { color: tema.exito }]}>
            🟢 Todo el catálogo tiene stock saludable (más de {UMBRAL_STOCK_BAJO}{" "}
            unidades por producto).
          </Text>
        ) : (
          productosAlerta.map((prod) => {
            const estado = obtenerEstadoStock(prod.stock, esOscuro);
            return (
              <View
                key={prod.id}
                style={[
                  styles.filaAlertaProducto,
                  { borderTopColor: tema.bordeSuave },
                ]}
              >
                <ImagenProducto uri={prod.imagenUri} tamano={38} radio={8} />
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={[styles.nombreAlerta, { color: tema.texto }]}>
                    {prod.nombre}
                  </Text>
                  <Text
                    style={[styles.precioAlerta, { color: tema.textoSuave }]}
                  >
                    ${prod.precio.toLocaleString("es-CO")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badgeAlerta,
                    {
                      backgroundColor: estado.colorFondo,
                      borderColor: estado.colorBorde,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.textoBadgeAlerta,
                      { color: estado.colorTexto },
                    ]}
                  >
                    {estado.icono} {estado.etiquetaCorta}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const PERIODOS = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Últimos 7 días" },
  { id: "mes", label: "Este mes" },
  { id: "todas", label: "Todas" },
];

export function PantallaReportes({ historialVentas = [] }) {
  const { tema } = useTema();
  const [periodo, setPeriodo] = useState("hoy");
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  const ventasFiltradas = useMemo(
    () => historialVentas.filter((v) => perteneceAPeriodo(v, periodo)),
    [historialVentas, periodo],
  );

  const totalPeriodo = useMemo(
    () => ventasFiltradas.reduce((acc, v) => acc + v.total, 0),
    [ventasFiltradas],
  );

  const promedioPeriodo =
    ventasFiltradas.length > 0
      ? Math.round(totalPeriodo / ventasFiltradas.length)
      : 0;

  return (
    <View style={[styles.fondo, { backgroundColor: tema.fondo }]}>
      <FlatList
        data={ventasFiltradas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listaReportes}
        ListHeaderComponent={
          <View>
            <Text style={[styles.tituloHistorial, { color: tema.texto }]}>
              Historial y Facturas de Ventas
            </Text>

            <View style={styles.filaPeriodos}>
              {PERIODOS.map((op) => {
                const activo = periodo === op.id;
                return (
                  <Pressable
                    key={op.id}
                    style={[
                      styles.chipPeriodo,
                      {
                        backgroundColor: activo ? tema.primario : tema.tarjeta,
                        borderColor: activo ? tema.primario : tema.borde,
                      },
                    ]}
                    onPress={() => setPeriodo(op.id)}
                  >
                    <Text
                      style={[
                        styles.textoChipPeriodo,
                        { color: activo ? "#FFFFFF" : tema.textoSecundario },
                      ]}
                    >
                      {op.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.filaResumenPeriodo}>
              <View
                style={[
                  styles.tarjetaMiniMetrica,
                  {
                    backgroundColor: tema.tarjeta,
                    borderColor: tema.bordeSuave,
                  },
                ]}
              >
                <Text style={[styles.etiquetaMini, { color: tema.textoSuave }]}>
                  TOTAL PERÍODO
                </Text>
                <Text style={[styles.valorMini, { color: tema.exito }]}>
                  ${totalPeriodo.toLocaleString("es-CO")}
                </Text>
              </View>
              <View
                style={[
                  styles.tarjetaMiniMetrica,
                  {
                    backgroundColor: tema.tarjeta,
                    borderColor: tema.bordeSuave,
                  },
                ]}
              >
                <Text style={[styles.etiquetaMini, { color: tema.textoSuave }]}>
                  FACTURAS
                </Text>
                <Text style={[styles.valorMini, { color: tema.texto }]}>
                  {ventasFiltradas.length}
                </Text>
              </View>
              <View
                style={[
                  styles.tarjetaMiniMetrica,
                  {
                    backgroundColor: tema.tarjeta,
                    borderColor: tema.bordeSuave,
                  },
                ]}
              >
                <Text style={[styles.etiquetaMini, { color: tema.textoSuave }]}>
                  PROMEDIO
                </Text>
                <Text style={[styles.valorMini, { color: tema.texto }]}>
                  ${promedioPeriodo.toLocaleString("es-CO")}
                </Text>
              </View>
            </View>

            <Text style={[styles.ayudaTocar, { color: tema.textoSuave }]}>
              Toca cualquier registro para abrir su factura detallada.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.estadoVacio,
              { backgroundColor: tema.tarjeta, borderColor: tema.bordeSuave },
            ]}
          >
            <Text style={{ fontSize: 34, marginBottom: 8 }}>🧾</Text>
            <Text style={[styles.tituloVacio, { color: tema.texto }]}>
              No hay ventas en este período
            </Text>
            <Text style={[styles.subtituloVacio, { color: tema.textoSuave }]}>
              Cambia el filtro superior o registra una nueva venta para verla
              aquí.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const numero =
            item.numeroFactura || `FAC-${String(item.id).slice(-4)}`;
          const fecha = formatearFecha(item);
          const hora = formatearHora(item);
          const cliente = item.cliente || "Consumidor Final";
          const metodo = item.metodoPago || "Efectivo";

          return (
            <Pressable
              style={[
                styles.itemReporte,
                {
                  backgroundColor: tema.tarjeta,
                  borderColor: tema.bordeSuave,
                },
              ]}
              onPress={() => setVentaSeleccionada(item)}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={styles.filaSuperiorReporte}>
                  <Text
                    style={[
                      styles.badgeNumReporte,
                      {
                        backgroundColor: tema.primarioSuave,
                        color: tema.primario,
                      },
                    ]}
                  >
                    {numero}
                  </Text>
                  <Text
                    style={[
                      styles.badgeMetodoReporte,
                      {
                        backgroundColor: tema.tarjetaSecundaria,
                        color: tema.textoSecundario,
                      },
                    ]}
                  >
                    {metodo}
                  </Text>
                </View>
                <Text
                  style={[styles.productoReporte, { color: tema.texto }]}
                  numberOfLines={2}
                >
                  {item.descripcionProductos}
                </Text>
                <Text style={[styles.metaReporte, { color: tema.textoSuave }]}>
                  📅 {fecha} • 🕒 {hora} • 👤 {cliente}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.totalReporte, { color: tema.exito }]}>
                  ${item.total.toLocaleString("es-CO")}
                </Text>
                <Text
                  style={[styles.verFacturaLink, { color: tema.primario }]}
                >
                  Ver factura →
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      <ModalFactura
        venta={ventaSeleccionada}
        onCerrar={() => setVentaSeleccionada(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  contenedor: { padding: 18, paddingBottom: 110 },
  tarjetaBienvenida: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  saludo: { color: "#FFFFFF", fontSize: 21, fontWeight: "bold" },
  subtitulo: { color: "#BFDBFE", fontSize: 14, marginTop: 4, marginBottom: 16 },
  filaBotonesHero: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  botonAccion: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  textoBotonAccion: { color: "#1D4ED8", fontWeight: "bold" },
  botonAccionSecundario: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  textoBotonSecundario: { color: "#FFFFFF", fontWeight: "bold" },
  filaIndicadores: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  tarjetaMetrica: {
    flex: 1,
    minWidth: 100,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  etiquetaMetrica: { fontSize: 11, fontWeight: "bold" },
  valorMetrica: { fontSize: 20, fontWeight: "bold", marginTop: 6 },

  tarjetaAlertas: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  encabezadoAlertas: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tituloAlertas: { fontSize: 15, fontWeight: "bold" },
  enlaceAlertas: { fontSize: 13, fontWeight: "bold" },
  textoSinAlertas: { fontSize: 13, fontWeight: "500" },
  filaAlertaProducto: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  nombreAlerta: { fontSize: 14, fontWeight: "bold" },
  precioAlerta: { fontSize: 12, marginTop: 2 },
  badgeAlerta: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  textoBadgeAlerta: { fontSize: 12, fontWeight: "700" },

  listaReportes: { padding: 18, paddingBottom: 120 },
  tituloHistorial: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  filaPeriodos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chipPeriodo: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  textoChipPeriodo: { fontSize: 12, fontWeight: "bold" },
  filaResumenPeriodo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  tarjetaMiniMetrica: {
    flex: 1,
    minWidth: 100,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  etiquetaMini: { fontSize: 10, fontWeight: "bold" },
  valorMini: { fontSize: 17, fontWeight: "bold", marginTop: 4 },
  ayudaTocar: { fontSize: 12, marginBottom: 10 },
  itemReporte: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  filaSuperiorReporte: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  badgeNumReporte: {
    fontSize: 11,
    fontWeight: "bold",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  badgeMetodoReporte: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  productoReporte: { fontSize: 15, fontWeight: "bold" },
  metaReporte: { fontSize: 12, marginTop: 4 },
  totalReporte: { fontSize: 17, fontWeight: "bold" },
  verFacturaLink: { fontSize: 11, fontWeight: "bold", marginTop: 4 },
  estadoVacio: {
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
  },
  tituloVacio: { fontSize: 16, fontWeight: "bold" },
  subtituloVacio: { fontSize: 13, marginTop: 4, textAlign: "center" },
});