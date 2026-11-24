// src/screens/PantallaVentas.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTema } from "../context/TemaContext";
import { PanelSensores } from "../components/ventas/PanelSensores";
import { SelectorProducto } from "../components/ventas/SelectorProducto";
import {
  ResumenVenta,
  DatosFacturaYPago,
} from "../components/ventas/ResumenVenta";

const ICONO_PAGO = {
  Efectivo: "💵",
  Transferencia: "📲",
  Tarjeta: "💳",
};

export function PantallaVentas({
  esTableta,
  productos,
  nombreVendedor = "María López",
  proximoNumeroFactura = "FAC-0001",
  onRegistrarVenta,
  onMostrarDialogo,
}) {
  const { tema } = useTema();

  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState(null);
  const [cantidad, setCantidad] = useState(0);
  const [itemsEnVenta, setItemsEnVenta] = useState([]);

  const [nombreCliente, setNombreCliente] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [montoRecibido, setMontoRecibido] = useState("");

  // Modal rápido de pago/cliente en teléfono
  const [modalPagoMovil, setModalPagoMovil] = useState(false);

  const [cargando, setCargando] = useState(false);
  const bloqueoDobleToque = useRef(false);
  const [bannerExito, setBannerExito] = useState("");

  const productoSeleccionado =
    productos.find((p) => p.id === productoSeleccionadoId) || null;

  const obtenerDisponibleProducto = (prod) => {
    if (!prod) return 0;
    const enCarrito = itemsEnVenta
      .filter((i) => i.productoId === prod.id)
      .reduce((acc, i) => acc + i.cantidad, 0);
    return Math.max(0, prod.stock - enCarrito);
  };

  const stockDisponibleActual = obtenerDisponibleProducto(productoSeleccionado);

  useEffect(() => {
    if (!productoSeleccionado) {
      if (cantidad !== 0) setCantidad(0);
      return;
    }
    if (stockDisponibleActual <= 0) {
      setCantidad(0);
    } else if (cantidad > stockDisponibleActual) {
      setCantidad(stockDisponibleActual);
    }
  }, [productoSeleccionadoId, stockDisponibleActual]);

  const notificar = (titulo, mensaje, tipo = "info") => {
    if (onMostrarDialogo) {
      onMostrarDialogo({ titulo, mensaje, tipo });
    }
  };

  const seleccionarProductoLista = (prod) => {
    const disponible = obtenerDisponibleProducto(prod);
    if (disponible <= 0) {
      notificar(
        "Producto no disponible",
        prod.stock <= 0
          ? `"${prod.nombre}" está agotado en inventario.`
          : `Ya agregaste todas las unidades disponibles de "${prod.nombre}" a esta factura.`,
        "error",
      );
      return false;
    }

    setProductoSeleccionadoId(prod.id);
    setCantidad(1);
    return true;
  };

  const incrementar = () => {
    if (productoSeleccionado && cantidad < stockDisponibleActual) {
      setCantidad((prev) => prev + 1);
    }
  };

  const disminuir = () => {
    if (cantidad > 1) {
      setCantidad((prev) => prev - 1);
    }
  };

  const cancelarFormulario = () => {
    setItemsEnVenta([]);
    setProductoSeleccionadoId(null);
    setCantidad(0);
    setNombreCliente("");
    setMetodoPago("Efectivo");
    setMontoRecibido("");
  };

  const simularDeteccionCamara = () => {
    const disponibles = productos.filter(
      (p) => obtenerDisponibleProducto(p) > 0,
    );
    if (disponibles.length === 0) {
      notificar(
        "Sin productos disponibles",
        "Todos los artículos del catálogo están agotados o ya están completos en esta factura.",
        "error",
      );
      return;
    }

    const currentIndex = productoSeleccionado
      ? disponibles.findIndex((p) => p.id === productoSeleccionado.id)
      : -1;
    const nextProduct = disponibles[(currentIndex + 1) % disponibles.length];
    seleccionarProductoLista(nextProduct);
  };

  const manejarCodigoEscaneado = (codigoLeido) => {
    const limpio = String(codigoLeido || "")
      .trim()
      .toLowerCase();
    const encontrado = productos.find(
      (p) => p.codigoBarras && p.codigoBarras.trim().toLowerCase() === limpio,
    );

    if (!encontrado) {
      notificar(
        "Código no registrado",
        `No se encontró ningún producto con el código "${codigoLeido}".\n\nPuedes asignarlo editando o creando el artículo en Inventario.`,
        "info",
      );
      return;
    }

    const aceptado = seleccionarProductoLista(encontrado);
    if (aceptado) {
      setBannerExito(`📷 Escaneado: ${encontrado.nombre}`);
      setTimeout(() => setBannerExito(""), 2500);
    }
  };

  const agregarOtroProductoAVenta = () => {
    if (!productoSeleccionado || cantidad <= 0) return;

    if (cantidad > stockDisponibleActual) {
      notificar(
        "Stock insuficiente",
        `Solo quedan ${stockDisponibleActual} unidades disponibles de "${productoSeleccionado.nombre}".`,
        "error",
      );
      return;
    }

    setItemsEnVenta((prev) => {
      const existe = prev.find((i) => i.productoId === productoSeleccionado.id);
      if (existe) {
        const nuevaCantidad = existe.cantidad + cantidad;
        return prev.map((i) =>
          i.productoId === productoSeleccionado.id
            ? {
                ...i,
                cantidad: nuevaCantidad,
                subtotal: nuevaCantidad * i.precioUnitario,
              }
            : i,
        );
      }
      return [
        ...prev,
        {
          productoId: productoSeleccionado.id,
          nombre: productoSeleccionado.nombre,
          cantidad,
          precioUnitario: productoSeleccionado.precio,
          subtotal: cantidad * productoSeleccionado.precio,
        },
      ];
    });

    setBannerExito(`✓ Agregado: ${cantidad}x ${productoSeleccionado.nombre}`);
    setTimeout(() => setBannerExito(""), 2200);

    setProductoSeleccionadoId(null);
    setCantidad(0);
  };

  const eliminarItemDeLista = (id) => {
    setItemsEnVenta((prev) => prev.filter((i) => i.productoId !== id));
  };

  const seleccionActualValida = Boolean(
    productoSeleccionado && cantidad > 0 && cantidad <= stockDisponibleActual,
  );

  const subtotalActual = seleccionActualValida
    ? cantidad * productoSeleccionado.precio
    : 0;

  const sumaAgregados = itemsEnVenta.reduce(
    (acc, item) => acc + item.subtotal,
    0,
  );

  const totalPagar = sumaAgregados + subtotalActual;

  const recibidoNum =
    metodoPago === "Efectivo" && montoRecibido !== ""
      ? parseInt(montoRecibido, 10)
      : null;

  const efectivoInsuficiente =
    metodoPago === "Efectivo" &&
    recibidoNum !== null &&
    totalPagar > 0 &&
    recibidoNum < totalPagar;

  const cambioCalculado =
    metodoPago === "Efectivo" &&
    recibidoNum !== null &&
    recibidoNum >= totalPagar
      ? recibidoNum - totalPagar
      : 0;

  const ventaValida =
    totalPagar > 0 &&
    (itemsEnVenta.length > 0 || seleccionActualValida) &&
    !efectivoInsuficiente;

  const confirmarVenta = async () => {
    if (bloqueoDobleToque.current || !ventaValida) return;
    bloqueoDobleToque.current = true;
    setCargando(true);

    const mapaItems = new Map();
    for (const item of itemsEnVenta) {
      mapaItems.set(item.productoId, { ...item });
    }

    if (seleccionActualValida) {
      const existente = mapaItems.get(productoSeleccionado.id);
      if (existente) {
        const nuevaCantidad = existente.cantidad + cantidad;
        mapaItems.set(productoSeleccionado.id, {
          ...existente,
          cantidad: nuevaCantidad,
          subtotal: nuevaCantidad * existente.precioUnitario,
        });
      } else {
        mapaItems.set(productoSeleccionado.id, {
          productoId: productoSeleccionado.id,
          nombre: productoSeleccionado.nombre,
          cantidad,
          precioUnitario: productoSeleccionado.precio,
          subtotal: subtotalActual,
        });
      }
    }

    const listaFinal = Array.from(mapaItems.values());

    const itemSinStock = listaFinal.find((item) => {
      const prodActual = productos.find((p) => p.id === item.productoId);
      return !prodActual || prodActual.stock < item.cantidad;
    });

    if (listaFinal.length === 0 || itemSinStock) {
      notificar(
        "No se puede registrar la venta",
        itemSinStock
          ? `"${itemSinStock.nombre}" no tiene stock suficiente para completar la venta.`
          : "Agrega al menos un producto disponible.",
        "error",
      );
      setCargando(false);
      bloqueoDobleToque.current = false;
      return;
    }

    const totalFinal = listaFinal.reduce((acc, i) => acc + i.subtotal, 0);
    const resumenTexto = listaFinal
      .map((i) => `${i.cantidad}x ${i.nombre}`)
      .join(", ");

    const ahora = new Date();
    const clienteFinal = nombreCliente.trim() || "Consumidor Final";
    const recibidoFinal =
      metodoPago === "Efectivo"
        ? recibidoNum !== null
          ? recibidoNum
          : totalFinal
        : totalFinal;
    const cambioFinal =
      metodoPago === "Efectivo" ? Math.max(0, recibidoFinal - totalFinal) : 0;

    setTimeout(() => {
      onRegistrarVenta({
        id: ahora.getTime().toString(),
        numeroFactura: proximoNumeroFactura,
        fechaISO: ahora.toISOString(),
        fecha: ahora.toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        hora: ahora.toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        cliente: clienteFinal,
        vendedor: nombreVendedor,
        metodoPago,
        montoRecibido: recibidoFinal,
        cambio: cambioFinal,
        descripcionProductos: resumenTexto,
        items: listaFinal,
        total: totalFinal,
      });

      cancelarFormulario();

      const detalleVueltas =
        metodoPago === "Efectivo" && cambioFinal > 0
          ? `\nCambio / Vueltas: $${cambioFinal.toLocaleString("es-CO")}`
          : "";

      notificar(
        `Venta ${proximoNumeroFactura} Registrada`,
        `Cliente: ${clienteFinal}\nAtendió: ${nombreVendedor}\nProductos: ${resumenTexto}\nTotal (${metodoPago}): $${totalFinal.toLocaleString("es-CO")}${detalleVueltas}`,
        "exito",
      );

      setCargando(false);
      bloqueoDobleToque.current = false;
    }, 550);
  };

  const renderControlesCantidad = (compacto = false) => {
    const sinProducto = !productoSeleccionado;
    const productoAgotado = productoSeleccionado && stockDisponibleActual === 0;
    const limiteAlcanzado =
      productoSeleccionado &&
      stockDisponibleActual > 0 &&
      cantidad >= stockDisponibleActual;

    return (
      <View style={(sinProducto || productoAgotado) && { opacity: 0.5 }}>
        <View style={styles.filaEncabezadoCantidad}>
          <Text
            style={[
              styles.etiquetaAzul,
              { color: tema.primario, marginBottom: 0 },
            ]}
          >
            CANTIDAD
          </Text>
          {compacto && productoSeleccionado && (
            <Text
              style={[styles.precioUnitarioInline, { color: tema.textoSuave }]}
            >
              ${productoSeleccionado.precio.toLocaleString("es-CO")} c/u
            </Text>
          )}
        </View>

        <View style={[styles.filaCantidad, { marginTop: compacto ? 8 : 10 }]}>
          <Pressable
            style={[
              compacto ? styles.botonCantidadCompacto : styles.botonMenos,
              {
                backgroundColor: tema.tarjetaSecundaria,
                borderColor: tema.borde,
              },
              (sinProducto || productoAgotado || cantidad <= 1) &&
                styles.botonDeshabilitadoLigeramente,
            ]}
            onPress={disminuir}
            disabled={sinProducto || productoAgotado || cantidad <= 1}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.simboloMenos, { color: tema.texto }]}>−</Text>
          </Pressable>

          <View style={{ alignItems: "center" }}>
            <Text
              style={[
                compacto
                  ? styles.numeroCantidadCompacto
                  : styles.numeroCantidad,
                { color: tema.texto },
              ]}
            >
              {cantidad}
            </Text>
            {!compacto && (
              <Text
                style={[styles.subtextoUnidades, { color: tema.textoSuave }]}
              >
                unidades
              </Text>
            )}
          </View>

          <Pressable
            style={[
              compacto ? styles.botonCantidadCompacto : styles.botonMas,
              { backgroundColor: tema.primario, borderColor: tema.primario },
              (sinProducto || productoAgotado || limiteAlcanzado) &&
                styles.botonDeshabilitadoMas,
            ]}
            onPress={incrementar}
            disabled={sinProducto || productoAgotado || limiteAlcanzado}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.simboloMas}>+</Text>
          </Pressable>

          {/* En móvil ponemos los chips rápidos en la misma fila para ahorrar altura */}
          {compacto && (
            <View style={styles.filaChipsInline}>
              {[1, 6, 12].map((num) => {
                const superaStock =
                  productoSeleccionado && num > stockDisponibleActual;
                const activo = cantidad === num && !productoAgotado;
                return (
                  <Pressable
                    key={num}
                    disabled={sinProducto || productoAgotado || superaStock}
                    onPress={() => setCantidad(num)}
                    style={[
                      styles.chipCantidadCompacto,
                      {
                        backgroundColor: activo
                          ? tema.primario
                          : tema.tarjetaSecundaria,
                        borderColor: activo ? tema.primario : tema.borde,
                      },
                      (sinProducto || productoAgotado || superaStock) && {
                        opacity: 0.4,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.textoChipCantidad,
                        { color: activo ? "#FFFFFF" : tema.textoSecundario },
                      ]}
                    >
                      x{num}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {productoSeleccionado && (productoAgotado || limiteAlcanzado) && (
          <Text
            style={[
              styles.textoStockInfo,
              { color: productoAgotado ? tema.peligro : tema.alerta },
            ]}
          >
            {productoAgotado
              ? "🔴 Sin unidades disponibles para agregar"
              : "⚠️ Límite máximo disponible alcanzado"}
          </Text>
        )}

        {!compacto && (
          <View style={styles.filaChipsRapidos}>
            {[1, 6, 12].map((num) => {
              const superaStock =
                productoSeleccionado && num > stockDisponibleActual;
              const activo = cantidad === num && !productoAgotado;
              return (
                <Pressable
                  key={num}
                  disabled={sinProducto || productoAgotado || superaStock}
                  onPress={() => setCantidad(num)}
                  style={[
                    styles.chipCantidad,
                    {
                      backgroundColor: activo
                        ? tema.primario
                        : tema.tarjetaSecundaria,
                      borderColor: activo ? tema.primario : tema.borde,
                    },
                    (sinProducto || productoAgotado || superaStock) && {
                      opacity: 0.4,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.textoChipCantidad,
                      { color: activo ? "#FFFFFF" : tema.textoSecundario },
                    ]}
                  >
                    x{num} {num === 12 ? "(Docena)" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const propsPago = {
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
  };

  const panelSensores = (
    <PanelSensores
      colapsable={!esTableta}
      tieneProducto={Boolean(productoSeleccionado)}
      tieneStockDisponible={stockDisponibleActual > 0}
      onIncrementar={incrementar}
      onDisminuir={disminuir}
      onSacudir={cancelarFormulario}
      onConfirmarCamara={simularDeteccionCamara}
    />
  );

  const selectorProducto = (
    <SelectorProducto
      compacto={!esTableta}
      productos={productos}
      productoSeleccionado={productoSeleccionado}
      stockDisponibleActual={stockDisponibleActual}
      obtenerDisponibleProducto={obtenerDisponibleProducto}
      onSeleccionarProducto={seleccionarProductoLista}
    />
  );

  // ========================================================
  // VISTA TELÉFONO — DISEÑO COMPACTO SIN SCROLL OBLIGATORIO
  // ========================================================
  if (!esTableta) {
    const resumenCliente = nombreCliente.trim() || "Consumidor Final";

    return (
      <View style={[styles.fondo, { backgroundColor: tema.fondo }]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.contenedorTelefono}
          keyboardShouldPersistTaps="handled"
        >
          {bannerExito !== "" && (
            <View
              style={[
                styles.bannerConfirmacion,
                {
                  backgroundColor: tema.exitoFondo,
                  borderColor: tema.exito,
                },
              ]}
            >
              <Text
                style={[styles.textoBannerConfirmacion, { color: tema.exito }]}
              >
                {bannerExito}
              </Text>
            </View>
          )}

          {/* 1. Sensores colapsables en 1 línea */}
          {panelSensores}

          {/* 2. Tarjeta unificada: Producto + Cantidad */}
          <View
            style={[
              styles.tarjetaMovilUnificada,
              {
                backgroundColor: tema.tarjeta,
                borderColor: tema.bordeSuave,
              },
            ]}
          >
            {selectorProducto}
            <View
              style={[
                styles.divisorCompacto,
                { backgroundColor: tema.bordeSuave },
              ]}
            />
            {renderControlesCantidad(true)}
          </View>

          {/* 3. Barra compacta de Pago, Cliente y Vueltas (1 toque abre el modal) */}
          <Pressable
            style={[
              styles.barraResumenPagoMovil,
              {
                backgroundColor: tema.tarjeta,
                borderColor: efectivoInsuficiente
                  ? tema.peligro
                  : tema.bordeSuave,
              },
            ]}
            onPress={() => setModalPagoMovil(true)}
          >
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text
                style={[styles.tituloPagoMovil, { color: tema.texto }]}
                numberOfLines={1}
              >
                {ICONO_PAGO[metodoPago] || "💵"} {metodoPago} • 👤{" "}
                {resumenCliente}
              </Text>
              <Text
                style={[
                  styles.subtituloPagoMovil,
                  {
                    color: efectivoInsuficiente
                      ? tema.peligro
                      : cambioCalculado > 0
                        ? tema.exito
                        : tema.textoSuave,
                  },
                ]}
              >
                {efectivoInsuficiente
                  ? `⚠️ Efectivo insuficiente (faltan $${(totalPagar - recibidoNum).toLocaleString("es-CO")})`
                  : cambioCalculado > 0
                    ? `💰 Cambio / Vueltas: $${cambioCalculado.toLocaleString("es-CO")}`
                    : `${proximoNumeroFactura} • Toca para cliente, pago o vueltas`}
              </Text>
            </View>
            <Text style={[styles.enlaceEditarPago, { color: tema.primario }]}>
              Editar ✎
            </Text>
          </Pressable>

          {/* 4. Artículos ya agregados a la factura (solo aparece cuando hay multi-producto) */}
          {itemsEnVenta.length > 0 && (
            <View
              style={[
                styles.tarjetaItemsMovil,
                {
                  backgroundColor: tema.tarjeta,
                  borderColor: tema.bordeSuave,
                },
              ]}
            >
              <Text style={[styles.etiquetaAzul, { color: tema.primario }]}>
                EN LA FACTURA ({itemsEnVenta.length})
              </Text>
              {itemsEnVenta.map((item) => (
                <View
                  key={item.productoId}
                  style={[
                    styles.filaItemMovil,
                    { borderTopColor: tema.bordeSuave },
                  ]}
                >
                  <Text
                    style={[styles.textoItemMovil, { color: tema.texto }]}
                    numberOfLines={1}
                  >
                    {item.cantidad}× {item.nombre}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Text
                      style={[styles.subtotalItemMovil, { color: tema.texto }]}
                    >
                      ${item.subtotal.toLocaleString("es-CO")}
                    </Text>
                    <Pressable
                      onPress={() => eliminarItemDeLista(item.productoId)}
                      hitSlop={12}
                    >
                      <Text style={{ color: tema.peligro, fontWeight: "bold" }}>
                        ✕
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* 5. BARRA INFERIOR FIJA DE COBRO (SIEMPRE VISIBLE SIN SCROLL) */}
        <View
          style={[
            styles.dockInferiorMovil,
            {
              backgroundColor: tema.tarjeta,
              borderTopColor: tema.bordeSuave,
            },
          ]}
        >
          <View style={styles.filaTotalDock}>
            <View>
              <Text style={[styles.labelTotalDock, { color: tema.textoSuave }]}>
                TOTAL A PAGAR
              </Text>
              <Text style={[styles.montoTotalDock, { color: tema.primario }]}>
                ${totalPagar.toLocaleString("es-CO")}
              </Text>
            </View>

            {(totalPagar > 0 || itemsEnVenta.length > 0) && (
              <Pressable
                style={[
                  styles.btnLimpiarDock,
                  {
                    backgroundColor: tema.peligroFondo,
                    borderColor: tema.peligroBorde,
                  },
                ]}
                onPress={cancelarFormulario}
              >
                <Text style={[styles.txtLimpiarDock, { color: tema.peligro }]}>
                  🗑️ Limpiar
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.filaBotonesDock}>
            <Pressable
              style={[
                styles.btnAgregarDock,
                {
                  backgroundColor: tema.primarioSuave,
                  borderColor: tema.primarioBorde,
                },
                !seleccionActualValida && { opacity: 0.4 },
              ]}
              onPress={agregarOtroProductoAVenta}
              disabled={!seleccionActualValida}
            >
              <Text style={[styles.txtAgregarDock, { color: tema.primario }]}>
                + Agregar
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.btnCobrarDock,
                { backgroundColor: tema.primario },
                (!ventaValida || cargando) && styles.botonDeshabilitado,
              ]}
              onPress={confirmarVenta}
              disabled={!ventaValida || cargando}
            >
              {cargando ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.txtCobrarDock}>Procesando...</Text>
                </View>
              ) : (
                <Text style={styles.txtCobrarDock}>
                  {efectivoInsuficiente
                    ? "Efectivo insuficiente"
                    : "✓ Registrar Venta"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Modal rápido de Cliente, Método de Pago y Vueltas */}
        <Modal
          visible={modalPagoMovil}
          transparent
          animationType="slide"
          onRequestClose={() => setModalPagoMovil(false)}
        >
          <KeyboardAvoidingView
            style={styles.fondoModalPago}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View
              style={[
                styles.tarjetaModalPago,
                {
                  backgroundColor: tema.tarjeta,
                  borderColor: tema.bordeSuave,
                },
              ]}
            >
              <View
                style={[
                  styles.encabezadoModalPago,
                  { borderBottomColor: tema.bordeSuave },
                ]}
              >
                <Text style={[styles.tituloModalPago, { color: tema.texto }]}>
                  💳 Datos de Pago y Cliente
                </Text>
                <Pressable
                  style={[
                    styles.botonCerrarX,
                    { backgroundColor: tema.tarjetaSecundaria },
                  ]}
                  onPress={() => setModalPagoMovil(false)}
                >
                  <Text
                    style={{ color: tema.textoSecundario, fontWeight: "bold" }}
                  >
                    ✕
                  </Text>
                </Pressable>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled">
                <DatosFacturaYPago {...propsPago} />
              </ScrollView>

              <Pressable
                style={[
                  styles.btnListoModal,
                  { backgroundColor: tema.primario },
                ]}
                onPress={() => setModalPagoMovil(false)}
              >
                <Text
                  style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 15 }}
                >
                  Listo, volver a la venta
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  // ========================================================
  // VISTA TABLETA / WEB — DOS COLUMNAS CON MODO OSCURO
  // ========================================================
  return (
    <ScrollView
      style={[styles.fondo, { backgroundColor: tema.fondo }]}
      contentContainerStyle={styles.contenedorTableta}
      keyboardShouldPersistTaps="handled"
    >
      {bannerExito !== "" && (
        <View
          style={[
            styles.bannerConfirmacion,
            { backgroundColor: tema.exitoFondo, borderColor: tema.exito },
          ]}
        >
          <Text style={[styles.textoBannerConfirmacion, { color: tema.exito }]}>
            {bannerExito}
          </Text>
        </View>
      )}

      <View style={styles.subencabezadoTableta}>
        <View style={styles.filaTituloTableta}>
          <View
            style={[
              styles.iconoCarritoCirculo,
              { backgroundColor: tema.primarioSuave },
            ]}
          >
            <Text style={{ fontSize: 18 }}>🛒</Text>
          </View>
          <View>
            <Text style={[styles.tituloSeccionTableta, { color: tema.texto }]}>
              Registrar Venta
            </Text>
            <Text
              style={[
                styles.subtituloSeccionTableta,
                { color: tema.textoSuave },
              ]}
            >
              Agrega uno o varios artículos a la factura antes de cobrar
            </Text>
          </View>
        </View>
      </View>

      {panelSensores}

      <View style={styles.dosColumnasTableta}>
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
              <Text>📦</Text>
            </View>
            <Text style={[styles.tituloTarjetaInterna, { color: tema.texto }]}>
              Datos del Producto
            </Text>
          </View>

          {selectorProducto}
          <View style={{ marginTop: 18 }}>
            {renderControlesCantidad(false)}
          </View>

          {productoSeleccionado && (
            <View
              style={[
                styles.cajaPrecioGris,
                { backgroundColor: tema.tarjetaSecundaria },
              ]}
            >
              <Text style={[styles.textoGris, { color: tema.textoSuave }]}>
                Precio unitario
              </Text>
              <Text style={[styles.valorPrecioGris, { color: tema.texto }]}>
                ${productoSeleccionado.precio.toLocaleString("es-CO")}
              </Text>
            </View>
          )}

          <Pressable
            style={[
              styles.botonBordePunteado,
              {
                borderColor: tema.primarioBorde,
                backgroundColor: tema.primarioSuave,
              },
              !seleccionActualValida && { opacity: 0.45 },
            ]}
            onPress={agregarOtroProductoAVenta}
            disabled={!seleccionActualValida}
          >
            <Text style={[styles.textoBotonPunteado, { color: tema.primario }]}>
              + Agregar producto a la factura
            </Text>
          </Pressable>
        </View>

        <ResumenVenta
          {...propsPago}
          itemsEnVenta={itemsEnVenta}
          seleccionActualValida={seleccionActualValida}
          productoSeleccionado={productoSeleccionado}
          cantidad={cantidad}
          subtotalActual={subtotalActual}
          onEliminarItem={eliminarItemDeLista}
        />
      </View>

      <View style={styles.filaBotonesTableta}>
        <Pressable
          style={[
            styles.botonCancelarTableta,
            { backgroundColor: tema.tarjeta, borderColor: tema.borde },
          ]}
          onPress={cancelarFormulario}
        >
          <Text
            style={[styles.textoBotonCancelar, { color: tema.textoSecundario }]}
          >
            Limpiar Factura
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.botonRegistrarTableta,
            { backgroundColor: tema.primario },
            (!ventaValida || cargando) && styles.botonDeshabilitado,
          ]}
          onPress={confirmarVenta}
          disabled={!ventaValida || cargando}
        >
          {cargando ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.textoBotonRegistrar}>Procesando pago...</Text>
            </View>
          ) : (
            <Text style={styles.textoBotonRegistrar}>
              {efectivoInsuficiente
                ? "Efectivo insuficiente"
                : ventaValida
                  ? "✓ Registrar Venta"
                  : "Selecciona un producto disponible"}
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  contenedorTelefono: { padding: 12, paddingBottom: 16 },
  contenedorTableta: { padding: 24, paddingBottom: 40 },

  // Vista móvil compacta
  tarjetaMovilUnificada: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  divisorCompacto: { height: 1, marginVertical: 10 },
  filaEncabezadoCantidad: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  precioUnitarioInline: { fontSize: 12, fontWeight: "700" },
  botonCantidadCompacto: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  numeroCantidadCompacto: {
    fontSize: 24,
    fontWeight: "bold",
    minWidth: 32,
    textAlign: "center",
  },
  filaChipsInline: {
    flexDirection: "row",
    gap: 6,
    marginLeft: "auto",
  },
  chipCantidadCompacto: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  barraResumenPagoMovil: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  tituloPagoMovil: { fontSize: 13, fontWeight: "bold" },
  subtituloPagoMovil: { fontSize: 11, marginTop: 2, fontWeight: "600" },
  enlaceEditarPago: { fontSize: 12, fontWeight: "bold" },
  tarjetaItemsMovil: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  filaItemMovil: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderTopWidth: 1,
  },
  textoItemMovil: { flex: 1, fontSize: 13, fontWeight: "600", marginRight: 8 },
  subtotalItemMovil: { fontSize: 13, fontWeight: "bold" },

  // Barra fija inferior móvil (cobro sin scroll)
  dockInferiorMovil: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  filaTotalDock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  labelTotalDock: { fontSize: 10, fontWeight: "bold", letterSpacing: 0.6 },
  montoTotalDock: { fontSize: 22, fontWeight: "bold" },
  btnLimpiarDock: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  txtLimpiarDock: { fontSize: 12, fontWeight: "bold" },
  filaBotonesDock: { flexDirection: "row", gap: 10 },
  btnAgregarDock: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  txtAgregarDock: { fontSize: 14, fontWeight: "bold" },
  btnCobrarDock: {
    flex: 1.7,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  txtCobrarDock: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },

  // Modal pago móvil
  fondoModalPago: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  tarjetaModalPago: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    borderWidth: 1,
    maxHeight: "85%",
  },
  encabezadoModalPago: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 14,
    borderBottomWidth: 1,
  },
  tituloModalPago: { fontSize: 16, fontWeight: "bold" },
  botonCerrarX: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnListoModal: {
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },

  // Compartidos y Tableta
  etiquetaAzul: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  filaCantidad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  botonMenos: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  botonDeshabilitadoLigeramente: { opacity: 0.3 },
  simboloMenos: { fontSize: 22, fontWeight: "bold" },
  botonMas: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  botonDeshabilitadoMas: {
    backgroundColor: "#94A3B8",
    borderColor: "#94A3B8",
    opacity: 0.5,
  },
  simboloMas: { fontSize: 22, color: "#FFFFFF", fontWeight: "bold" },
  numeroCantidad: { fontSize: 32, fontWeight: "bold" },
  subtextoUnidades: { fontSize: 13 },
  textoStockInfo: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  filaChipsRapidos: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  chipCantidad: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  textoChipCantidad: { fontSize: 12, fontWeight: "bold" },
  botonBordePunteado: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
  textoBotonPunteado: { fontWeight: "600", fontSize: 15 },
  textoBotonRegistrar: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  botonDeshabilitado: {
    backgroundColor: "#94A3B8",
    elevation: 0,
    opacity: 0.5,
  },
  subencabezadoTableta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  filaTituloTableta: { flexDirection: "row", alignItems: "center" },
  iconoCarritoCirculo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tituloSeccionTableta: { fontSize: 22, fontWeight: "bold" },
  subtituloSeccionTableta: { fontSize: 13 },
  dosColumnasTableta: { flexDirection: "row", gap: 20, marginBottom: 20 },
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
  cajaPrecioGris: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginTop: 14,
  },
  textoGris: { fontSize: 14 },
  valorPrecioGris: { fontSize: 18, fontWeight: "bold" },
  filaBotonesTableta: { flexDirection: "row", gap: 16 },
  botonCancelarTableta: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  botonRegistrarTableta: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  textoBotonCancelar: { fontSize: 15, fontWeight: "bold" },
  bannerConfirmacion: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  textoBannerConfirmacion: { fontWeight: "bold", fontSize: 12 },
});
