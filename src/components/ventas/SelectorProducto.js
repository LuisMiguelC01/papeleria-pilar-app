// src/components/ventas/SelectorProducto.js
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useTema } from "../../context/TemaContext";
import { obtenerEstadoStock } from "../../utils/stockHelpers";
import { ImagenProducto } from "../ImagenProducto";

export function SelectorProducto({
  productos,
  productoSeleccionado,
  stockDisponibleActual,
  obtenerDisponibleProducto,
  onSeleccionarProducto,
  compacto = false,
}) {
  const { tema, esOscuro } = useTema();
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("");

  const productosFiltrados = useMemo(() => {
    const texto = filtro.trim().toLowerCase();
    if (!texto) return productos;
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(texto) ||
        (p.descripcion || "").toLowerCase().includes(texto) ||
        (p.codigoBarras || "").toLowerCase().includes(texto),
    );
  }, [productos, filtro]);

  const estadoSeleccionado = productoSeleccionado
    ? obtenerEstadoStock(stockDisponibleActual, esOscuro)
    : null;

  const elegir = (prod) => {
    const aceptado = onSeleccionarProducto(prod);
    if (aceptado) {
      setAbierto(false);
      setFiltro("");
    }
  };

  return (
    <View>
      <Text style={[styles.etiquetaAzul, { color: tema.primario }]}>
        PRODUCTO
      </Text>
      <Pressable
        style={[
          styles.selectorProducto,
          compacto && { paddingVertical: 10, paddingHorizontal: 12 },
          {
            backgroundColor: productoSeleccionado
              ? tema.tarjetaSecundaria
              : tema.tarjeta,
            borderColor: productoSeleccionado
              ? tema.primarioBorde
              : tema.borde,
          },
        ]}
        onPress={() => setAbierto(!abierto)}
      >
        <View style={styles.filaSelectorContenido}>
          {productoSeleccionado && (
            <ImagenProducto
              uri={productoSeleccionado.imagenUri}
              tamano={compacto ? 32 : 38}
              radio={8}
            />
          )}
          <Text
            style={[
              styles.textoSelector,
              {
                color: productoSeleccionado ? tema.texto : tema.textoSuave,
                fontSize: compacto ? 15 : 16,
              },
            ]}
            numberOfLines={1}
          >
            {productoSeleccionado
              ? productoSeleccionado.nombre
              : "Seleccione un producto..."}
          </Text>
        </View>
        <Text style={[styles.flechaSelector, { color: tema.primario }]}>
          {abierto ? "⌃" : "⌄"}
        </Text>
      </Pressable>

      {abierto && (
        <View
          style={[
            styles.menuDesplegable,
            {
              backgroundColor: tema.tarjeta,
              borderColor: tema.borde,
            },
          ]}
        >
          <View
            style={[
              styles.cajaBusqueda,
              {
                backgroundColor: tema.tarjetaSecundaria,
                borderBottomColor: tema.bordeSuave,
              },
            ]}
          >
            <TextInput
              style={[
                styles.inputBusqueda,
                {
                  backgroundColor: tema.tarjeta,
                  borderColor: tema.borde,
                  color: tema.texto,
                },
              ]}
              placeholder="🔍 Filtrar producto rápido..."
              placeholderTextColor={tema.textoSuave}
              value={filtro}
              onChangeText={setFiltro}
            />
          </View>

          <ScrollView
            style={styles.listaDesplegable}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {productosFiltrados.length === 0 ? (
              <View style={styles.vacioDesplegable}>
                <Text style={[styles.textoVacio, { color: tema.textoSuave }]}>
                  No se encontró "{filtro}"
                </Text>
              </View>
            ) : (
              productosFiltrados.map((prod) => {
                const disponible = obtenerDisponibleProducto(prod);
                const estado = obtenerEstadoStock(disponible, esOscuro);
                const sinDisponibles = disponible <= 0;

                return (
                  <Pressable
                    key={prod.id}
                    style={[
                      styles.opcionDesplegable,
                      {
                        borderBottomColor: tema.bordeSuave,
                        backgroundColor: sinDisponibles
                          ? tema.tarjetaSecundaria
                          : tema.tarjeta,
                      },
                    ]}
                    onPress={() => elegir(prod)}
                  >
                    <ImagenProducto
                      uri={prod.imagenUri}
                      tamano={40}
                      radio={8}
                    />
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text
                        style={[
                          styles.textoOpcion,
                          {
                            color: sinDisponibles
                              ? tema.textoSuave
                              : tema.texto,
                          },
                        ]}
                      >
                        {prod.nombre}
                      </Text>
                      <Text
                        style={[
                          styles.subtextoStockOpcion,
                          { color: estado.colorTexto },
                        ]}
                      >
                        {prod.stock <= 0
                          ? "🔴 Agotado en inventario"
                          : sinDisponibles
                            ? "🟠 Todo el stock ya está en la factura"
                            : `${estado.icono} ${disponible} disponibles`}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.precioOpcion,
                        {
                          color: sinDisponibles
                            ? tema.textoSuave
                            : tema.primario,
                        },
                      ]}
                    >
                      ${prod.precio.toLocaleString("es-CO")}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {productoSeleccionado && estadoSeleccionado && (
        <View
          style={[
            styles.badgeStockInline,
            {
              backgroundColor: estadoSeleccionado.colorFondo,
              borderColor: estadoSeleccionado.colorBorde,
              marginTop: compacto ? 8 : 10,
            },
          ]}
        >
          <Text
            style={[
              styles.textoBadgeStockInline,
              { color: estadoSeleccionado.colorTexto },
            ]}
          >
            {estadoSeleccionado.icono} {estadoSeleccionado.etiqueta}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  etiquetaAzul: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  selectorProducto: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filaSelectorContenido: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  textoSelector: {
    flex: 1,
    fontWeight: "600",
  },
  flechaSelector: { fontSize: 18, fontWeight: "bold" },
  menuDesplegable: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  cajaBusqueda: {
    padding: 8,
    borderBottomWidth: 1,
  },
  inputBusqueda: {
    height: 38,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    borderWidth: 1,
  },
  listaDesplegable: { maxHeight: 230 },
  vacioDesplegable: { padding: 16, alignItems: "center" },
  textoVacio: { fontSize: 13 },
  opcionDesplegable: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  textoOpcion: { fontSize: 14, fontWeight: "600" },
  subtextoStockOpcion: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  precioOpcion: { fontSize: 14, fontWeight: "bold" },
  badgeStockInline: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  textoBadgeStockInline: { fontSize: 12, fontWeight: "700" },
});