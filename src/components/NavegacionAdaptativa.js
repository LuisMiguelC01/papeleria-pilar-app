// src/components/NavegacionAdaptativa.js
import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useTema } from "../context/TemaContext";
import { ETIQUETA_ROL } from "../utils/permisos";

const PESTANAS_BASE = [
  { id: "inicio", titulo: "Inicio", icono: "🏠" },
  { id: "inventario", titulo: "Inventario", icono: "📦" },
  { id: "ventas", titulo: "Ventas", icono: "🛒" },
  { id: "reportes", titulo: "Reportes", icono: "📊" },
];

const PESTANA_EQUIPO = { id: "usuarios", titulo: "Equipo", icono: "👥" };

export function EncabezadoSuperior({
  pestanaActiva,
  setPestanaActiva,
  esTableta,
  usuarioActual,
  puedeGestionarUsuarios,
  onAbrirGuia,
  onAbrirIA,
  onCerrarSesion,
}) {
  const { tema, esOscuro, alternarTema } = useTema();

  const pestanasVisibles = puedeGestionarUsuarios
    ? [...PESTANAS_BASE, PESTANA_EQUIPO]
    : PESTANAS_BASE;

  const titulosModulo = {
    inicio: "Panel Principal",
    inventario: "Control de Inventario",
    ventas: "Registrar Venta",
    reportes: "Reporte de Ventas",
    usuarios: "Equipo y Roles",
  };

  if (esTableta) {
    return (
      <View
        style={[
          styles.barraTableta,
          {
            backgroundColor: tema.barraFondo,
            borderBottomColor: tema.bordeSuave,
          },
        ]}
      >
        <View style={styles.marcaTableta}>
          <View
            style={[
              styles.iconoLogoTableta,
              { backgroundColor: tema.primario },
            ]}
          >
            <Text style={styles.emojiLogo}>🛍️</Text>
          </View>
          <View>
            <Text style={[styles.nombreEmpresaTableta, { color: tema.texto }]}>
              Papelería Pilar
            </Text>
            <Text
              style={[styles.subtituloEmpresaTableta, { color: tema.primario }]}
            >
              SISTEMA DE GESTIÓN
            </Text>
          </View>
        </View>

        <View style={styles.menuCentralTableta}>
          {pestanasVisibles.map((tab) => {
            const activa = pestanaActiva === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setPestanaActiva(tab.id)}
                style={[
                  styles.pildoraMenu,
                  activa && { backgroundColor: tema.primario },
                ]}
              >
                <Text
                  style={[
                    styles.textoPildora,
                    { color: activa ? "#FFFFFF" : tema.textoSecundario },
                  ]}
                >
                  {tab.titulo}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.ladoDerechoTableta}>
          {pestanaActiva === "ventas" && onAbrirGuia && (
            <Pressable
              style={[
                styles.botonIconoBarra,
                {
                  backgroundColor: tema.alertaFondo,
                  borderColor: tema.alerta,
                },
              ]}
              onPress={onAbrirGuia}
            >
              <Text style={[styles.textoAcceso, { color: tema.alerta }]}>
                💡 Guía
              </Text>
            </Pressable>
          )}

          {onAbrirIA && (
            <Pressable
              style={[
                styles.botonIconoBarra,
                {
                  backgroundColor: tema.primarioSuave,
                  borderColor: tema.primarioBorde,
                },
              ]}
              onPress={onAbrirIA}
            >
              <Text style={[styles.textoAcceso, { color: tema.primario }]}>
                🤖 IA
              </Text>
            </Pressable>
          )}

          <Pressable
            style={[
              styles.botonTemaCirculo,
              {
                backgroundColor: tema.tarjetaSecundaria,
                borderColor: tema.borde,
              },
            ]}
            onPress={alternarTema}
          >
            <Text style={{ fontSize: 15 }}>{esOscuro ? "☀️" : "🌙"}</Text>
          </Pressable>

          <View
            style={[styles.perfilTableta, { borderLeftColor: tema.bordeSuave }]}
          >
            <View style={{ alignItems: "flex-end", marginRight: 8 }}>
              <Text style={[styles.nombreUsuario, { color: tema.texto }]}>
                {usuarioActual?.nombre}
              </Text>
              <Text style={[styles.rolUsuario, { color: tema.primario }]}>
                {ETIQUETA_ROL[usuarioActual?.rol]}
              </Text>
            </View>
            <Pressable
              style={[
                styles.botonSalir,
                {
                  backgroundColor: tema.peligroFondo,
                  borderColor: tema.peligroBorde,
                },
              ]}
              onPress={onCerrarSesion}
            >
              <Text style={[styles.textoSalir, { color: tema.peligro }]}>
                Salir
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // TELÉFONO
  return (
    <View
      style={[
        styles.encabezadoTelefono,
        { backgroundColor: tema.headerMovilFondo },
      ]}
    >
      <View style={styles.filaSuperiorTelefono}>
        <View style={styles.marcaTelefono}>
          <Text style={styles.iconoBolsa}>🛍️</Text>
          <View>
            <Text style={styles.tituloEmpresaTelefono}>Papelería Pilar</Text>
            <Text style={styles.subtituloMovilUsuario}>
              {usuarioActual?.nombre} • {ETIQUETA_ROL[usuarioActual?.rol]}
            </Text>
          </View>
        </View>

        <View style={styles.accionesMovil}>
          <Pressable style={styles.chipAccionMovil} onPress={alternarTema}>
            <Text style={{ fontSize: 14 }}>{esOscuro ? "☀️" : "🌙"}</Text>
          </Pressable>

          <Pressable style={styles.chipAccionMovil} onPress={onCerrarSesion}>
            <Text style={styles.textoSalirMovil}>🚪 Salir</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filaTituloMovil}>
        <Text style={styles.tituloModuloTelefono}>
          {titulosModulo[pestanaActiva]}
        </Text>

        <View style={styles.accionesMovil}>
          {pestanaActiva === "ventas" && onAbrirGuia && (
            <Pressable style={styles.chipGuiaMovil} onPress={onAbrirGuia}>
              <Text style={styles.textoChipGuiaMovil}>💡</Text>
            </Pressable>
          )}
          {onAbrirIA && (
            <Pressable style={styles.chipAccionMovil} onPress={onAbrirIA}>
              <Text style={styles.textoSalirMovil}>🤖 IA</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export function BarraInferiorTelefono({
  pestanaActiva,
  setPestanaActiva,
  esTableta,
  puedeGestionarUsuarios,
}) {
  const { tema } = useTema();
  if (esTableta) return null;

  const pestanasVisibles = puedeGestionarUsuarios
    ? [...PESTANAS_BASE, PESTANA_EQUIPO]
    : PESTANAS_BASE;

  return (
    <View
      style={[
        styles.contenedorBarraInferior,
        {
          backgroundColor: tema.barraFondo,
          borderTopColor: tema.bordeSuave,
        },
      ]}
    >
      <View
        style={[styles.barraInferior, { backgroundColor: tema.barraFondo }]}
      >
        {pestanasVisibles.map((tab) => {
          const activa = pestanaActiva === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={styles.tabInferior}
              onPress={() => setPestanaActiva(tab.id)}
            >
              {activa && (
                <View
                  style={[
                    styles.indicadorSuperiorTab,
                    { backgroundColor: tema.primario },
                  ]}
                />
              )}
              <Text style={styles.iconoTabInferior}>{tab.icono}</Text>
              <Text
                style={[
                  styles.textoTabInferior,
                  { color: activa ? tema.primario : tema.textoSuave },
                  activa && { fontWeight: "bold" },
                ]}
                numberOfLines={1}
              >
                {tab.titulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  encabezadoTelefono: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  filaSuperiorTelefono: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  marcaTelefono: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconoBolsa: { fontSize: 18, marginRight: 8 },
  tituloEmpresaTelefono: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  subtituloMovilUsuario: { color: "#BFDBFE", fontSize: 11, fontWeight: "600" },
  accionesMovil: { flexDirection: "row", alignItems: "center", gap: 6 },
  chipAccionMovil: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  textoSalirMovil: { color: "#FFFFFF", fontSize: 11, fontWeight: "bold" },
  tituloModuloTelefono: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },

  contenedorBarraInferior: {
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "android" ? 44 : 0,
  },
  barraInferior: {
    flexDirection: "row",
    height: 62,
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabInferior: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    position: "relative",
  },
  indicadorSuperiorTab: {
    position: "absolute",
    top: 0,
    width: 34,
    height: 3,
    borderRadius: 2,
  },
  iconoTabInferior: { fontSize: 17, marginBottom: 2 },
  textoTabInferior: { fontSize: 11, fontWeight: "500" },

  // Tableta / Web
  barraTableta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderBottomWidth: 1,
    gap: 10,
  },
  marcaTableta: { flexDirection: "row", alignItems: "center" },
  iconoLogoTableta: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  emojiLogo: { fontSize: 18 },
  nombreEmpresaTableta: { fontSize: 16, fontWeight: "bold" },
  subtituloEmpresaTableta: { fontSize: 9, fontWeight: "700" },
  menuCentralTableta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  pildoraMenu: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  textoPildora: { fontSize: 13, fontWeight: "600" },
  ladoDerechoTableta: { flexDirection: "row", alignItems: "center", gap: 8 },
  botonIconoBarra: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  textoAcceso: { fontSize: 12, fontWeight: "bold" },
  botonTemaCirculo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  perfilTableta: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    borderLeftWidth: 1,
  },
  nombreUsuario: { fontSize: 13, fontWeight: "bold" },
  rolUsuario: { fontSize: 11, fontWeight: "600" },
  botonSalir: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  textoSalir: { fontSize: 12, fontWeight: "bold" },
  filaTituloMovil: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chipGuiaMovil: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  textoChipGuiaMovil: { fontSize: 13 },
});
