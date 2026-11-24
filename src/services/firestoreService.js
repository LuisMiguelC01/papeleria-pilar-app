// src/services/firestoreService.js
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
} from "firebase/firestore";
import { db, FIREBASE_CONFIGURADO } from "./firebaseConfig";

const COL_PRODUCTOS = "productos";
const COL_VENTAS = "ventas";
const COL_USUARIOS = "usuarios";

function sanitizarProductoParaNube(prod) {
  const esStringImagen = typeof prod.imagenUri === "string";
  const imagenValida =
    esStringImagen && prod.imagenUri.length < 750000
      ? prod.imagenUri.trim()
      : "";

  return {
    id: String(prod.id),
    nombre: String(prod.nombre || "Producto sin nombre"),
    descripcion: String(prod.descripcion || ""),
    precio: Number(prod.precio) || 0,
    stock: Math.max(0, Number(prod.stock) || 0),
    codigoBarras: String(prod.codigoBarras || "").trim(),
    imagenUri: imagenValida,
    actualizadoEn: prod.actualizadoEn || Date.now(),
  };
}

function sanitizarVentaParaNube(venta) {
  const itemsLimpios = Array.isArray(venta.items)
    ? venta.items.map((item) => ({
        productoId: String(item.productoId || ""),
        nombre: String(item.nombre || "Producto"),
        cantidad: Number(item.cantidad) || 0,
        precioUnitario: Number(item.precioUnitario) || 0,
        subtotal: Number(item.subtotal) || 0,
      }))
    : [];

  return {
    id: String(venta.id || Date.now()),
    numeroFactura: String(venta.numeroFactura || "FAC-0001"),
    fechaISO: String(venta.fechaISO || new Date().toISOString()),
    fecha: String(venta.fecha || ""),
    hora: String(venta.hora || ""),
    cliente: String(venta.cliente || "Consumidor Final"),
    vendedorId: String(venta.vendedorId || "anon"),
    vendedor: String(venta.vendedor || "Administrador"),
    metodoPago: String(venta.metodoPago || "Efectivo"),
    montoRecibido: Number(venta.montoRecibido) || Number(venta.total) || 0,
    cambio: Number(venta.cambio) || 0,
    descripcionProductos: String(venta.descripcionProductos || ""),
    items: itemsLimpios,
    total: Number(venta.total) || 0,
  };
}

// 1. Sube los productos y usuarios iniciales que aún no existan en Firestore
export async function inicializarColeccionesSiVacias(
  productosIniciales,
  usuariosIniciales,
) {
  if (!FIREBASE_CONFIGURADO || !db) return;

  const snapProd = await getDocs(collection(db, COL_PRODUCTOS));
  const idsExistentes = new Set(snapProd.docs.map((d) => String(d.id)));
  const faltantesProd = (productosIniciales || []).filter(
    (p) => !idsExistentes.has(String(p.id)),
  );

  if (faltantesProd.length > 0) {
    const batch = writeBatch(db);
    faltantesProd.forEach((prod, index) => {
      const ref = doc(db, COL_PRODUCTOS, String(prod.id));
      batch.set(
        ref,
        sanitizarProductoParaNube({
          ...prod,
          actualizadoEn: Date.now() - index * 1000,
        }),
      );
    });
    await batch.commit();
  }

  const snapUsers = await getDocs(collection(db, COL_USUARIOS));
  if (snapUsers.empty && Array.isArray(usuariosIniciales)) {
    const batch = writeBatch(db);
    usuariosIniciales.forEach((u) => {
      const ref = doc(db, COL_USUARIOS, String(u.id));
      batch.set(ref, {
        id: String(u.id),
        nombre: String(u.nombre),
        usuario: String(u.usuario),
        password: String(u.password),
        rol: String(u.rol),
        activo: Boolean(u.activo),
      });
    });
    await batch.commit();
  }
}

