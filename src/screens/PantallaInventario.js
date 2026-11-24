// src/screens/PantallaInventario.js
import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTema } from "../context/TemaContext";
import { obtenerEstadoStock, UMBRAL_STOCK_BAJO } from "../utils/stockHelpers";
import { ImagenProducto } from "../components/ImagenProducto";

const soloDigitos = (texto) => texto.replace(/[^0-9]/g, "");
const FORMATOS_CODIGO = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "qr",
];

export function PantallaInventario({
  anchoPantalla,
  productos,
  puedeGestionar = true,
  onAgregarProductoInventario,
  onEditarProductoInventario,
  onEliminarProductoInventario,
  onMostrarDialogo,
}) {
  const { tema, esOscuro } = useTema();

  // Búsqueda y filtros
  const [busqueda, setBusqueda] = useState("");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [ordenPrecio, setOrdenPrecio] = useState("recientes");
  const [filtroStock, setFiltroStock] = useState("todos");
  const [mostrarFiltrosMovil, setMostrarFiltrosMovil] = useState(false);

  // Modal de creación / edición
  const [modalVisible, setModalVisible] = useState(false);
  const [productoEditandoId, setProductoEditandoId] = useState(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [imagenUri, setImagenUri] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [errorForm, setErrorForm] = useState("");

  // Escáner de código dentro del modal
  const [escaneandoCodigo, setEscaneandoCodigo] = useState(false);
  const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();
  const bloqueoEscaneoRef = useRef(false);

  const esPantallaAmplia = anchoPantalla >= 700;

  let columnas = 1;
  if (anchoPantalla >= 900) columnas = 3;
  else if (anchoPantalla >= 600) columnas = 2;

  const abrirModalNuevo = () => {
    if (!puedeGestionar) return;
    setProductoEditandoId(null);
    setNombre("");
    setDescripcion("");
    setPrecio("");
    setStock("");
    setImagenUri("");
    setCodigoBarras("");
    setEscaneandoCodigo(false);
    setErrorForm("");
    setModalVisible(true);
  };

  const abrirModalEditar = (item) => {
    if (!puedeGestionar) return;
    setProductoEditandoId(item.id);
    setNombre(item.nombre);
    setDescripcion(item.descripcion || "");
    setPrecio(String(item.precio));
    setStock(String(item.stock));
    setImagenUri(item.imagenUri || "");
    setCodigoBarras(item.codigoBarras || "");
    setEscaneandoCodigo(false);
    setErrorForm("");
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setProductoEditandoId(null);
    setEscaneandoCodigo(false);
    setErrorForm("");
  };

  const toggleEscanerModal = async () => {
    if (escaneandoCodigo) {
      setEscaneandoCodigo(false);
      return;
    }
    if (!permisoCamara?.granted) {
      const res = await pedirPermisoCamara();
      if (!res?.granted) {
        setErrorForm("Se necesita permiso de cámara para escanear códigos.");
        return;
      }
    }
    bloqueoEscaneoRef.current = false;
    setEscaneandoCodigo(true);
  };

  const alEscanearCodigoForm = ({ data }) => {
    if (bloqueoEscaneoRef.current || !data) return;
    bloqueoEscaneoRef.current = true;
    setCodigoBarras(String(data).trim());
    setEscaneandoCodigo(false);
    if (errorForm) setErrorForm("");
  };

  const extraerUriImagen = (result) => {
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const asset = result.assets[0];
    if (Platform.OS === "web" && asset.base64) {
      const mime = asset.mimeType || "image/jpeg";
      setImagenUri(`data:${mime};base64,${asset.base64}`);
    } else if (asset.uri) {
      setImagenUri(asset.uri);
    }
  };

  const opcionesPicker = {
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.35,
    base64: Platform.OS === "web",
    mediaTypes: ["images"],
  };

  const seleccionarDesdeGaleria = async () => {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        setErrorForm("Se necesita permiso de galería para elegir una imagen.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync(opcionesPicker);
      extraerUriImagen(result);
    } catch {
      setErrorForm("No se pudo abrir la galería en este dispositivo.");
    }
  };

  const tomarFotoConCamara = async () => {
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        setErrorForm("Se necesita permiso de cámara para tomar una foto.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync(opcionesPicker);
      extraerUriImagen(result);
    } catch {
      setErrorForm("No se pudo abrir la cámara en este dispositivo.");
    }
  };

  const ajustarStockRapido = (delta) => {
    const actual = parseInt(stock || "0", 10);
    const nuevo = Math.max(0, (isNaN(actual) ? 0 : actual) + delta);
    setStock(String(nuevo));
  };

  const guardarProducto = () => {
    if (!puedeGestionar) return;

    const nombreLimpio = nombre.trim();
    const codigoLimpio = codigoBarras.trim();
    const precioNum = parseInt(precio, 10);
    const stockNum = parseInt(stock, 10);

    if (nombreLimpio.length < 2) {
      setErrorForm("Ingresa un nombre válido (mínimo 2 caracteres).");
      return;
    }

    if (isNaN(precioNum) || precioNum <= 0) {
      setErrorForm("El precio debe ser un número mayor a $0.");
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      setErrorForm("El stock debe ser un número igual o mayor a 0.");
      return;
    }

    if (codigoLimpio !== "") {
      const duplicado = productos.find(
        (p) =>
          p.id !== productoEditandoId &&
          p.codigoBarras &&
          p.codigoBarras.trim().toLowerCase() === codigoLimpio.toLowerCase(),
      );
      if (duplicado) {
        setErrorForm(
          `El código "${codigoLimpio}" ya pertenece a "${duplicado.nombre}".`,
        );
        return;
      }
    }

    const datosProducto = {
      id: productoEditandoId || Date.now().toString(),
      nombre: nombreLimpio,
      descripcion: descripcion.trim() || "Artículo registrado desde la app",
      precio: precioNum,
      stock: stockNum,
      imagenUri:
        typeof imagenUri === "string" ? imagenUri.trim() : imagenUri || "",
      codigoBarras: codigoLimpio,
    };

    if (productoEditandoId) {
      onEditarProductoInventario(datosProducto);
    } else {
      onAgregarProductoInventario(datosProducto);
    }

    cerrarModal();
  };

  const confirmarEliminar = (item) => {
    if (!puedeGestionar) return;
    const mensaje = `¿Eliminar "${item.nombre}" del inventario?\nLas ventas ya registradas en Reportes se conservarán.`;

    if (onMostrarDialogo) {
      onMostrarDialogo({
        titulo: "Eliminar producto",
        mensaje,
        tipo: "confirmar",
        textoConfirmar: "Eliminar",
        onConfirmar: () => onEliminarProductoInventario(item.id),
      });
      return;
    }

    onEliminarProductoInventario(item.id);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setPrecioMin("");
    setPrecioMax("");
    setOrdenPrecio("recientes");
    setFiltroStock("todos");
  };

  const hayFiltrosActivos = Boolean(
    busqueda.trim() ||
    precioMin !== "" ||
    precioMax !== "" ||
    ordenPrecio !== "recientes" ||
    filtroStock !== "todos",
  );

  const rangoInvalido =
    precioMin !== "" &&
    precioMax !== "" &&
    parseInt(precioMin, 10) > parseInt(precioMax, 10);

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const min = precioMin !== "" ? parseInt(precioMin, 10) : null;
    const max = precioMax !== "" ? parseInt(precioMax, 10) : null;

    const filtrados = productos.filter((item) => {
      const coincideTexto =
        !texto ||
        item.nombre.toLowerCase().includes(texto) ||
        (item.descripcion || "").toLowerCase().includes(texto) ||
        (item.codigoBarras || "").toLowerCase().includes(texto);

      if (!coincideTexto) return false;
      if (min !== null && item.precio < min) return false;
      if (max !== null && item.precio > max) return false;

      if (filtroStock === "agotado" && item.stock > 0) return false;
      if (
        filtroStock === "bajo" &&
        (item.stock <= 0 || item.stock > UMBRAL_STOCK_BAJO)
      ) {
        return false;
      }

      return true;
    });

    if (ordenPrecio === "menor") {
      return [...filtrados].sort((a, b) => a.precio - b.precio);
    }
    if (ordenPrecio === "mayor") {
      return [...filtrados].sort((a, b) => b.precio - a.precio);
    }
    return filtrados;
  }, [productos, busqueda, precioMin, precioMax, ordenPrecio, filtroStock]);

  const mostrarPanelFiltros = esPantallaAmplia || mostrarFiltrosMovil;

  return (
    <View style={[styles.contenedor, { backgroundColor: tema.fondo }]}>
      {!puedeGestionar && (
        <View
          style={[
            styles.bannerSoloLectura,
            {
              backgroundColor: tema.primarioSuave,
              borderColor: tema.primarioBorde,
            },
          ]}
        >
          <Text style={[styles.textoSoloLectura, { color: tema.primario }]}>
            👁️ Modo consulta — Solo el Administrador puede crear, editar o
            eliminar productos.
          </Text>
        </View>
      )}

      {/* Barra superior */}
      <View style={styles.barraSuperior}>
        <TextInput
          style={[
            styles.inputBusqueda,
            {
              backgroundColor: tema.tarjeta,
              borderColor: tema.borde,
              color: tema.texto,
            },
          ]}
          placeholder="🔍 Buscar por nombre, descripción o código..."
          placeholderTextColor={tema.textoSuave}
          value={busqueda}
          onChangeText={setBusqueda}
        />

        {!esPantallaAmplia && (
          <Pressable
            style={[
              styles.botonFiltrosMovil,
              {
                backgroundColor:
                  mostrarFiltrosMovil || hayFiltrosActivos
                    ? tema.primario
                    : tema.tarjeta,
                borderColor:
                  mostrarFiltrosMovil || hayFiltrosActivos
                    ? tema.primario
                    : tema.borde,
              },
            ]}
            onPress={() => setMostrarFiltrosMovil(!mostrarFiltrosMovil)}
          >
            <Text style={styles.textoBotonFiltrosMovil}>🎚️</Text>
          </Pressable>
        )}

        {puedeGestionar && (
          <Pressable
            style={[styles.botonNuevo, { backgroundColor: tema.primario }]}
            onPress={abrirModalNuevo}
          >
            <Text style={styles.textoBotonNuevo}>
              {esPantallaAmplia ? "+ Nuevo Producto" : "+ Nuevo"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Panel de Filtros */}
      {mostrarPanelFiltros && (
        <View
          style={[
            styles.panelFiltros,
            { backgroundColor: tema.tarjeta, borderColor: tema.bordeSuave },
          ]}
        >
          <View style={styles.filaFiltros}>
            <View style={styles.grupoPrecio}>
              <Text style={[styles.etiquetaFiltro, { color: tema.textoSuave }]}>
                PRECIO ($)
              </Text>
              <View style={styles.filaRangoPrecio}>
                <TextInput
                  style={[
                    styles.inputPrecio,
                    {
                      backgroundColor: tema.inputFondo,
                      borderColor: tema.borde,
                      color: tema.texto,
                    },
                  ]}
                  placeholder="Mín"
                  placeholderTextColor={tema.textoSuave}
                  keyboardType="numeric"
                  value={precioMin}
                  onChangeText={(t) => setPrecioMin(soloDigitos(t))}
                />
                <Text
                  style={[styles.separadorRango, { color: tema.textoSuave }]}
                >
                  –
                </Text>
                <TextInput
                  style={[
                    styles.inputPrecio,
                    {
                      backgroundColor: tema.inputFondo,
                      borderColor: tema.borde,
                      color: tema.texto,
                    },
                  ]}
                  placeholder="Máx"
                  placeholderTextColor={tema.textoSuave}
                  keyboardType="numeric"
                  value={precioMax}
                  onChangeText={(t) => setPrecioMax(soloDigitos(t))}
                />
              </View>
            </View>

            <View>
              <Text style={[styles.etiquetaFiltro, { color: tema.textoSuave }]}>
                ORDENAR
              </Text>
              <View style={styles.filaChips}>
                {[
                  { id: "recientes", label: "Recientes" },
                  { id: "menor", label: "↑ Menor $" },
                  { id: "mayor", label: "↓ Mayor $" },
                ].map((op) => {
                  const activo = ordenPrecio === op.id;
                  return (
                    <Pressable
                      key={op.id}
                      style={[
                        styles.chipFiltro,
                        {
                          backgroundColor: activo
                            ? tema.primario
                            : tema.tarjetaSecundaria,
                          borderColor: activo ? tema.primario : tema.bordeSuave,
                        },
                      ]}
                      onPress={() => setOrdenPrecio(op.id)}
                    >
                      <Text
                        style={[
                          styles.textoChipFiltro,
                          { color: activo ? "#FFFFFF" : tema.textoSecundario },
                        ]}
                      >
                        {op.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={[styles.etiquetaFiltro, { color: tema.textoSuave }]}>
                STOCK
              </Text>
              <View style={styles.filaChips}>
                {[
                  { id: "todos", label: "Todos" },
                  { id: "bajo", label: "🟠 Bajo" },
                  { id: "agotado", label: "🔴 Agotado" },
                ].map((op) => {
                  const activo = filtroStock === op.id;
                  return (
                    <Pressable
                      key={op.id}
                      style={[
                        styles.chipFiltro,
                        {
                          backgroundColor: activo
                            ? tema.primario
                            : tema.tarjetaSecundaria,
                          borderColor: activo ? tema.primario : tema.bordeSuave,
                        },
                      ]}
                      onPress={() => setFiltroStock(op.id)}
                    >
                      <Text
                        style={[
                          styles.textoChipFiltro,
                          { color: activo ? "#FFFFFF" : tema.textoSecundario },
                        ]}
                      >
                        {op.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {rangoInvalido && (
            <Text style={[styles.alertaRango, { color: tema.peligro }]}>
              ⚠️ El precio mínimo es mayor que el precio máximo.
            </Text>
          )}

          <View
            style={[
              styles.barraResumenFiltros,
              { borderTopColor: tema.bordeSuave },
            ]}
          >
            <Text
              style={[styles.contadorResultados, { color: tema.textoSuave }]}
            >
              Mostrando {productosFiltrados.length} de {productos.length}{" "}
              productos
            </Text>
            {hayFiltrosActivos && (
              <Pressable onPress={limpiarFiltros}>
                <Text style={[styles.enlaceLimpiar, { color: tema.peligro }]}>
                  ✕ Limpiar filtros
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Lista de Productos */}
      <FlatList
        data={productosFiltrados}
        keyboardShouldPersistTaps="handled"
        numColumns={columnas}
        key={columnas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <View style={styles.estadoVacio}>
            <Text style={{ fontSize: 34, marginBottom: 8 }}>
              {productos.length === 0 ? "📦" : "🔍"}
            </Text>
            <Text style={[styles.tituloVacio, { color: tema.texto }]}>
              {productos.length === 0
                ? "Tu inventario está vacío"
                : "No hay productos que coincidan"}
            </Text>
            <Text style={[styles.subtituloVacio, { color: tema.textoSuave }]}>
              {productos.length === 0
                ? puedeGestionar
                  ? 'Agrega tu primer artículo con el botón "+ Nuevo Producto".'
                  : "Aún no hay productos registrados en la papelería."
                : "Ajusta la búsqueda, el rango de precios o el filtro de stock."}
            </Text>
            {hayFiltrosActivos && (
              <Pressable
                style={[
                  styles.botonLimpiarVacio,
                  { backgroundColor: tema.tarjeta, borderColor: tema.borde },
                ]}
                onPress={limpiarFiltros}
              >
                <Text
                  style={[styles.textoBotonLimpiarVacio, { color: tema.texto }]}
                >
                  Limpiar búsqueda y filtros
                </Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const estado = obtenerEstadoStock(item.stock, esOscuro);
          return (
            <View style={styles.celda}>
              <View
                style={[
                  styles.tarjeta,
                  {
                    backgroundColor: tema.tarjeta,
                    borderColor: estado.agotado
                      ? estado.colorBorde
                      : tema.bordeSuave,
                  },
                ]}
              >
                <View style={styles.filaCabeceraTarjeta}>
                  <ImagenProducto uri={item.imagenUri} tamano={58} radio={12} />
                  <View style={styles.cuerpoTarjeta}>
                    <Text
                      style={[styles.nombre, { color: tema.texto }]}
                      numberOfLines={2}
                    >
                      {item.nombre}
                    </Text>
                    <Text
                      style={[styles.descripcion, { color: tema.textoSuave }]}
                      numberOfLines={2}
                    >
                      {item.descripcion}
                    </Text>
                    {Boolean(item.codigoBarras) && (
                      <Text
                        style={[
                          styles.codigoTarjeta,
                          { color: tema.textoSuave },
                        ]}
                      >
                        🏷️ {item.codigoBarras}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.filaInferior}>
                  <Text style={[styles.precio, { color: tema.primario }]}>
                    ${item.precio.toLocaleString("es-CO")}
                  </Text>
                  <View
                    style={[
                      styles.badgeStock,
                      {
                        backgroundColor: estado.colorFondo,
                        borderColor: estado.colorBorde,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.textoBadgeStock,
                        { color: estado.colorTexto },
                      ]}
                    >
                      {estado.icono} {estado.etiquetaCorta}
                    </Text>
                  </View>
                </View>

                {puedeGestionar && (
                  <View
                    style={[
                      styles.filaAcciones,
                      { borderTopColor: tema.bordeSuave },
                    ]}
                  >
                    <Pressable
                      style={[
                        styles.botonEditar,
                        {
                          backgroundColor: tema.primarioSuave,
                          borderColor: tema.primarioBorde,
                        },
                      ]}
                      onPress={() => abrirModalEditar(item)}
                    >
                      <Text
                        style={[
                          styles.textoBotonEditar,
                          { color: tema.primario },
                        ]}
                      >
                        ✏️ Editar
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.botonEliminar,
                        {
                          backgroundColor: tema.peligroFondo,
                          borderColor: tema.peligroBorde,
                        },
                      ]}
                      onPress={() => confirmarEliminar(item)}
                    >
                      <Text
                        style={[
                          styles.textoBotonEliminar,
                          { color: tema.peligro },
                        ]}
                      >
                        🗑️ Eliminar
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Modal Crear / Editar Producto */}
      {puedeGestionar && (
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={cerrarModal}
        >
          <KeyboardAvoidingView
            style={styles.fondoModal}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View
              style={[
                styles.tarjetaModal,
                { backgroundColor: tema.tarjeta, borderColor: tema.bordeSuave },
              ]}
            >
              <View
                style={[
                  styles.encabezadoModal,
                  { borderBottomColor: tema.bordeSuave },
                ]}
              >
                <Text style={[styles.tituloFormulario, { color: tema.texto }]}>
                  {productoEditandoId
                    ? "✏️ Editar Producto"
                    : "📦 Registrar Producto"}
                </Text>
                <Pressable
                  style={[
                    styles.botonCerrarX,
                    { backgroundColor: tema.tarjetaSecundaria },
                  ]}
                  onPress={cerrarModal}
                >
                  <Text
                    style={[
                      styles.textoCerrarX,
                      { color: tema.textoSecundario },
                    ]}
                  >
                    ✕
                  </Text>
                </Pressable>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled">
                {errorForm !== "" && (
                  <View
                    style={[
                      styles.cajaErrorForm,
                      {
                        backgroundColor: tema.peligroFondo,
                        borderColor: tema.peligroBorde,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.textoErrorForm, { color: tema.peligro }]}
                    >
                      ⚠️ {errorForm}
                    </Text>
                  </View>
                )}

                {/* Imagen */}
                <Text
                  style={[styles.labelCampo, { color: tema.textoSecundario }]}
                >
                  Imagen del producto (opcional)
                </Text>
                <View
                  style={[
                    styles.cajaImagenPicker,
                    {
                      backgroundColor: tema.tarjetaSecundaria,
                      borderColor: tema.bordeSuave,
                    },
                  ]}
                >
                  <ImagenProducto uri={imagenUri} tamano={64} radio={14} />

                  <View style={styles.columnaBotonesImagen}>
                    <View style={styles.filaBotonesImagen}>
                      <Pressable
                        style={[
                          styles.btnFoto,
                          {
                            backgroundColor: tema.primarioSuave,
                            borderColor: tema.primarioBorde,
                          },
                        ]}
                        onPress={seleccionarDesdeGaleria}
                      >
                        <Text
                          style={[styles.txtBtnFoto, { color: tema.primario }]}
                        >
                          🖼️ {Platform.OS === "web" ? "Subir foto" : "Galería"}
                        </Text>
                      </Pressable>

                      {Platform.OS !== "web" && (
                        <Pressable
                          style={[
                            styles.btnFoto,
                            {
                              backgroundColor: tema.primarioSuave,
                              borderColor: tema.primarioBorde,
                            },
                          ]}
                          onPress={tomarFotoConCamara}
                        >
                          <Text
                            style={[
                              styles.txtBtnFoto,
                              { color: tema.primario },
                            ]}
                          >
                            📷 Cámara
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {Boolean(imagenUri) && (
                      <Pressable
                        style={[
                          styles.btnQuitarFoto,
                          {
                            backgroundColor: tema.peligroFondo,
                            borderColor: tema.peligroBorde,
                          },
                        ]}
                        onPress={() => setImagenUri("")}
                      >
                        <Text
                          style={[styles.txtBtnFoto, { color: tema.peligro }]}
                        >
                          ✕ Quitar imagen
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
                <TextInput
                  style={[
                    styles.inputForm,
                    {
                      backgroundColor: tema.inputFondo,
                      borderColor: tema.borde,
                      color: tema.texto,
                    },
                  ]}
                  placeholder={
                    typeof imagenUri !== "string" && imagenUri
                      ? "Foto local cargada (pega una URL para cambiarla)"
                      : "O pega una URL de imagen (https://...)"
                  }
                  placeholderTextColor={tema.textoSuave}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={
                    typeof imagenUri === "string" &&
                    !imagenUri.startsWith("data:")
                      ? imagenUri
                      : ""
                  }
                  onChangeText={setImagenUri}
                />

                {/* Código de barras + Escáner directo */}
                <Text
                  style={[styles.labelCampo, { color: tema.textoSecundario }]}
                >
                  Código de barras (opcional)
                </Text>
                <View style={styles.filaCodigoBarras}>
                  <TextInput
                    style={[
                      styles.inputForm,
                      {
                        flex: 1,
                        marginBottom: 0,
                        backgroundColor: tema.inputFondo,
                        borderColor: tema.borde,
                        color: tema.texto,
                      },
                    ]}
                    placeholder="Ej. 7701001000011"
                    placeholderTextColor={tema.textoSuave}
                    value={codigoBarras}
                    onChangeText={(t) => {
                      setCodigoBarras(t);
                      if (errorForm) setErrorForm("");
                    }}
                  />
                  {Platform.OS !== "web" && (
                    <Pressable
                      style={[
                        styles.btnEscanearCodigo,
                        {
                          backgroundColor: escaneandoCodigo
                            ? tema.peligro
                            : tema.primario,
                        },
                      ]}
                      onPress={toggleEscanerModal}
                    >
                      <Text style={styles.txtBtnEscanear}>
                        {escaneandoCodigo ? "✕" : "📷 Leer"}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {escaneandoCodigo && (
                  <View style={styles.cajaEscanerModal}>
                    <CameraView
                      style={styles.camaraMini}
                      facing="back"
                      barcodeScannerSettings={{ barcodeTypes: FORMATOS_CODIGO }}
                      onBarcodeScanned={alEscanearCodigoForm}
                    />
                  </View>
                )}

                <Text
                  style={[
                    styles.labelCampo,
                    { color: tema.textoSecundario, marginTop: 12 },
                  ]}
                >
                  Nombre del artículo *
                </Text>
                <TextInput
                  style={[
                    styles.inputForm,
                    {
                      backgroundColor: tema.inputFondo,
                      borderColor: tema.borde,
                      color: tema.texto,
                    },
                  ]}
                  placeholder="Ej. Block Cuadriculado"
                  placeholderTextColor={tema.textoSuave}
                  value={nombre}
                  onChangeText={(t) => {
                    setNombre(t);
                    if (errorForm) setErrorForm("");
                  }}
                />

                <Text
                  style={[styles.labelCampo, { color: tema.textoSecundario }]}
                >
                  Descripción
                </Text>
                <TextInput
                  style={[
                    styles.inputForm,
                    {
                      backgroundColor: tema.inputFondo,
                      borderColor: tema.borde,
                      color: tema.texto,
                    },
                  ]}
                  placeholder="Ej. Tamaño oficio 80 hojas"
                  placeholderTextColor={tema.textoSuave}
                  value={descripcion}
                  onChangeText={setDescripcion}
                />

                <View style={styles.filaDoble}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.labelCampo,
                        { color: tema.textoSecundario },
                      ]}
                    >
                      Precio (COP) *
                    </Text>
                    <TextInput
                      style={[
                        styles.inputForm,
                        {
                          backgroundColor: tema.inputFondo,
                          borderColor: tema.borde,
                          color: tema.texto,
                        },
                      ]}
                      placeholder="Ej. 4500"
                      placeholderTextColor={tema.textoSuave}
                      keyboardType="numeric"
                      value={precio}
                      onChangeText={(t) => {
                        setPrecio(soloDigitos(t));
                        if (errorForm) setErrorForm("");
                      }}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.labelCampo,
                        { color: tema.textoSecundario },
                      ]}
                    >
                      Stock disponible *
                    </Text>
                    <TextInput
                      style={[
                        styles.inputForm,
                        {
                          backgroundColor: tema.inputFondo,
                          borderColor: tema.borde,
                          color: tema.texto,
                        },
                      ]}
                      placeholder="Ej. 30"
                      placeholderTextColor={tema.textoSuave}
                      keyboardType="numeric"
                      value={stock}
                      onChangeText={(t) => {
                        setStock(soloDigitos(t));
                        if (errorForm) setErrorForm("");
                      }}
                    />
                  </View>
                </View>

                <View
                  style={[
                    styles.filaAjusteStock,
                    {
                      backgroundColor: tema.tarjetaSecundaria,
                      borderColor: tema.bordeSuave,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.textoAjusteStock,
                      { color: tema.textoSecundario },
                    ]}
                  >
                    Ajuste rápido stock:
                  </Text>
                  <View style={styles.chipsAjusteStock}>
                    {[-1, 1, 5, 10].map((delta) => (
                      <Pressable
                        key={delta}
                        style={[
                          styles.chipAjuste,
                          {
                            backgroundColor: tema.tarjeta,
                            borderColor: tema.borde,
                          },
                        ]}
                        onPress={() => ajustarStockRapido(delta)}
                      >
                        <Text
                          style={[
                            styles.textoChipAjuste,
                            { color: tema.primario },
                          ]}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.filaBotonesModal}>
                  <Pressable
                    style={[
                      styles.botonCancelarModal,
                      { backgroundColor: tema.tarjetaSecundaria },
                    ]}
                    onPress={cerrarModal}
                  >
                    <Text
                      style={[
                        styles.textoCancelarModal,
                        { color: tema.textoSecundario },
                      ]}
                    >
                      Cancelar
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.botonGuardar,
                      { backgroundColor: tema.exito },
                    ]}
                    onPress={guardarProducto}
                  >
                    <Text style={styles.textoBotonGuardar}>
                      {productoEditandoId
                        ? "✓ Guardar Cambios"
                        : "✓ Crear Producto"}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  bannerSoloLectura: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  textoSoloLectura: { fontSize: 12, fontWeight: "700" },
  barraSuperior: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  inputBusqueda: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1,
  },
  botonFiltrosMovil: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  textoBotonFiltrosMovil: { fontSize: 18 },
  botonNuevo: {
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  textoBotonNuevo: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 },

  panelFiltros: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  filaFiltros: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    alignItems: "flex-end",
  },
  grupoPrecio: { minWidth: 170 },
  etiquetaFiltro: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  filaRangoPrecio: { flexDirection: "row", alignItems: "center", gap: 6 },
  inputPrecio: {
    width: 82,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  separadorRango: { fontWeight: "bold" },
  filaChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chipFiltro: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  textoChipFiltro: { fontSize: 12, fontWeight: "600" },
  alertaRango: { fontSize: 12, fontWeight: "600", marginTop: 8 },
  barraResumenFiltros: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  contadorResultados: { fontSize: 12, fontWeight: "500" },
  enlaceLimpiar: { fontSize: 12, fontWeight: "bold" },

  lista: { paddingHorizontal: 10, paddingBottom: 110 },
  celda: { flex: 1, padding: 6 },
  tarjeta: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    justifyContent: "space-between",
  },
  filaCabeceraTarjeta: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  cuerpoTarjeta: { flex: 1 },
  nombre: { fontSize: 15, fontWeight: "bold" },
  descripcion: { fontSize: 12, marginTop: 3 },
  codigoTarjeta: { fontSize: 11, marginTop: 4, fontWeight: "600" },
  filaInferior: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  precio: { fontSize: 17, fontWeight: "bold" },
  badgeStock: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  textoBadgeStock: { fontSize: 12, fontWeight: "700" },
  filaAcciones: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  botonEditar: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  textoBotonEditar: { fontWeight: "bold", fontSize: 12 },
  botonEliminar: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  textoBotonEliminar: { fontWeight: "bold", fontSize: 12 },

  estadoVacio: {
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 20,
  },
  tituloVacio: { fontSize: 16, fontWeight: "bold" },
  subtituloVacio: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
    textAlign: "center",
  },
  botonLimpiarVacio: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  textoBotonLimpiarVacio: { fontWeight: "bold", fontSize: 13 },

  fondoModal: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  tarjetaModal: {
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
  encabezadoModal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 14,
  },
  tituloFormulario: { fontSize: 17, fontWeight: "bold" },
  botonCerrarX: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textoCerrarX: { fontSize: 16, fontWeight: "bold" },
  cajaErrorForm: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  textoErrorForm: { fontSize: 12, fontWeight: "600" },
  labelCampo: { fontSize: 12, fontWeight: "700", marginBottom: 5 },
  cajaImagenPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  columnaBotonesImagen: { flex: 1, gap: 8 },
  filaBotonesImagen: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btnFoto: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  btnQuitarFoto: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  txtBtnFoto: { fontSize: 12, fontWeight: "bold" },
  filaCodigoBarras: { flexDirection: "row", gap: 8, alignItems: "center" },
  btnEscanearCodigo: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  txtBtnEscanear: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 },
  cajaEscanerModal: {
    marginTop: 8,
    borderRadius: 10,
    overflow: "hidden",
  },
  camaraMini: { height: 150, width: "100%" },
  inputForm: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  filaDoble: { flexDirection: "row", gap: 10 },
  filaAjusteStock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  textoAjusteStock: { fontSize: 12, fontWeight: "600" },
  chipsAjusteStock: { flexDirection: "row", gap: 6 },
  chipAjuste: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  textoChipAjuste: { fontSize: 12, fontWeight: "bold" },
  filaBotonesModal: { flexDirection: "row", gap: 10, marginTop: 4 },
  botonCancelarModal: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  textoCancelarModal: { fontWeight: "bold", fontSize: 14 },
  botonGuardar: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  textoBotonGuardar: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
});
