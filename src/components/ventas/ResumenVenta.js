// src/components/ventas/ResumenVenta.js
import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useTema } from "../../context/TemaContext";

const METODOS_PAGO = [
  { id: "Efectivo", label: "💵 Efectivo" },
  { id: "Transferencia", label: "📲 Transferencia" },
  { id: "Tarjeta", label: "💳 Tarjeta" },
];

const soloDigitos = (texto) => texto.replace(/[^0-9]/g, "");

export function DatosFacturaYPago({
  nombreVendedor,
  proximoNumeroFactura,
  nombreCliente,
  setNombreCliente,
  metodoPago,
  setMetodoPago,
  montoRecibido,
  setMontoRecibido,
  totalPagar,
  recibidoNum,
  efectivoInsuficiente,
  cambioCalculado,
}) {
  const { tema } = useTema();

  return (
    <View style={styles.bloqueDatosFactura}>
      <View style={styles.filaInfoVendedor}>
        <Text style={[styles.textoInfoVendedor, { color: tema.textoSecundario }]}>
          👤 Atiende:{" "}
          <Text style={{ fontWeight: "bold", color: tema.texto }}>
            {nombreVendedor}
          </Text>
        </Text>
        <Text
          style={[
            styles.badgeFacturaNum,
            {
              backgroundColor: tema.primarioSuave,
              color: tema.primario,
            },
          ]}
        >
          {proximoNumeroFactura}
        </Text>
      </View>

      <Text style={[styles.labelFactura, { color: tema.textoSecundario }]}>
        Cliente (opcional)
      </Text>
      <TextInput
        style={[
          styles.inputCliente,
          {
            backgroundColor: tema.inputFondo,
            borderColor: tema.borde,
            color: tema.texto,
          },
        ]}
        placeholder="Consumidor Final"
        placeholderTextColor={tema.textoSuave}
        value={nombreCliente}
        onChangeText={setNombreCliente}
      />

      <Text style={[styles.labelFactura, { color: tema.textoSecundario }]}>
        Método de pago
      </Text>
      <View style={styles.filaMetodosPago}>
        {METODOS_PAGO.map((m) => {
          const activo = metodoPago === m.id;
          return (
            <Pressable
              key={m.id}
              style={[
                styles.chipPago,
                {
                  backgroundColor: activo
                    ? tema.primario
                    : tema.tarjetaSecundaria,
                  borderColor: activo ? tema.primario : tema.borde,
                },
              ]}
              onPress={() => {
                setMetodoPago(m.id);
                if (m.id !== "Efectivo") setMontoRecibido("");
              }}
            >
              <Text
                style={[
                  styles.textoChipPago,
                  { color: activo ? "#FFFFFF" : tema.textoSecundario },
                ]}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {metodoPago === "Efectivo" && totalPagar > 0 && (
        <View
          style={[
            styles.cajaVueltas,
            {
              backgroundColor: tema.tarjetaSecundaria,
              borderColor: tema.bordeSuave,
            },
          ]}
        >
          <Text style={[styles.labelFactura, { color: tema.textoSecundario }]}>
            Efectivo recibido (vacío = pago exacto)
          </Text>
          <TextInput
            style={[
              styles.inputCliente,
              {
                backgroundColor: tema.tarjeta,
                borderColor: tema.borde,
                color: tema.texto,
              },
            ]}
            placeholder={`Exacto: $${totalPagar.toLocaleString("es-CO")}`}
            placeholderTextColor={tema.textoSuave}
            keyboardType="numeric"
            value={montoRecibido}
            onChangeText={(t) => setMontoRecibido(soloDigitos(t))}
          />

          <View style={styles.filaBilletesRapidos}>
            <Pressable
              style={[
                styles.chipBillete,
                { backgroundColor: tema.tarjeta, borderColor: tema.borde },
              ]}
              onPress={() => setMontoRecibido(String(totalPagar))}
            >
              <Text style={[styles.textoChipBillete, { color: tema.primario }]}>
                Exacto
              </Text>
            </Pressable>
            {[10000, 20000, 50000].map((billete) => (
              <Pressable
                key={billete}
                style={[
                  styles.chipBillete,
                  { backgroundColor: tema.tarjeta, borderColor: tema.borde },
                ]}
                onPress={() => setMontoRecibido(String(billete))}
              >
                <Text
                  style={[styles.textoChipBillete, { color: tema.primario }]}
                >
                  ${(billete / 1000).toFixed(0)}k
                </Text>
              </Pressable>
            ))}
          </View>

          {recibidoNum !== null && (
            <View
              style={[
                styles.filaResultadoVueltas,
                {
                  backgroundColor: efectivoInsuficiente
                    ? tema.peligroFondo
                    : tema.exitoFondo,
                },
              ]}
            >
              <Text
                style={[
                  styles.textoLabelVueltas,
                  { color: efectivoInsuficiente ? tema.peligro : tema.exito },
                ]}
              >
                {efectivoInsuficiente
                  ? "⚠️ Falta dinero:"
                  : "💰 Cambio / Vueltas:"}
              </Text>
              <Text
                style={[
                  styles.montoVueltas,
                  { color: efectivoInsuficiente ? tema.peligro : tema.exito },
                ]}
              >
                $
                {(efectivoInsuficiente
                  ? totalPagar - recibidoNum
                  : cambioCalculado
                ).toLocaleString("es-CO")}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export function ResumenVenta({
  itemsEnVenta,
  seleccionActualValida,
  productoSeleccionado,
  cantidad,
  subtotalActual,
  totalPagar,
  nombreVendedor,
  proximoNumeroFactura,
  nombreCliente,
  setNombreCliente,
  metodoPago,
  setMetodoPago,
  montoRecibido,
  setMontoRecibido,
  recibidoNum,
  efectivoInsuficiente,
  cambioCalculado,
  onEliminarItem,
}) {
  const { tema, esOscuro } = useTema();

  return (
    <View
      style={[
        styles.columnaTarjeta,
        { backgroundColor: tema.tarjeta, borderColor: tema.bordeSuave },
      ]}
    >
      <View
        style={[
          styles.encabezadoTarjetaTableta,
          { borderBottomColor: tema.bordeSuave },
        ]}
      >
        <View
          style={[
            styles.iconoTarjetaCirculo,
            { backgroundColor: tema.primarioSuave },
          ]}
        >
          <Text>📄</Text>
        </View>
        <Text style={[styles.tituloTarjetaInterna, { color: tema.texto }]}>
          Resumen de Venta
        </Text>
      </View>

      {itemsEnVenta.length === 0 && !seleccionActualValida ? (
        <View style={{ paddingVertical: 14, alignItems: "center" }}>
          <Text style={{ fontSize: 14, color: tema.textoSuave }}>
            Aún no hay productos en la factura.
          </Text>
        </View>
      ) : (
        <>
          {itemsEnVenta.map((item) => (
            <View
              key={item.productoId}
              style={[
                styles.itemAgregadoFila,
                {
                  backgroundColor: tema.tarjetaSecundaria,
                  borderColor: tema.bordeSuave,
                },
              ]}
            >
              <View>
                <Text
                  style={[styles.nombreItemAgregado, { color: tema.texto }]}
                >
                  {item.cantidad}x {item.nombre}
                </Text>
                <Text
                  style={[
                    styles.subtextoResumenDestacado,
                    { color: tema.textoSuave },
                  ]}
                >
                  ${item.precioUnitario.toLocaleString("es-CO")} c/u
                </Text>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Text style={[styles.subtotalNegrita, { color: tema.texto }]}>
                  ${item.subtotal.toLocaleString("es-CO")}
                </Text>
                <Pressable
                  onPress={() => onEliminarItem(item.productoId)}
                  hitSlop={15}
                >
                  <Text style={{ color: tema.peligro, fontWeight: "bold" }}>
                    ✕
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}

          {seleccionActualValida && productoSeleccionado && (
            <View
              style={[
                styles.cajaDestacadaResumen,
                {
                  backgroundColor: tema.primarioSuave,
                  borderColor: tema.primarioBorde,
                },
              ]}
            >
              <View>
                <Text
                  style={[
                    styles.nombreResumenDestacado,
                    { color: tema.texto },
                  ]}
                >
                  {productoSeleccionado.nombre} (En selección)
                </Text>
                <Text
                  style={[
                    styles.subtextoResumenDestacado,
                    { color: tema.textoSecundario },
                  ]}
                >
                  ${productoSeleccionado.precio.toLocaleString("es-CO")} por
                  unidad
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={[styles.multiplicadorAzul, { color: tema.primario }]}
                >
                  x {cantidad}
                </Text>
                <Text
                  style={[styles.subtotalDestacado, { color: tema.texto }]}
                >
                  ${subtotalActual.toLocaleString("es-CO")}
                </Text>
              </View>
            </View>
          )}

          <View
            style={[
              styles.cajaAzulTotalTableta,
              { backgroundColor: esOscuro ? "#1E3A8A" : "#1D4ED8" },
            ]}
          >
            <Text style={styles.etiquetaTotalBlanca}>TOTAL A PAGAR</Text>
            <Text style={styles.montoTotalBlanco}>
              ${totalPagar.toLocaleString("es-CO")}
            </Text>
          </View>
        </>
      )}

      <View
        style={[styles.lineaDivisoria, { backgroundColor: tema.bordeSuave }]}
      />
      <DatosFacturaYPago
        nombreVendedor={nombreVendedor}
        proximoNumeroFactura={proximoNumeroFactura}
        nombreCliente={nombreCliente}
        setNombreCliente={setNombreCliente}
        metodoPago={metodoPago}
        setMetodoPago={setMetodoPago}
        montoRecibido={montoRecibido}
        setMontoRecibido={setMontoRecibido}
        totalPagar={totalPagar}
        recibidoNum={recibidoNum}
        efectivoInsuficiente={efectivoInsuficiente}
        cambioCalculado={cambioCalculado}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  columnaTarjeta: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  encabezadoTarjetaTableta: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
  },
  iconoTarjetaCirculo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  tituloTarjetaInterna: { fontSize: 16, fontWeight: "bold" },
  itemAgregadoFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  nombreItemAgregado: { fontSize: 14, fontWeight: "bold" },
  cajaDestacadaResumen: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  nombreResumenDestacado: { fontSize: 15, fontWeight: "bold" },
  subtextoResumenDestacado: { fontSize: 12, marginTop: 2 },
  multiplicadorAzul: { fontSize: 13, fontWeight: "bold" },
  subtotalDestacado: { fontSize: 17, fontWeight: "bold", marginTop: 2 },
  subtotalNegrita: { fontSize: 15, fontWeight: "bold" },
  cajaAzulTotalTableta: { borderRadius: 14, padding: 16, marginTop: 4 },
  etiquetaTotalBlanca: { color: "#BFDBFE", fontSize: 11, fontWeight: "bold" },
  montoTotalBlanco: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 4,
  },
  lineaDivisoria: { height: 1, marginVertical: 12 },

  bloqueDatosFactura: { gap: 8 },
  filaInfoVendedor: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  textoInfoVendedor: { fontSize: 12 },
  badgeFacturaNum: {
    fontSize: 11,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  labelFactura: { fontSize: 12, fontWeight: "700" },
  inputCliente: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    fontSize: 13,
  },
  filaMetodosPago: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chipPago: {
    flex: 1,
    minWidth: 92,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  textoChipPago: { fontSize: 12, fontWeight: "700" },
  cajaVueltas: {
    marginTop: 4,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  filaBilletesRapidos: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chipBillete: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  textoChipBillete: { fontSize: 12, fontWeight: "700" },
  filaResultadoVueltas: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 9,
    borderRadius: 8,
  },
  textoLabelVueltas: { fontSize: 12, fontWeight: "bold" },
  montoVueltas: { fontSize: 15, fontWeight: "bold" },
});