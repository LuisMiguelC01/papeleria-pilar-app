// src/services/modeloIA.js

const PALABRAS_COMUNES = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al",
  "a", "en", "con", "por", "para", "es", "son", "su", "sus", "este", "esta",
  "ese", "esa", "que", "cual", "cuales", "como", "me", "puedes", "decir",
  "saber", "quiero", "no", "sobre", "producto", "articulo", "tiene", "dime",
]);

export const ejemplos = [
  // Intención: PRECIO
  { texto: "cuanto cuesta", etiqueta: "precio" },
  { texto: "cual es el precio", etiqueta: "precio" },
  { texto: "cual es su costo", etiqueta: "precio" },
  { texto: "que valor tiene", etiqueta: "precio" },
  { texto: "a como sale cuanto vale", etiqueta: "precio" },
  { texto: "precio de venta en pesos", etiqueta: "precio" },

  // Intención: NOMBRE
  { texto: "como se llama", etiqueta: "nombre" },
  { texto: "cual es el nombre", etiqueta: "nombre" },
  { texto: "nombre comercial referencia", etiqueta: "nombre" },
  { texto: "que producto o util escolar es", etiqueta: "nombre" },
  { texto: "identificacion o titulo", etiqueta: "nombre" },

  // Intención: DESCRIPCIÓN
  { texto: "que caracteristicas tiene", etiqueta: "descripcion" },
  { texto: "cual es la descripcion", etiqueta: "descripcion" },
  { texto: "detalles especificaciones material", etiqueta: "descripcion" },
  { texto: "para que sirve como es", etiqueta: "descripcion" },
  { texto: "informacion hojas tamano", etiqueta: "descripcion" },

  // Intención: STOCK
  { texto: "cuantos quedan", etiqueta: "stock" },
  { texto: "hay stock disponible", etiqueta: "stock" },
  { texto: "cuantas unidades disponibles inventario", etiqueta: "stock" },
  { texto: "esta agotado quedan existencias", etiqueta: "stock" },
  { texto: "cantidad bodega disponibles hay", etiqueta: "stock" },
];

