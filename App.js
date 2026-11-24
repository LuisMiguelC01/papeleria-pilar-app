// App.js
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Text,
  Platform,
  StatusBar,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { TemaProvider, useTema } from "./src/context/TemaContext";
import { PRODUCTOS_INICIALES } from "./src/data/catalogoPapeleria";
import { USUARIOS_INICIALES } from "./src/data/usuariosIniciales";
import { obtenerPermisos } from "./src/utils/permisos";
import {
  EncabezadoSuperior,
  BarraInferiorTelefono,
} from "./src/components/NavegacionAdaptativa";
import { ModalGuiaSensores } from "./src/components/ModalGuiaSensores";
import { ModalMensaje } from "./src/components/ModalMensaje";
import { PantallaLogin } from "./src/screens/PantallaLogin";
import { PantallaUsuarios } from "./src/screens/PantallaUsuarios";
import { PantallaVentas } from "./src/screens/PantallaVentas";
import { PantallaInventario } from "./src/screens/PantallaInventario";
import {
  PantallaInicio,
  PantallaReportes,
} from "./src/screens/PantallasGestion";
import AsistenteIA from "./src/components/AsistenteIA";
import { perteneceAPeriodo } from "./src/utils/fechaHelpers";
import { FIREBASE_CONFIGURADO } from "./src/services/firebaseConfig";
import {
  inicializarColeccionesSiVacias,
  suscribirProductos,
  suscribirVentas,
  suscribirUsuarios,
  guardarProductoNube,
  eliminarProductoNube,
  registrarVentaYDescontarStockNube,
  guardarUsuarioNube,
  eliminarUsuarioNube,
} from "./src/services/firestoreService";
import { cerrarSesionGoogle } from "./src/services/authGoogleService";

// Mapa de respaldo para conservar las imágenes locales (require) cuando vienen de Firestore
const IMAGENES_LOCALES_POR_ID = PRODUCTOS_INICIALES.reduce((acc, item) => {
  if (item.imagenUri) acc[String(item.id)] = item.imagenUri;
  return acc;
}, {});

const normalizarProductos = (lista) => {
  if (!Array.isArray(lista)) return PRODUCTOS_INICIALES;
  return lista
    .filter((p) => p && typeof p === "object")
    .map((p, idx) => {
      const id = String(p.id ?? `prod-${idx}-${Date.now()}`);
      let imagenResuelta = "";

      if (typeof p.imagenUri === "number") {
        imagenResuelta = p.imagenUri;
      } else if (typeof p.imagenUri === "string" && p.imagenUri.trim() !== "") {
        imagenResuelta = p.imagenUri.trim();
      } else if (IMAGENES_LOCALES_POR_ID[id]) {
        imagenResuelta = IMAGENES_LOCALES_POR_ID[id];
      }

      return {
        id,
        nombre: String(p.nombre || "Producto sin nombre"),
        descripcion: String(p.descripcion || ""),
        precio: Number.isFinite(Number(p.precio)) ? Number(p.precio) : 0,
        stock: Number.isFinite(Number(p.stock))
          ? Math.max(0, Number(p.stock))
          : 0,
        imagenUri: imagenResuelta,
        codigoBarras: p.codigoBarras ? String(p.codigoBarras).trim() : "",
      };
    });
};

const normalizarVentas = (lista) => {
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((v) => v && typeof v === "object")
    .map((v, idx) => ({
      ...v,
      id: String(v.id ?? `venta-${idx}-${Date.now()}`),
      total: Number.isFinite(Number(v.total)) ? Number(v.total) : 0,
      descripcionProductos: String(
        v.descripcionProductos || "Venta registrada",
      ),
      items: Array.isArray(v.items) ? v.items : [],
    }));
};

