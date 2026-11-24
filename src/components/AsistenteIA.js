// src/components/AsistenteIA.js
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useTema } from "../context/TemaContext";
import { analizarConsulta } from "../services/modeloIA";
import {
  consultarGemini,
  esPreguntaCompleja,
  GEMINI_CONFIGURADO,
} from "../services/geminiService";
import { obtenerEstadoStock } from "../utils/stockHelpers";
import { ImagenProducto } from "./ImagenProducto";

const MENSAJE_BIENVENIDA = {
  id: "bienvenida",
  rol: "ia",
  motor: "sistema",
  texto:
    '¡Hola! Soy el Asistente Híbrido de Papelería Pilar.\n• Consultas rápidas (precio, stock, descripción) → ⚡ IA Local.\n• Análisis, combos y resúmenes → ✨ Gemini en la nube.',
};

const MODOS_IA = [
  { id: "hibrido", label: "🔀 Híbrido" },
  { id: "local", label: "⚡ Local" },
  { id: "gemini", label: "✨ Gemini" },
];

export default function AsistenteIA({
  productos = [],
  historialVentas = [],
  totalVentasHoy = 0,
  usuarioActual = null,
  visible,
  onCerrar,
}) {
  const { tema, esOscuro } = useTema();
  const scrollRef = useRef(null);

  const [modoIA, setModoIA] = useState("hibrido");
  const [indice, setIndice] = useState(0);
  const [pregunta, setPregunta] = useState("");
  const [cargandoGemini, setCargandoGemini] = useState(false);
  const [mostrarOpcionesManuales, setMostrarOpcionesManuales] = useState(false);
  const [mensajes, setMensajes] = useState([MENSAJE_BIENVENIDA]);

  const listaProductos = Array.isArray(productos) ? productos : [];
  const totalProductos = listaProductos.length;
  const indiceSeguro = totalProductos > 0 ? indice % totalProductos : 0;
  const productoActual =
    totalProductos > 0 ? listaProductos[indiceSeguro] : null;

  const agregarMensaje = (nuevo) => {
    setMensajes((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, ...nuevo },
    ]);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  function obtenerDatoProducto(prod, campo) {
    if (!prod) return "No hay productos en el catálogo.";
    if (campo === "stock") {
      const estado = obtenerEstadoStock(prod.stock, esOscuro);
      return `${estado.icono} ${estado.etiqueta}`;
    }
    if (campo === "precio") {
      return typeof prod.precio === "number"
        ? `$${prod.precio.toLocaleString("es-CO")}`
        : String(prod.precio || 0);
    }
    if (campo === "ficha") {
      const estado = obtenerEstadoStock(prod.stock, esOscuro);
      const codigo = prod.codigoBarras ? `\nCódigo: ${prod.codigoBarras}` : "";
      return `📦 ${prod.nombre}\n💲 Precio: $${Number(prod.precio || 0).toLocaleString("es-CO")}\n📊 Stock: ${estado.icono} ${estado.etiqueta}\n📄 ${prod.descripcion || "Sin descripción"}${codigo}`;
    }
    const valor = prod[campo];
    if (valor === undefined || valor === null || String(valor).trim() === "")
      return "Dato no registrado";
    return String(valor);
  }

  async function ejecutarConsultaGemini(textoLimpio, productoFoco) {
    if (!GEMINI_CONFIGURADO) {
      agregarMensaje({
        rol: "ia",
        motor: "alerta",
        texto:
          "⚠️ Gemini no está configurado todavía.\nAgrega EXPO_PUBLIC_GEMINI_API_KEY en tu archivo .env y reinicia con npx expo start -c.",
      });
      setMostrarOpcionesManuales(true);
      return;
    }

    setCargandoGemini(true);
    try {
      const respuesta = await consultarGemini({
        pregunta: textoLimpio,
        productos: listaProductos,
        historialVentas,
        totalVentasHoy,
        usuarioActual,
        productoEnFoco: productoFoco,
        historialChat: mensajes,
      });

      agregarMensaje({
        rol: "ia",
        motor: "gemini",
        detalleMotor: respuesta.modelo,
        texto: respuesta.texto,
      });
    } catch (error) {
      agregarMensaje({
        rol: "ia",
        motor: "alerta",
        texto: `⚠️ No pude conectar con Gemini (${error?.message || "sin conexión"}).\nPuedes seguir usando el modo ⚡ Local o los botones rápidos de abajo.`,
      });
      setMostrarOpcionesManuales(true);
    } finally {
      setCargandoGemini(false);
    }
  }

  async function consultar(textoDirecto) {
    if (cargandoGemini) return;

    const textoLimpio = (
      typeof textoDirecto === "string" ? textoDirecto : pregunta
    ).trim();

    if (!textoLimpio) return;

    setPregunta("");
    setMostrarOpcionesManuales(false);
    agregarMensaje({ rol: "usuario", texto: textoLimpio });

    if (totalProductos === 0) {
      agregarMensaje({
        rol: "ia",
        motor: "alerta",
        texto: "No hay productos registrados en el catálogo todavía.",
      });
      return;
    }

    // 1. Modo SOLO GEMINI
    if (modoIA === "gemini") {
      await ejecutarConsultaGemini(textoLimpio, productoActual);
      return;
    }

    // 2. Analizamos primero con el motor LOCAL (1-NN)
    const { productoDetectado, indiceDetectado, prediccion } = analizarConsulta(
      textoLimpio,
      listaProductos,
    );

    let objetivo = productoActual;
    let prefijoAuto = "";
    if (productoDetectado && indiceDetectado >= 0) {
      setIndice(indiceDetectado);
      objetivo = productoDetectado;
      prefijoAuto = `🔎 ${productoDetectado.nombre}\n`;
    }

    const preguntaAnalitica = esPreguntaCompleja(textoLimpio);

    // En modo HÍBRIDO: si la pregunta es analítica o el modelo local no la reconoce, escalamos a Gemini
    const escalarAGemini =
      modoIA === "hibrido" &&
      GEMINI_CONFIGURADO &&
      (preguntaAnalitica ||
        prediccion.intencion === "desconocido" ||
        prediccion.intencion === "ambiguo");

    if (escalarAGemini) {
      await ejecutarConsultaGemini(textoLimpio, objetivo);
      return;
    }

    // Si estamos en modo Local (o sin API key) y no se reconoció:
    if (
      prediccion.intencion === "desconocido" ||
      prediccion.intencion === "ambiguo"
    ) {
      const esEmpate = prediccion.intencion === "ambiguo";
      agregarMensaje({
        rol: "ia",
        motor: "alerta",
        texto: esEmpate
          ? `${prefijoAuto}Tu consulta es ambigua en modo Local. Elige qué dato deseas consultar:`
          : `${prefijoAuto}El modelo local solo responde sobre nombre, precio, stock o descripción.${!GEMINI_CONFIGURADO ? "\n(Agrega tu clave de Gemini en .env para preguntas abiertas)." : ""}`,
      });
      setMostrarOpcionesManuales(true);
      return;
    }

    const datoReal = obtenerDatoProducto(objetivo, prediccion.intencion);
    if (prediccion.intencion === "ficha") {
      agregarMensaje({
        rol: "ia",
        motor: "local",
        texto: datoReal,
      });
      return;
    }

    const etiquetasLegibles = {
      nombre: "Nombre",
      precio: "Precio",
      descripcion: "Descripción",
      stock: "Stock",
    };

    agregarMensaje({
      rol: "ia",
      motor: "local",
      texto: `${prefijoAuto}${etiquetasLegibles[prediccion.intencion]}: ${datoReal}`,
    });
  }

  function resolverManualmente(intencionElegida) {
    if (!productoActual) return;
    setMostrarOpcionesManuales(false);
    const datoReal = obtenerDatoProducto(productoActual, intencionElegida);
    const etiquetasLegibles = {
      nombre: "Nombre",
      precio: "Precio",
      descripcion: "Descripción",
      stock: "Stock",
    };

    agregarMensaje({
      rol: "ia",
      motor: "local",
      texto: `${etiquetasLegibles[intencionElegida]} de ${productoActual.nombre}: ${datoReal}`,
    });
  }

  function siguienteProducto() {
    if (totalProductos === 0) return;
    setIndice((actual) => (actual + 1) % totalProductos);
  }

  function limpiarChat() {
    setMensajes([MENSAJE_BIENVENIDA]);
    setMostrarOpcionesManuales(false);
  }

  const estadoActual = productoActual
    ? obtenerEstadoStock(productoActual.stock, esOscuro)
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
    >
      <KeyboardAvoidingView
        style={styles.fondoOscuro}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            styles.tarjetaModal,
            { backgroundColor: tema.tarjeta, borderColor: tema.bordeSuave },
          ]}
        >
          {/* Encabezado */}
          <View
            style={[
              styles.encabezadoAsistente,
              { borderBottomColor: tema.bordeSuave },
            ]}
          >
            <View style={styles.filaTitulo}>
              <Text style={styles.iconoRobot}>🤖</Text>
              <View>
                <Text style={[styles.tituloAsistente, { color: tema.texto }]}>
                  Asistente Pilar
                </Text>
                <Text
                  style={[
                    styles.subtituloAsistente,
                    { color: GEMINI_CONFIGURADO ? tema.exito : tema.alerta },
                  ]}
                >
                  {GEMINI_CONFIGURADO
                    ? "⚡ Local + ✨ Gemini conectados"
                    : "⚡ Solo IA Local (agrega API Key para Gemini)"}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 6 }}>
              <Pressable
                style={[
                  styles.botonCerrarX,
                  { backgroundColor: tema.tarjetaSecundaria },
                ]}
                onPress={limpiarChat}
              >
                <Text style={{ fontSize: 15 }}>🧹</Text>
              </Pressable>
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
          </View>

          {/* Selector de motor: Híbrido / Local / Gemini */}
          <View
            style={[
              styles.barraModos,
              {
                backgroundColor: tema.tarjetaSecundaria,
                borderBottomColor: tema.bordeSuave,
              },
            ]}
          >
            {MODOS_IA.map((m) => {
              const activo = modoIA === m.id;
              return (
                <Pressable
                  key={m.id}
                  style={[
                    styles.chipModo,
                    {
                      backgroundColor: activo ? tema.primario : tema.tarjeta,
                      borderColor: activo ? tema.primario : tema.borde,
                    },
                  ]}
                  onPress={() => setModoIA(m.id)}
                >
                  <Text
                    style={[
                      styles.textoChipModo,
                      { color: activo ? "#FFFFFF" : tema.textoSecundario },
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.cuerpoScroll}
            contentContainerStyle={{ paddingBottom: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Foco del Producto */}
            <View
              style={[
                styles.cajaProducto,
                {
                  backgroundColor: tema.tarjetaSecundaria,
                  borderColor: tema.bordeSuave,
                },
              ]}
            >
              <View style={styles.filaProductoIA}>
                {productoActual && (
                  <ImagenProducto
                    uri={productoActual.imagenUri}
                    tamano={44}
                    radio={10}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.etiquetaContexto, { color: tema.textoSuave }]}
                  >
                    {totalProductos > 0
                      ? `ARTÍCULO EN FOCO (${indiceSeguro + 1}/${totalProductos})`
                      : "CATÁLOGO VACÍO"}
                  </Text>
                  <Text
                    style={[styles.nombreProducto, { color: tema.texto }]}
                    numberOfLines={1}
                  >
                    {productoActual ? productoActual.nombre : "Sin artículos"}
                  </Text>
                  {estadoActual && (
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: estadoActual.colorTexto,
                      }}
                    >
                      {estadoActual.icono} {estadoActual.etiquetaCorta}
                    </Text>
                  )}
                </View>

                {totalProductos > 1 && (
                  <Pressable
                    style={[
                      styles.botonSecundario,
                      {
                        backgroundColor: tema.tarjeta,
                        borderColor: tema.borde,
                      },
                    ]}
                    onPress={siguienteProducto}
                  >
                    <Text
                      style={[
                        styles.textoBotonSecundario,
                        { color: tema.textoSecundario },
                      ]}
                    >
                      Cambiar ↻
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Atajos rápidos (Local + Gemini) */}
              <View style={styles.filaAtajos}>
                <Pressable
                  style={[
                    styles.chipAtajo,
                    { backgroundColor: tema.tarjeta, borderColor: tema.borde },
                  ]}
                  onPress={() => resolverManualmente("precio")}
                >
                  <Text style={[styles.textoAtajo, { color: tema.primario }]}>
                    ⚡ Precio
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.chipAtajo,
                    { backgroundColor: tema.tarjeta, borderColor: tema.borde },
                  ]}
                  onPress={() => resolverManualmente("stock")}
                >
                  <Text style={[styles.textoAtajo, { color: tema.primario }]}>
                    ⚡ Stock
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.chipAtajo,
                    {
                      backgroundColor: tema.primarioSuave,
                      borderColor: tema.primarioBorde,
                    },
                  ]}
                  onPress={() =>
                    consultar("¿Qué productos debo reabastecer urgente?")
                  }
                >
                  <Text style={[styles.textoAtajo, { color: tema.primario }]}>
                    ✨ Reabastecer
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.chipAtajo,
                    {
                      backgroundColor: tema.primarioSuave,
                      borderColor: tema.primarioBorde,
                    },
                  ]}
                  onPress={() => consultar("Dame un resumen de las ventas de hoy")}
                >
                  <Text style={[styles.textoAtajo, { color: tema.primario }]}>
                    ✨ Resumen hoy
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Conversación */}
            {mensajes.map((msg) => {
              if (msg.rol === "usuario") {
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.burbujaUsuario,
                      { backgroundColor: tema.primario },
                    ]}
                  >
                    <Text style={styles.textoBurbujaUsuario}>{msg.texto}</Text>
                  </View>
                );
              }

              const esGemini = msg.motor === "gemini";
              const esLocal = msg.motor === "local";
              const esAlerta = msg.motor === "alerta";

              const fondoBurbuja = esAlerta
                ? tema.alertaFondo
                : esLocal
                  ? tema.exitoFondo
                  : tema.primarioSuave;

              return (
                <View
                  key={msg.id}
                  style={[styles.burbujaIA, { backgroundColor: fondoBurbuja }]}
                >
                  {(esGemini || esLocal) && (
                    <Text
                      style={[
                        styles.etiquetaMotor,
                        { color: esGemini ? tema.primario : tema.exito },
                      ]}
                    >
                      {esGemini
                        ? `✨ Gemini (${msg.detalleMotor || "Nube"})`
                        : "⚡ IA Local (Offline)"}
                    </Text>
                  )}
                  <Text style={[styles.textoBurbujaIA, { color: tema.texto }]}>
                    {msg.texto}
                  </Text>
                </View>
              );
            })}

            {cargandoGemini && (
              <View
                style={[
                  styles.burbujaIA,
                  {
                    backgroundColor: tema.primarioSuave,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  },
                ]}
              >
                <ActivityIndicator size="small" color={tema.primario} />
                <Text style={[styles.textoBurbujaIA, { color: tema.texto }]}>
                  ✨ Gemini está analizando tu negocio...
                </Text>
              </View>
            )}

            {mostrarOpcionesManuales && productoActual && (
              <View style={styles.cajaOpcionesManuales}>
                {["nombre", "precio", "stock", "descripcion"].map((campo) => (
                  <Pressable
                    key={campo}
                    style={[
                      styles.chipManual,
                      { backgroundColor: tema.primario },
                    ]}
                    onPress={() => resolverManualmente(campo)}
                  >
                    <Text style={styles.textoChipManual}>
                      {campo === "nombre"
                        ? "🏷️ Nombre"
                        : campo === "precio"
                          ? "💲 Precio"
                          : campo === "stock"
                            ? "📦 Stock"
                            : "📄 Descripción"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Barra de escritura */}
          <View
            style={[
              styles.cajaChat,
              {
                borderTopColor: tema.bordeSuave,
                backgroundColor: tema.tarjeta,
              },
            ]}
          >
            <TextInput
              style={[
                styles.inputChat,
                {
                  backgroundColor: tema.inputFondo,
                  color: tema.texto,
                  borderColor: tema.borde,
                },
              ]}
              value={pregunta}
              onChangeText={setPregunta}
              placeholder={
                modoIA === "local"
                  ? 'Ej. "¿Cuántos cuadernos quedan?"'
                  : 'Pregunta por productos, combos o ventas...'
              }
              placeholderTextColor={tema.textoSuave}
              returnKeyType="send"
              editable={!cargandoGemini}
              onSubmitEditing={() => consultar()}
            />
            <Pressable
              style={[
                styles.botonEnviar,
                {
                  backgroundColor: cargandoGemini ? "#94A3B8" : tema.primario,
                },
              ]}
              disabled={cargandoGemini}
              onPress={() => consultar()}
            >
              <Text style={styles.textoBotonEnviar}>➤</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondoOscuro: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  tarjetaModal: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 15,
  },
  encabezadoAsistente: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  filaTitulo: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconoRobot: { fontSize: 26, marginRight: 10 },
  tituloAsistente: { fontSize: 17, fontWeight: "bold" },
  subtituloAsistente: { fontSize: 11, fontWeight: "600", marginTop: 1 },
  botonCerrarX: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  textoCerrarX: { fontSize: 16, fontWeight: "bold" },

  barraModos: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  chipModo: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  textoChipModo: { fontSize: 12, fontWeight: "bold" },

  cuerpoScroll: { paddingHorizontal: 18, paddingTop: 14 },
  cajaProducto: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  filaProductoIA: { flexDirection: "row", alignItems: "center", gap: 10 },
  etiquetaContexto: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  nombreProducto: { fontSize: 14, fontWeight: "bold" },
  botonSecundario: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  textoBotonSecundario: { fontWeight: "bold", fontSize: 11 },
  filaAtajos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  chipAtajo: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  textoAtajo: { fontSize: 11, fontWeight: "bold" },

  burbujaUsuario: {
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    marginBottom: 10,
    maxWidth: "85%",
  },
  textoBurbujaUsuario: { color: "#FFFFFF", fontSize: 14 },
  burbujaIA: {
    alignSelf: "flex-start",
    padding: 13,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    marginBottom: 10,
    maxWidth: "92%",
  },
  etiquetaMotor: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  textoBurbujaIA: { fontSize: 14, lineHeight: 20 },
  cajaOpcionesManuales: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chipManual: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  textoChipManual: { color: "#FFFFFF", fontSize: 12, fontWeight: "bold" },
  cajaChat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "android" ? 28 : 22,
    borderTopWidth: 1,
  },
  inputChat: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    fontSize: 14,
    borderWidth: 1,
  },
  botonEnviar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  textoBotonEnviar: { color: "#FFFFFF", fontSize: 17, fontWeight: "bold" },
});