function limpiarTexto(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function singularizar(palabra) {
  if (palabra.length <= 3) return palabra;
  if (palabra.endsWith("ces") && palabra.length > 4) {
    return palabra.slice(0, -3) + "z";
  }
  if (/(res|les|nes|des)$/.test(palabra) && palabra.length > 5) {
    return palabra.slice(0, -2);
  }
  if (palabra.endsWith("s") && !palabra.endsWith("ss")) {
    return palabra.slice(0, -1);
  }
  return palabra;
}

// 1. Tokenizador para clasificación de intenciones
export function tokens(texto = "") {
  const limpio = limpiarTexto(texto);
  if (!limpio) return [];

  const palabras = limpio
    .split(/\s+/)
    .filter((p) => p.length > 1 && !PALABRAS_COMUNES.has(p));

  return Array.from(new Set(palabras));
}

// 2. Coeficiente de Ochiai (0 a 1)
export function similitud(tokensPregunta, tokensEjemplo) {
  if (tokensPregunta.length === 0 || tokensEjemplo.length === 0) return 0;

  let comunes = 0;
  for (const palabra of tokensPregunta) {
    if (tokensEjemplo.includes(palabra)) {
      comunes += 1;
    }
  }

  if (comunes === 0) return 0;
  return comunes / Math.sqrt(tokensPregunta.length * tokensEjemplo.length);
}

// 3. Clasificador 1-NN por intención (precio, nombre, descripcion, stock)
export function clasificar(pregunta) {
  const palabrasPregunta = tokens(pregunta);

  if (palabrasPregunta.length === 0) {
    return {
      intencion: "desconocido",
      similitud: 0,
      motivo: "sin_palabras_clave",
      ejemploBase: null,
    };
  }

  const mejoresPorIntencion = {
    precio: { etiqueta: "precio", puntaje: 0, ejemplo: "" },
    nombre: { etiqueta: "nombre", puntaje: 0, ejemplo: "" },
    descripcion: { etiqueta: "descripcion", puntaje: 0, ejemplo: "" },
    stock: { etiqueta: "stock", puntaje: 0, ejemplo: "" },
  };

  for (const item of ejemplos) {
    const palabrasEjemplo = tokens(item.texto);
    const score = similitud(palabrasPregunta, palabrasEjemplo);

    if (score > mejoresPorIntencion[item.etiqueta].puntaje) {
      mejoresPorIntencion[item.etiqueta] = {
        etiqueta: item.etiqueta,
        puntaje: score,
        ejemplo: item.texto,
      };
    }
  }

  const ranking = Object.values(mejoresPorIntencion).sort(
    (a, b) => b.puntaje - a.puntaje,
  );

  const primero = ranking[0];
  const segundo = ranking[1];

  const UMBRAL_MINIMO = 0.25;
  const MARGEN_DESEMPATE = 0.08;

  if (primero.puntaje < UMBRAL_MINIMO) {
    return {
      intencion: "desconocido",
      similitud: primero.puntaje,
      motivo: "baja_coincidencia",
      ejemploBase: primero.ejemplo,
    };
  }

  if (primero.puntaje - segundo.puntaje < MARGEN_DESEMPATE) {
    return {
      intencion: "ambiguo",
      similitud: primero.puntaje,
      motivo: `empate_${primero.etiqueta}_${segundo.etiqueta}`,
      ejemploBase: primero.ejemplo,
    };
  }

  return {
    intencion: primero.etiqueta,
    similitud: primero.puntaje,
    motivo: "reconocida",
    ejemploBase: primero.ejemplo,
  };
}

// 4. Detecta si el usuario mencionó algún producto por nombre o código de barras
export function detectarProductoEnTexto(pregunta = "", productos = []) {
  const textoLimpio = limpiarTexto(pregunta);
  if (!textoLimpio || !Array.isArray(productos) || productos.length === 0) {
    return null;
  }

  // Coincidencia directa por código de barras
  const porCodigo = productos.findIndex(
    (p) =>
      p.codigoBarras &&
      p.codigoBarras.trim() !== "" &&
      textoLimpio.includes(limpiarTexto(p.codigoBarras)),
  );
  if (porCodigo !== -1) {
    return {
      producto: productos[porCodigo],
      indice: porCodigo,
      palabrasCoincidentes: [limpiarTexto(productos[porCodigo].codigoBarras)],
    };
  }

  const palabrasPregunta = textoLimpio
    .split(/\s+/)
    .filter((p) => p.length > 2 && !PALABRAS_COMUNES.has(p));

  const raicesPregunta = palabrasPregunta.map(singularizar);

  let mejor = null;

  productos.forEach((prod, indice) => {
    const tokensNombre = limpiarTexto(prod.nombre)
      .split(/\s+/)
      .filter((p) => p.length > 2 && !PALABRAS_COMUNES.has(p));

    if (tokensNombre.length === 0) return;

    const raicesNombre = tokensNombre.map(singularizar);
    const coincidentes = [];

    palabrasPregunta.forEach((pal, i) => {
      const raiz = raicesPregunta[i];
      if (raicesNombre.includes(raiz)) {
        coincidentes.push(pal);
      }
    });

    if (coincidentes.length === 0) return;

    const cobertura = coincidentes.length / tokensNombre.length;
    const puntaje = coincidentes.length + cobertura;

    if (!mejor || puntaje > mejor.puntaje) {
      mejor = {
        producto: prod,
        indice,
        puntaje,
        palabrasCoincidentes: coincidentes,
      };
    }
  });

  return mejor;
}

// 5. Combina detección automática del producto + clasificación limpia de intención
export function analizarConsulta(pregunta = "", productos = []) {
  const deteccion = detectarProductoEnTexto(pregunta, productos);

  let textoParaIntencion = pregunta;
  if (deteccion && deteccion.palabrasCoincidentes.length > 0) {
    const excluidas = new Set(deteccion.palabrasCoincidentes);
    const filtradas = limpiarTexto(pregunta)
      .split(/\s+/)
      .filter((p) => !excluidas.has(p));
    textoParaIntencion = filtradas.join(" ");
  }

  const prediccion = clasificar(textoParaIntencion);

  // Si nombró un producto pero no especificó campo (ej. solo escribió "resma"),
  // devolvemos la intención especial "ficha" para mostrarle su resumen completo.
  if (deteccion && prediccion.intencion === "desconocido") {
    return {
      productoDetectado: deteccion.producto,
      indiceDetectado: deteccion.indice,
      prediccion: {
        intencion: "ficha",
        similitud: 1,
        motivo: "producto_directo",
      },
    };
  }

  return {
    productoDetectado: deteccion ? deteccion.producto : null,
    indiceDetectado: deteccion ? deteccion.indice : -1,
    prediccion,
  };
}