// 2. Suscripciones en tiempo real
export function suscribirProductos(onDatos, onError) {
  if (!FIREBASE_CONFIGURADO || !db) return () => {};
  return onSnapshot(
    collection(db, COL_PRODUCTOS),
    (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => {
        const numA = Number(a.id);
        const numB = Number(b.id);
        if (!isNaN(numA) && !isNaN(numB) && numA <= 100 && numB <= 100) {
          return numA - numB;
        }
        return (b.actualizadoEn || 0) - (a.actualizadoEn || 0);
      });
      onDatos(lista);
    },
    (error) => {
      console.error("[Firestore] Error escuchando productos:", error);
      onError?.(error);
    },
  );
}

export function suscribirVentas(onDatos, onError) {
  if (!FIREBASE_CONFIGURADO || !db) return () => {};
  const q = query(collection(db, COL_VENTAS), orderBy("fechaISO", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onDatos(lista);
    },
    (error) => {
      console.error("[Firestore] Error escuchando ventas:", error);
      onError?.(error);
    },
  );
}

export function suscribirUsuarios(onDatos, onError) {
  if (!FIREBASE_CONFIGURADO || !db) return () => {};
  return onSnapshot(
    collection(db, COL_USUARIOS),
    (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onDatos(lista);
    },
    (error) => {
      console.error("[Firestore] Error escuchando usuarios:", error);
      onError?.(error);
    },
  );
}

// 3. Operaciones CRUD de Productos
export async function guardarProductoNube(producto) {
  if (!FIREBASE_CONFIGURADO || !db) return;
  const ref = doc(db, COL_PRODUCTOS, String(producto.id));
  await setDoc(ref, sanitizarProductoParaNube(producto), { merge: true });
}

export async function eliminarProductoNube(productoId) {
  if (!FIREBASE_CONFIGURADO || !db) return;
  await deleteDoc(doc(db, COL_PRODUCTOS, String(productoId)));
}

// 4. Registrar Venta + Descontar Stock de forma atómica
export async function registrarVentaYDescontarStockNube(
  ventaCompleta,
  productosActualizados,
) {
  if (!FIREBASE_CONFIGURADO || !db) return;

  const batch = writeBatch(db);
  const ventaLimpia = sanitizarVentaParaNube(ventaCompleta);

  const ventaRef = doc(db, COL_VENTAS, ventaLimpia.id);
  batch.set(ventaRef, ventaLimpia);

  const idsAfectados = new Set(
    ventaLimpia.items.map((i) => String(i.productoId)),
  );

  productosActualizados.forEach((prod) => {
    if (idsAfectados.has(String(prod.id))) {
      const prodRef = doc(db, COL_PRODUCTOS, String(prod.id));
      batch.set(
        prodRef,
        {
          stock: Math.max(0, Number(prod.stock) || 0),
          actualizadoEn: Date.now(),
        },
        { merge: true },
      );
    }
  });

  await batch.commit();
}

// 5. Operaciones CRUD de Usuarios
export async function guardarUsuarioNube(usuario) {
  if (!FIREBASE_CONFIGURADO || !db) return;
  const ref = doc(db, COL_USUARIOS, String(usuario.id));
  await setDoc(
    ref,
    {
      id: String(usuario.id),
      nombre: String(usuario.nombre || ""),
      usuario: String(usuario.usuario || ""),
      password: String(usuario.password || ""),
      rol: String(usuario.rol || "vendedor"),
      activo: Boolean(usuario.activo),
    },
    { merge: true },
  );
}

export async function eliminarUsuarioNube(usuarioId) {
  if (!FIREBASE_CONFIGURADO || !db) return;
  await deleteDoc(doc(db, COL_USUARIOS, String(usuarioId)));
}

// 6. Obtener o crear cuenta de Vendedor al iniciar con Google
export async function obtenerOCrearUsuarioGoogle({ uid, nombre, email }) {
  const idDoc = `g_${uid}`;
  const nuevoUsuario = {
    id: idDoc,
    nombre: String(nombre || email?.split("@")[0] || "Vendedor Invitado"),
    usuario: String(email || idDoc).toLowerCase(),
    password: "",
    rol: "vendedor",
    activo: true,
    proveedor: "google",
  };

  if (!FIREBASE_CONFIGURADO || !db) return nuevoUsuario;

  const ref = doc(db, COL_USUARIOS, idDoc);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }

  await setDoc(ref, nuevoUsuario);
  return nuevoUsuario;
}