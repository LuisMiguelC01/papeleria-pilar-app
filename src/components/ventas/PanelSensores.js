// src/components/ventas/PanelSensores.js
import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Accelerometer } from "expo-sensors";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTema } from "../../context/TemaContext";

const DESCRIPCION_MODOS_SENSOR = {
  apagado:
    "Activa un modo opcional: inclina el teléfono para cambiar cantidades, usa Simulación en PC o escanea códigos de barras con la Cámara.",
  real: "Inclina a la derecha (+1), izquierda (-1) o sacude el teléfono para vaciar la factura actual.",
  simulacion:
    "Simula el acelerómetro con botones desde PC/Web o sin mover el dispositivo.",
};

const FORMATOS_CODIGO = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "qr",
];

export function PanelSensores({
  tieneProducto,
  tieneStockDisponible,
  onIncrementar,
  onDisminuir,
  onSacudir,
  onConfirmarCamara,
  onCodigoEscaneado,
  colapsable = false,
}) {
  const { tema } = useTema();
  const [expandido, setExpandido] = useState(!colapsable);

  const [modoSensor, setModoSensor] = useState("apagado");
  const [lectura, setLectura] = useState({ x: 0, y: 0, z: 1 });
  const [mensajeSensor, setMensajeSensor] = useState("Sensores desactivados");
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();
  const [errorCamara, setErrorCamara] = useState("");
  const bloqueoEscaneoRef = useRef(false);

  useEffect(() => {
    setExpandido(!colapsable);
  }, [colapsable]);

  useEffect(() => {
    if (mostrarCamara) {
      bloqueoEscaneoRef.current = false;
    }
  }, [mostrarCamara]);

  const procesarMovimiento = (data) => {
    const magnitudTotal =
      Math.abs(data.x) + Math.abs(data.y) + Math.abs(data.z);

    if (magnitudTotal > 2.3) {
      onSacudir();
      setMensajeSensor("📳 ¡Sacudida detectada! Venta reiniciada.");
      return;
    }

    if (!tieneProducto) {
      setMensajeSensor("Selecciona un producto disponible primero.");
      return;
    }

    if (!tieneStockDisponible) {
      setMensajeSensor("🔴 Producto sin unidades disponibles.");
      return;
    }

    if (data.x > 0.5) {
      onIncrementar();
      setMensajeSensor("➡️ Inclinado a la derecha: +1 unidad");
    } else if (data.x < -0.5) {
      onDisminuir();
      setMensajeSensor("⬅️ Inclinado a la izquierda: -1 unidad");
    } else {
      setMensajeSensor("🟢 Dispositivo nivelado: cantidad fija");
    }
  };

  const procesarMovimientoRef = useRef(procesarMovimiento);
  procesarMovimientoRef.current = procesarMovimiento;

  useEffect(() => {
    if (modoSensor !== "real" || mostrarCamara) return;
    let cancelado = false;
    let subscription;

    async function conectarAcelerometro() {
      setMensajeSensor("Comprobando acelerómetro...");
      try {
        if (Platform.OS === "web") {
          setMensajeSensor("En navegador web usa el modo Simulación.");
          return;
        }
        const permiso = await Accelerometer.requestPermissionsAsync();
        if (cancelado) return;
        if (!permiso.granted) {
          setMensajeSensor("Permiso denegado. Usa el modo Simulación.");
          return;
        }
        const disponible = await Accelerometer.isAvailableAsync();
        if (cancelado) return;
        if (!disponible) {
          setMensajeSensor("Sensor no disponible. Usa el modo Simulación.");
          return;
        }
        Accelerometer.setUpdateInterval(500);
        subscription = Accelerometer.addListener((data) => {
          if (cancelado) return;
          setLectura(data);
          procesarMovimientoRef.current(data);
        });
      } catch {
        if (!cancelado) setMensajeSensor("Error al iniciar sensor.");
      }
    }

    conectarAcelerometro();
    return () => {
      cancelado = true;
      subscription?.remove();
    };
  }, [modoSensor, mostrarCamara]);

  const manejarLecturaCodigo = ({ data }) => {
    if (bloqueoEscaneoRef.current || !data) return;
    bloqueoEscaneoRef.current = true;
    setMostrarCamara(false);
    if (onCodigoEscaneado) {
      onCodigoEscaneado(String(data).trim());
    }
  };

  const manejarConfirmacionCamara = () => {
    onConfirmarCamara();
    setMostrarCamara(false);
  };

  const etiquetaEstado = mostrarCamara
    ? "📷 Escáner"
    : modoSensor === "real"
      ? "🖐️ Activo"
      : modoSensor === "simulacion"
        ? "🎛️ Simulación"
        : "Opcional";

  const hayAlgoActivo = mostrarCamara || modoSensor !== "apagado";

  return (
    <View
      style={[
        styles.panelSensores,
        colapsable && !expandido && { paddingVertical: 10 },
        {
          backgroundColor: tema.tarjeta,
          borderColor: hayAlgoActivo ? tema.primarioBorde : tema.bordeSuave,
        },
      ]}
    >
      {colapsable ? (
        <Pressable
          style={styles.filaCabeceraColapsable}
          onPress={() => setExpandido(!expandido)}
        >
          <View style={styles.filaTituloColapsable}>
            <Text style={[styles.tituloColapsable, { color: tema.texto }]}>
              🎛️ Sensores y Escáner
            </Text>
            <View
              style={[
                styles.badgeEstado,
                {
                  backgroundColor: hayAlgoActivo
                    ? tema.primarioSuave
                    : tema.tarjetaSecundaria,
                  borderColor: hayAlgoActivo ? tema.primarioBorde : tema.borde,
                },
              ]}
            >
              <Text
                style={[
                  styles.textoBadgeEstado,
                  { color: hayAlgoActivo ? tema.primario : tema.textoSuave },
                ]}
              >
                {etiquetaEstado}
              </Text>
            </View>
          </View>
          <Text style={[styles.flechaColapsar, { color: tema.primario }]}>
            {expandido ? "▴" : "▾"}
          </Text>
        </Pressable>
      ) : (
        <Text style={[styles.tituloPanelSensores, { color: tema.primario }]}>
          CONTROLES ASISTIDOS, SENSORES Y ESCÁNER (OPCIONAL)
        </Text>
      )}

      {expandido && (
        <View style={colapsable ? { marginTop: 10 } : undefined}>
          <View style={styles.filaBotonesSensores}>
            <Pressable
              style={[
                styles.chipSensor,
                {
                  backgroundColor:
                    modoSensor === "real"
                      ? tema.primario
                      : tema.tarjetaSecundaria,
                  borderColor:
                    modoSensor === "real" ? tema.primario : tema.bordeSuave,
                },
              ]}
              onPress={() =>
                setModoSensor(modoSensor === "real" ? "apagado" : "real")
              }
            >
              <Text
                style={[
                  styles.textoChipSensor,
                  { color: modoSensor === "real" ? "#FFFFFF" : tema.texto },
                ]}
              >
                🖐️ Sensor Real
              </Text>
              <Text
                style={[
                  styles.subtextoChipSensor,
                  { color: modoSensor === "real" ? "#DBEAFE" : tema.textoSuave },
                ]}
              >
                Inclinar / Sacudir
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.chipSensor,
                {
                  backgroundColor:
                    modoSensor === "simulacion"
                      ? tema.primario
                      : tema.tarjetaSecundaria,
                  borderColor:
                    modoSensor === "simulacion"
                      ? tema.primario
                      : tema.bordeSuave,
                },
              ]}
              onPress={() =>
                setModoSensor(
                  modoSensor === "simulacion" ? "apagado" : "simulacion",
                )
              }
            >
              <Text
                style={[
                  styles.textoChipSensor,
                  {
                    color:
                      modoSensor === "simulacion" ? "#FFFFFF" : tema.texto,
                  },
                ]}
              >
                🎛️ Simulación
              </Text>
              <Text
                style={[
                  styles.subtextoChipSensor,
                  {
                    color:
                      modoSensor === "simulacion"
                        ? "#DBEAFE"
                        : tema.textoSuave,
                  },
                ]}
              >
                Probar en PC/Web
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.chipSensor,
                {
                  backgroundColor: mostrarCamara
                    ? tema.primario
                    : tema.tarjetaSecundaria,
                  borderColor: mostrarCamara ? tema.primario : tema.bordeSuave,
                },
              ]}
              onPress={() => {
                setErrorCamara("");
                setMostrarCamara(!mostrarCamara);
              }}
            >
              <Text
                style={[
                  styles.textoChipSensor,
                  { color: mostrarCamara ? "#FFFFFF" : tema.texto },
                ]}
              >
                📷 Escáner
              </Text>
              <Text
                style={[
                  styles.subtextoChipSensor,
                  { color: mostrarCamara ? "#DBEAFE" : tema.textoSuave },
                ]}
              >
                Código de barras
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.ayudaSensor, { color: tema.textoSecundario }]}>
            {mostrarCamara
              ? "Apunta al código de barras o QR del producto para seleccionarlo automáticamente."
              : DESCRIPCION_MODOS_SENSOR[modoSensor]}
          </Text>

          {modoSensor !== "apagado" && (
            <View
              style={[
                styles.cajaEstadoSensor,
                {
                  backgroundColor: tema.tarjetaSecundaria,
                  borderColor: tema.bordeSuave,
                },
              ]}
            >
              <Text style={[styles.textoEstadoSensor, { color: tema.texto }]}>
                {mensajeSensor} • [X: {lectura.x.toFixed(2)}g]
              </Text>
              {modoSensor === "simulacion" && (
                <View style={styles.botonesSimulacion}>
                  <Pressable
                    style={[
                      styles.btnSim,
                      { backgroundColor: tema.tarjeta, borderColor: tema.borde },
                    ]}
                    onPress={() => {
                      const sim = { x: -0.8, y: 0, z: 1 };
                      setLectura(sim);
                      procesarMovimiento(sim);
                    }}
                  >
                    <Text style={[styles.txtBtnSim, { color: tema.texto }]}>
                      ⬅️ -1
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.btnSim,
                      { backgroundColor: tema.tarjeta, borderColor: tema.borde },
                    ]}
                    onPress={() => {
                      const sim = { x: 0, y: 0, z: 1 };
                      setLectura(sim);
                      procesarMovimiento(sim);
                    }}
                  >
                    <Text style={[styles.txtBtnSim, { color: tema.texto }]}>
                      ⚖️ Nivelar
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.btnSim,
                      { backgroundColor: tema.tarjeta, borderColor: tema.borde },
                    ]}
                    onPress={() => {
                      const sim = { x: 0.8, y: 0, z: 1 };
                      setLectura(sim);
                      procesarMovimiento(sim);
                    }}
                  >
                    <Text style={[styles.txtBtnSim, { color: tema.texto }]}>
                      ➡️ +1
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.btnSim,
                      {
                        backgroundColor: tema.peligroFondo,
                        borderColor: tema.peligroBorde,
                      },
                    ]}
                    onPress={() => {
                      const sim = { x: 1.5, y: 1.2, z: 1.0 };
                      setLectura(sim);
                      procesarMovimiento(sim);
                    }}
                  >
                    <Text style={[styles.txtBtnSim, { color: tema.peligro }]}>
                      📳 Sacudir
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {mostrarCamara && (
            <View
              style={[
                styles.cajaCamara,
                {
                  backgroundColor: tema.tarjetaSecundaria,
                  borderColor: tema.bordeSuave,
                },
              ]}
            >
              <Text style={[styles.tituloCamara, { color: tema.texto }]}>
                📷 Lector de Código de Barras
              </Text>
              {errorCamara !== "" && (
                <Text
                  style={[styles.textoErrorCamara, { color: tema.peligro }]}
                >
                  ⚠️ {errorCamara}
                </Text>
              )}
              {!permisoCamara ? (
                <Text style={[styles.textoGris, { color: tema.textoSuave }]}>
                  Comprobando permiso...
                </Text>
              ) : !permisoCamara.granted ? (
                <Pressable
                  style={[
                    styles.btnPermisoCamara,
                    { backgroundColor: tema.primario },
                  ]}
                  onPress={pedirPermisoCamara}
                >
                  <Text style={{ color: "white", fontWeight: "bold" }}>
                    Permitir Cámara
                  </Text>
                </Pressable>
              ) : (
                <View>
                  <View style={styles.contenedorCamara}>
                    <CameraView
                      style={styles.vistaCamara}
                      facing="back"
                      barcodeScannerSettings={{ barcodeTypes: FORMATOS_CODIGO }}
                      onBarcodeScanned={manejarLecturaCodigo}
                      onMountError={() =>
                        setErrorCamara(
                          "No se pudo iniciar la cámara en este dispositivo.",
                        )
                      }
                    />
                    {/* Marco guía centrado */}
                    <View pointerEvents="none" style={styles.marcoGuia}>
                      <View style={styles.lineaLaser} />
                    </View>
                  </View>

                  <Pressable
                    style={[
                      styles.btnDetectarEmpaque,
                      { backgroundColor: tema.exito },
                    ]}
                    onPress={manejarConfirmacionCamara}
                  >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      {Platform.OS === "web"
                        ? "Simular escaneo de producto"
                        : "Seleccionar siguiente artículo (prueba)"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panelSensores: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  filaCabeceraColapsable: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filaTituloColapsable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tituloColapsable: { fontSize: 13, fontWeight: "bold" },
  badgeEstado: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  textoBadgeEstado: { fontSize: 11, fontWeight: "700" },
  flechaColapsar: { fontSize: 16, fontWeight: "bold" },
  tituloPanelSensores: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  filaBotonesSensores: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipSensor: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  textoChipSensor: { fontSize: 12, fontWeight: "bold" },
  subtextoChipSensor: { fontSize: 10, marginTop: 2 },
  ayudaSensor: { fontSize: 12, marginTop: 8, lineHeight: 16 },
  cajaEstadoSensor: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  textoEstadoSensor: { fontSize: 12, fontWeight: "600" },
  botonesSimulacion: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  btnSim: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  txtBtnSim: { fontSize: 11, fontWeight: "bold" },
  cajaCamara: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tituloCamara: { fontSize: 13, fontWeight: "bold", marginBottom: 6 },
  textoGris: { fontSize: 13 },
  textoErrorCamara: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  contenedorCamara: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
    marginVertical: 8,
  },
  vistaCamara: { height: 190, width: "100%" },
  marcoGuia: {
    position: "absolute",
    top: 38,
    left: 28,
    right: 28,
    bottom: 38,
    borderWidth: 2,
    borderColor: "#22C55E",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  lineaLaser: {
    width: "90%",
    height: 2,
    backgroundColor: "rgba(239, 68, 68, 0.85)",
  },
  btnPermisoCamara: {
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 6,
  },
  btnDetectarEmpaque: {
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
});