// src/services/geminiService.js
import { UMBRAL_STOCK_BAJO } from "../utils/stockHelpers";
import { formatearFecha, formatearHora } from "../utils/fechaHelpers";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() || "";

// Modelo principal rápido y respaldos vigentes si alguno no está disponible en tu clave
const MODELOS_PREFERIDOS = [
  process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim(),
  "gemini-3.5-flash-lite",
  "gemini-4-hydrogen",
  "gemini-2.5-flash-lite",
].filter(Boolean);

export const GEMINI_CONFIGURADO = Boolean(API_KEY);

// Detecta preguntas analíticas o de negocio que conviene enviar directo a Gemini
const PALABRAS_ANALITICAS = [
  "resumen",
  "reporte",
  "venta",
  "ventas",
  "vendido",
  "ganancia",
  "ingreso",
  "reabastecer",
  "reponer",
  "comprar",
  "falta",
  "faltan",
  "combo",
  "paquete",
  "presupuesto",
  "recomienda",
  "recomiendame",
  "sugiere",
  "mejor",
  "mas caro",
  "mas barato",
  "economico",
  "comparar",
  "diferencia",
  "estrategia",
  "promocion",
  "descuento",
  "todo el inventario",
  "total del inventario",
  "cuanto vale todo",
  "hola",
  "gracias",
  "ayuda",
];

export function esPreguntaCompleja(texto = "") {
  const limpio = String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return PALABRAS_ANALITICAS.some((clave) => limpio.includes(clave));
}

function construirContextoNegocio({
  productos = [],
  historialVentas = [],
  totalVentasHoy = 0,
  usuarioActual = null,
  productoEnFoco = null,
}) {
  const agotados = productos.filter((p) => p.stock <= 0);
  const stockBajo = productos.filter(
    (p) => p.stock > 0 && p.stock <= UMBRAL_STOCK_BAJO,
  );
  const valorInventario = productos.reduce(
    (acc, p) => acc + (Number(p.precio) || 0) * (Number(p.stock) || 0),
    0,
  );

  const listaInventario = productos
    .map(
      (p) =>
        `- ${p.nombre} | Precio: $${Number(p.precio || 0).toLocaleString("es-CO")} COP | Stock: ${p.stock} uds | Código: ${p.codigoBarras || "N/A"} | Desc: ${p.descripcion || "Sin desc"}`,
    )
    .join("\n");

  const ultimasVentas = historialVentas
    .slice(0, 15)
    .map(
      (v) =>
        `- ${v.numeroFactura || v.id} (${formatearFecha(v)} ${formatearHora(v)}) | Total: $${Number(v.total || 0).toLocaleString("es-CO")} | Pago: ${v.metodoPago || "Efectivo"} | Cliente: ${v.cliente || "Consumidor Final"} | Vendedor: ${v.vendedor || "Admin"} | Artículos: ${v.descripcionProductos}`,
    )
    .join("\n");

  return [
    `Eres "Asistente Pilar", el asistente inteligente interno de la tienda "Papelería Pilar" en Colombia.`,
    `Usuario actual: ${usuarioActual?.nombre || "Propietario"} (Rol: ${usuarioActual?.rol || "admin"}).`,
    productoEnFoco
      ? `Artículo actualmente en foco en pantalla: ${productoEnFoco.nombre} ($${Number(productoEnFoco.precio || 0).toLocaleString("es-CO")}, stock: ${productoEnFoco.stock}).`
      : "",
    ``,
    `RESUMEN DEL NEGOCIO:`,
    `- Total de artículos en catálogo: ${productos.length}`,
    `- Valor estimado del inventario actual: $${valorInventario.toLocaleString("es-CO")} COP`,
    `- Agotados (0 uds): ${agotados.length > 0 ? agotados.map((p) => p.nombre).join(", ") : "Ninguno"}`,
    `- Stock bajo (1 a ${UMBRAL_STOCK_BAJO} uds): ${stockBajo.length > 0 ? stockBajo.map((p) => `${p.nombre} (${p.stock})`).join(", ") : "Ninguno"}`,
    `- Ventas registradas hoy: $${Number(totalVentasHoy || 0).toLocaleString("es-CO")} COP`,
    `- Total facturas visibles en historial: ${historialVentas.length}`,
    ``,
    `INVENTARIO ACTUAL:`,
    listaInventario || "(Sin productos registrados)",
    ``,
    `ÚLTIMAS VENTAS (máx. 15):`,
    ultimasVentas || "(Aún no hay ventas registradas)",
    ``,
    `REGLAS DE RESPUESTA:`,
    `1. Responde siempre en español claro, útil y conciso (máximo 120 palabras salvo que pidan una lista detallada).`,
    `2. Usa SIEMPRE los datos reales de arriba. Nunca inventes productos, precios ni ventas que no existan en el catálogo.`,
    `3. Formatea los precios en pesos colombianos (ej. $18.500).`,
    `4. Usa viñetas cortas cuando enumeres artículos o recomendaciones.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function consultarGemini({
  pregunta,
  productos = [],
  historialVentas = [],
  totalVentasHoy = 0,
  usuarioActual = null,
  productoEnFoco = null,
  historialChat = [],
}) {
  if (!GEMINI_CONFIGURADO) {
    throw new Error(
      "No se encontró EXPO_PUBLIC_GEMINI_API_KEY en el archivo .env.",
    );
  }

  const contextoSistema = construirContextoNegocio({
    productos,
    historialVentas,
    totalVentasHoy,
    usuarioActual,
    productoEnFoco,
  });

  // Incluimos los últimos 6 turnos para que Gemini recuerde el hilo de la conversación
  const ultimosTurnos = historialChat
    .filter((m) => m.rol === "usuario" || m.rol === "ia")
    .slice(-6)
    .map((m) => ({
      role: m.rol === "usuario" ? "user" : "model",
      parts: [{ text: m.texto }],
    }));

  const body = {
    systemInstruction: {
      parts: [{ text: contextoSistema }],
    },
    contents: [
      ...ultimosTurnos,
      {
        role: "user",
        parts: [{ text: pregunta }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 450,
    },
  };

  let ultimoError = "No se pudo conectar con Gemini.";

  for (const modelo of MODELOS_PREFERIDOS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(API_KEY)}`;
      const respuesta = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        const msg = data?.error?.message || `Error HTTP ${respuesta.status}`;
        ultimoError = `${modelo}: ${msg}`;
        // Si el modelo no existe o no está disponible, probamos el siguiente respaldo
        if (respuesta.status === 404 || respuesta.status === 400) {
          continue;
        }
        throw new Error(msg);
      }

      const textoGenerado = data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("")
        .trim();

      if (textoGenerado) {
        return { texto: textoGenerado, modelo };
      }

      ultimoError = "Gemini devolvió una respuesta vacía.";
    } catch (error) {
      ultimoError = error?.message || ultimoError;
      if (String(ultimoError).toLowerCase().includes("api key")) {
        break;
      }
    }
  }

  throw new Error(ultimoError);
}