function AppPrincipal() {
  const { tema, esOscuro } = useTema();

  const [pestanaActiva, setPestanaActiva] = useState("ventas");
  const [appLista, setAppLista] = useState(false);
  const [estadoNube, setEstadoNube] = useState(
    FIREBASE_CONFIGURADO ? "conectando" : "local",
  );
  const [detalleErrorNube, setDetalleErrorNube] = useState("");

  const [guiaVisible, setGuiaVisible] = useState(false);
  const [mostrarIA, setMostrarIA] = useState(false);
  const [dialogo, setDialogo] = useState(null);

  const [usuarios, setUsuarios] = useState(USUARIOS_INICIALES);
  const [sesionUsuarioId, setSesionUsuarioId] = useState(null);
  const [productos, setProductos] = useState(PRODUCTOS_INICIALES);
  const [historialVentas, setHistorialVentas] = useState([]);

  const { width } = useWindowDimensions();
  const esTableta = width >= 700;

  const margenSuperior =
    Platform.OS === "android"
      ? Math.max(StatusBar.currentHeight || 0, 34)
      : Platform.OS === "ios"
        ? 44
        : 0;

  // 1. Carga rápida desde caché local + conexión en tiempo real con Firestore
  useEffect(() => {
    let cancelado = false;
    let unsubProductos = () => {};
    let unsubVentas = () => {};
    let unsubUsuarios = () => {};

    const iniciarApp = async () => {
      try {
        const [
          productosGuardados,
          ventasGuardadas,
          usuariosGuardados,
          sesionGuardada,
        ] = await Promise.all([
          AsyncStorage.getItem("@papeleria_productos"),
          AsyncStorage.getItem("@papeleria_ventas"),
          AsyncStorage.getItem("@papeleria_usuarios"),
          AsyncStorage.getItem("@papeleria_sesion_id"),
        ]);

        if (!cancelado) {
          if (productosGuardados) {
            const guardados = normalizarProductos(
              JSON.parse(productosGuardados),
            );
            const idsLocales = new Set(guardados.map((p) => p.id));
            const nuevosFaltantes = normalizarProductos(
              PRODUCTOS_INICIALES.filter((p) => !idsLocales.has(String(p.id))),
            );
            const combinados = [...guardados, ...nuevosFaltantes];
            setProductos(combinados);
            if (nuevosFaltantes.length > 0) {
              AsyncStorage.setItem(
                "@papeleria_productos",
                JSON.stringify(combinados),
              ).catch(() => {});
            }
          }
          if (ventasGuardadas) {
            setHistorialVentas(normalizarVentas(JSON.parse(ventasGuardadas)));
          }
          let listaUsuarios = USUARIOS_INICIALES;
          if (usuariosGuardados) {
            const parsed = JSON.parse(usuariosGuardados);
            if (Array.isArray(parsed) && parsed.length > 0) {
              listaUsuarios = parsed;
              setUsuarios(parsed);
            }
          }
          if (sesionGuardada) {
            const valido = listaUsuarios.find(
              (u) => u.id === sesionGuardada && u.activo,
            );
            if (valido) setSesionUsuarioId(valido.id);
          }
        }
      } catch (error) {
        console.error("Error al cargar caché local:", error);
      } finally {
        if (!cancelado) setAppLista(true);
      }

      // Conectar con Cloud Firestore en tiempo real
      if (!FIREBASE_CONFIGURADO) return;

      try {
        await inicializarColeccionesSiVacias(
          PRODUCTOS_INICIALES,
          USUARIOS_INICIALES,
        );
        if (cancelado) return;

        unsubProductos = suscribirProductos(
          (listaNube) => {
            if (listaNube.length === 0) return;
            const normalizados = normalizarProductos(listaNube);
            setProductos(normalizados);
            setEstadoNube("conectado");
            AsyncStorage.setItem(
              "@papeleria_productos",
              JSON.stringify(normalizados),
            ).catch(() => {});
          },
          (err) => {
            setEstadoNube("error");
            setDetalleErrorNube(err?.code || err?.message || "");
          },
        );

        unsubVentas = suscribirVentas(
          (listaNube) => {
            const normalizadas = normalizarVentas(listaNube);
            setHistorialVentas(normalizadas);
            setEstadoNube("conectado");
            AsyncStorage.setItem(
              "@papeleria_ventas",
              JSON.stringify(normalizadas),
            ).catch(() => {});
          },
          (err) => {
            setEstadoNube("error");
            setDetalleErrorNube(err?.code || err?.message || "");
          },
        );

        unsubUsuarios = suscribirUsuarios(
          (listaNube) => {
            if (listaNube.length === 0) return;
            setUsuarios(listaNube);
            setEstadoNube("conectado");
            AsyncStorage.setItem(
              "@papeleria_usuarios",
              JSON.stringify(listaNube),
            ).catch(() => {});
          },
          (err) => {
            setEstadoNube("error");
            setDetalleErrorNube(err?.code || err?.message || "");
          },
        );
      } catch (error) {
        console.error("[Firestore] Error al conectar:", error);
        if (!cancelado) {
          setEstadoNube("error");
          setDetalleErrorNube(
            error?.code || error?.message || "Error desconocido",
          );
        }
      }
    };

    iniciarApp();

    return () => {
      cancelado = true;
      unsubProductos();
      unsubVentas();
      unsubUsuarios();
    };
  }, []);

  const usuarioActual = useMemo(
    () => usuarios.find((u) => u.id === sesionUsuarioId && u.activo) || null,
    [usuarios, sesionUsuarioId],
  );

  const permisos = useMemo(
    () => obtenerPermisos(usuarioActual?.rol),
    [usuarioActual?.rol],
  );

  useEffect(() => {
    if (pestanaActiva === "usuarios" && !permisos.gestionarUsuarios) {
      setPestanaActiva("ventas");
    }
  }, [pestanaActiva, permisos.gestionarUsuarios]);

  const persistirUsuariosLocal = async (nuevaLista) => {
    setUsuarios(nuevaLista);
    try {
      await AsyncStorage.setItem(
        "@papeleria_usuarios",
        JSON.stringify(nuevaLista),
      );
    } catch (error) {
      console.error("Error al guardar usuarios en caché:", error);
    }
  };

  const iniciarSesion = (usuarioInput, passwordInput) => {
    const userLimpio = usuarioInput.trim().toLowerCase();
    const passLimpia = passwordInput.trim();

    if (!userLimpio || !passLimpia) {
      return { ok: false, error: "Ingresa tu usuario y contraseña." };
    }

    const cuentaPorUsuario = usuarios.find(
      (u) => u.usuario.toLowerCase() === userLimpio,
    );

    if (cuentaPorUsuario && cuentaPorUsuario.proveedor === "google") {
      return {
        ok: false,
        error: "Esta cuenta ingresa usando el botón de Google.",
      };
    }

    const encontrado = usuarios.find(
      (u) =>
        u.usuario.toLowerCase() === userLimpio && u.password === passLimpia,
    );

    if (!encontrado) {
      return { ok: false, error: "Usuario o contraseña incorrectos." };
    }

    if (!encontrado.activo) {
      return {
        ok: false,
        error: "Esta cuenta está desactivada. Contacta al administrador.",
      };
    }

    setSesionUsuarioId(encontrado.id);
    setPestanaActiva("ventas");
    AsyncStorage.setItem("@papeleria_sesion_id", encontrado.id).catch(() => {});
    return { ok: true };
  };

  const iniciarSesionGoogleExitoso = (cuentaVendedor) => {
    setUsuarios((prev) => {
      const existe = prev.some((u) => u.id === cuentaVendedor.id);
      const nuevaLista = existe
        ? prev.map((u) => (u.id === cuentaVendedor.id ? cuentaVendedor : u))
        : [...prev, cuentaVendedor];

      AsyncStorage.setItem(
        "@papeleria_usuarios",
        JSON.stringify(nuevaLista),
      ).catch(() => {});

      return nuevaLista;
    });

    setSesionUsuarioId(cuentaVendedor.id);
    setPestanaActiva("ventas");
    AsyncStorage.setItem("@papeleria_sesion_id", cuentaVendedor.id).catch(
      () => {},
    );
  };

  const cerrarSesion = () => {
    setDialogo({
      titulo: "Cerrar sesión",
      mensaje: `¿Deseas salir de la cuenta de ${usuarioActual?.nombre}?`,
      tipo: "confirmar",
      textoConfirmar: "Cerrar sesión",
      onConfirmar: async () => {
        setSesionUsuarioId(null);
        setGuiaVisible(false);
        setMostrarIA(false);
        await cerrarSesionGoogle();
        try {
          await AsyncStorage.removeItem("@papeleria_sesion_id");
        } catch {}
      },
    });
  };

  // CRUD Usuarios (local + Firestore)
  const crearUsuario = async (nuevo) => {
    if (!permisos.gestionarUsuarios) return;
    await persistirUsuariosLocal([...usuarios, nuevo]);
    try {
      await guardarUsuarioNube(nuevo);
    } catch (e) {
      console.error("[Firestore] Error creando usuario:", e);
    }
  };

  const editarUsuario = async (actualizado) => {
    if (!permisos.gestionarUsuarios) return;
    await persistirUsuariosLocal(
      usuarios.map((u) => (u.id === actualizado.id ? actualizado : u)),
    );
    try {
      await guardarUsuarioNube(actualizado);
    } catch (e) {
      console.error("[Firestore] Error editando usuario:", e);
    }
  };

  const toggleActivoUsuario = async (id) => {
    if (!permisos.gestionarUsuarios || id === usuarioActual?.id) return;
    const objetivo = usuarios.find((u) => u.id === id);
    if (!objetivo) return;
    const actualizado = { ...objetivo, activo: !objetivo.activo };
    await persistirUsuariosLocal(
      usuarios.map((u) => (u.id === id ? actualizado : u)),
    );
    try {
      await guardarUsuarioNube(actualizado);
    } catch (e) {
      console.error("[Firestore] Error cambiando estado de usuario:", e);
    }
  };

  const eliminarUsuario = async (id) => {
    if (!permisos.gestionarUsuarios || id === usuarioActual?.id) return;
    await persistirUsuariosLocal(usuarios.filter((u) => u.id !== id));
    try {
      await eliminarUsuarioNube(id);
    } catch (e) {
      console.error("[Firestore] Error eliminando usuario:", e);
    }
  };

  // CRUD Productos (local + Firestore)
  const persistirProductosLocal = async (nuevoCatalogo) => {
    const catalogoSeguro = normalizarProductos(nuevoCatalogo);
    setProductos(catalogoSeguro);
    try {
      await AsyncStorage.setItem(
        "@papeleria_productos",
        JSON.stringify(catalogoSeguro),
      );
    } catch (error) {
      console.error("Error al guardar el catálogo en caché:", error);
    }
  };

  const agregarProductoAlCatalogo = async (nuevoProducto) => {
    if (!permisos.gestionarInventario) return;
    await persistirProductosLocal([nuevoProducto, ...productos]);
    try {
      await guardarProductoNube(nuevoProducto);
    } catch (e) {
      console.error("[Firestore] Error guardando producto:", e);
    }
  };

  const editarProductoEnCatalogo = async (productoActualizado) => {
    if (!permisos.gestionarInventario) return;
    const nuevoCatalogo = productos.map((prod) =>
      prod.id === productoActualizado.id ? productoActualizado : prod,
    );
    await persistirProductosLocal(nuevoCatalogo);
    try {
      await guardarProductoNube(productoActualizado);
    } catch (e) {
      console.error("[Firestore] Error actualizando producto:", e);
    }
  };

  const eliminarProductoDelCatalogo = async (productoId) => {
    if (!permisos.gestionarInventario) return;
    const nuevoCatalogo = productos.filter((prod) => prod.id !== productoId);
    await persistirProductosLocal(nuevoCatalogo);
    try {
      await eliminarProductoNube(productoId);
    } catch (e) {
      console.error("[Firestore] Error eliminando producto:", e);
    }
  };

  const proximoNumeroFactura = useMemo(() => {
    const maximo = historialVentas.reduce((max, venta) => {
      const match = String(venta.numeroFactura || "").match(/(\d+)$/);
      const num = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, num);
    }, historialVentas.length);

    return `FAC-${String(maximo + 1).padStart(4, "0")}`;
  }, [historialVentas]);

  const registrarNuevaVenta = async (nuevaVenta) => {
    const ventaCompleta = {
      ...nuevaVenta,
      numeroFactura: nuevaVenta.numeroFactura || proximoNumeroFactura,
      vendedorId: usuarioActual?.id || "anon",
      vendedor: usuarioActual?.nombre || "Administrador",
    };

    const nuevoHistorial = [ventaCompleta, ...historialVentas];
    setHistorialVentas(nuevoHistorial);

    const cantidadesVendidas = ventaCompleta.items.reduce((acc, item) => {
      acc[item.productoId] = (acc[item.productoId] || 0) + item.cantidad;
      return acc;
    }, {});

    const nuevoCatalogo = productos.map((prod) => {
      const descontar = cantidadesVendidas[prod.id];
      if (descontar) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - descontar),
        };
      }
      return prod;
    });

    setProductos(nuevoCatalogo);

    try {
      await Promise.all([
        AsyncStorage.setItem(
          "@papeleria_ventas",
          JSON.stringify(nuevoHistorial),
        ),
        AsyncStorage.setItem(
          "@papeleria_productos",
          JSON.stringify(nuevoCatalogo),
        ),
      ]);
    } catch (error) {
      console.error("Error al guardar venta en caché local:", error);
    }

    try {
      await registrarVentaYDescontarStockNube(ventaCompleta, nuevoCatalogo);
    } catch (error) {
      console.error("[Firestore] Error sincronizando venta:", error);
      setEstadoNube("error");
    }
  };

  const ventasVisibles = useMemo(() => {
    if (!usuarioActual) return [];
    if (permisos.verTodosLosReportes) return historialVentas;
    return historialVentas.filter(
      (v) =>
        v.vendedorId === usuarioActual.id ||
        v.vendedor === usuarioActual.nombre,
    );
  }, [historialVentas, usuarioActual, permisos.verTodosLosReportes]);

  const ventasDeHoy = useMemo(
    () => ventasVisibles.filter((v) => perteneceAPeriodo(v, "hoy")),
    [ventasVisibles],
  );

  const totalVentasHoy = useMemo(
    () => ventasDeHoy.reduce((acc, item) => acc + item.total, 0),
    [ventasDeHoy],
  );

  if (!appLista) {
    return (
      <View
        style={[
          styles.areaSegura,
          {
            backgroundColor: tema.primario,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (!usuarioActual) {
    return (
      <PantallaLogin
        onIniciarSesion={iniciarSesion}
        onLoginGoogle={iniciarSesionGoogleExitoso}
      />
    );
  }

  const fondoSuperior = esTableta ? tema.barraFondo : tema.headerMovilFondo;

  return (
    <View
      style={[
        styles.areaSegura,
        {
          backgroundColor: fondoSuperior,
          paddingTop: margenSuperior,
        },
      ]}
    >
      <StatusBar
        barStyle={esTableta && !esOscuro ? "dark-content" : "light-content"}
        backgroundColor={fondoSuperior}
      />

      <View style={[styles.contenedorApp, { backgroundColor: tema.fondo }]}>
        <EncabezadoSuperior
          pestanaActiva={pestanaActiva}
          setPestanaActiva={setPestanaActiva}
          esTableta={esTableta}
          usuarioActual={usuarioActual}
          puedeGestionarUsuarios={permisos.gestionarUsuarios}
          onAbrirGuia={() => setGuiaVisible(true)}
          onAbrirIA={() => setMostrarIA(true)}
          onCerrarSesion={cerrarSesion}
        />

        {/* Aviso discreto solo si Firebase falla al sincronizar */}
        {estadoNube !== "conectado" && (
          <View
            style={[
              styles.bannerOffline,
              {
                backgroundColor:
                  estadoNube === "conectando"
                    ? tema.primarioSuave
                    : tema.alertaFondo,
                borderBottomColor:
                  estadoNube === "conectando" ? tema.primario : tema.alerta,
              },
            ]}
          >
            <Text
              style={[
                styles.textoOffline,
                {
                  color:
                    estadoNube === "conectando" ? tema.primario : tema.alerta,
                },
              ]}
            >
              {estadoNube === "local"
                ? "⚠️ Firebase sin configurar: no se detectó el archivo .env (reinicia con npx expo start -c)"
                : estadoNube === "conectando"
                  ? "☁️ Conectando con Firebase Firestore..."
                  : `⚠️ Error Firebase (${detalleErrorNube || "sin conexión"}) — trabajando en modo local`}
            </Text>
          </View>
        )}

        <View style={styles.cuerpo}>
          {pestanaActiva === "inicio" && (
            <PantallaInicio
              nombreVendedor={usuarioActual.nombre}
              totalVentasHoy={totalVentasHoy}
              facturasHoy={ventasDeHoy.length}
              productos={productos}
              irAVentas={() => setPestanaActiva("ventas")}
              irAInventario={() => setPestanaActiva("inventario")}
            />
          )}
          {pestanaActiva === "inventario" && (
            <PantallaInventario
              anchoPantalla={width}
              productos={productos}
              puedeGestionar={permisos.gestionarInventario}
              onAgregarProductoInventario={agregarProductoAlCatalogo}
              onEditarProductoInventario={editarProductoEnCatalogo}
              onEliminarProductoInventario={eliminarProductoDelCatalogo}
              onMostrarDialogo={setDialogo}
            />
          )}
          {pestanaActiva === "ventas" && (
            <PantallaVentas
              esTableta={esTableta}
              productos={productos}
              nombreVendedor={usuarioActual.nombre}
              proximoNumeroFactura={proximoNumeroFactura}
              onRegistrarVenta={registrarNuevaVenta}
              onMostrarDialogo={setDialogo}
            />
          )}
          {pestanaActiva === "reportes" && (
            <PantallaReportes historialVentas={ventasVisibles} />
          )}
          {pestanaActiva === "usuarios" && permisos.gestionarUsuarios && (
            <PantallaUsuarios
              usuarios={usuarios}
              usuarioActual={usuarioActual}
              onCrearUsuario={crearUsuario}
              onEditarUsuario={editarUsuario}
              onToggleActivoUsuario={toggleActivoUsuario}
              onEliminarUsuario={eliminarUsuario}
              onMostrarDialogo={setDialogo}
            />
          )}
        </View>

        <BarraInferiorTelefono
          pestanaActiva={pestanaActiva}
          setPestanaActiva={setPestanaActiva}
          esTableta={esTableta}
          puedeGestionarUsuarios={permisos.gestionarUsuarios}
        />

        <ModalGuiaSensores
          visible={guiaVisible}
          onCerrar={() => setGuiaVisible(false)}
        />
        <AsistenteIA
          productos={productos}
          historialVentas={ventasVisibles}
          totalVentasHoy={totalVentasHoy}
          usuarioActual={usuarioActual}
          visible={mostrarIA}
          onCerrar={() => setMostrarIA(false)}
        />
        <ModalMensaje dialogo={dialogo} onCerrar={() => setDialogo(null)} />
      </View>
    </View>
  );
}

export default function App() {
  return (
    <TemaProvider>
      <AppPrincipal />
    </TemaProvider>
  );
}

const styles = StyleSheet.create({
  areaSegura: { flex: 1 },
  contenedorApp: {
    flex: 1,
    minHeight: 0,
    position: "relative",
  },
  cuerpo: { flex: 1, minHeight: 0 },
  bannerOffline: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  textoOffline: { fontSize: 11, fontWeight: "700" },
});