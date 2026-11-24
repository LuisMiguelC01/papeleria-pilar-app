// src/utils/stockHelpers.js
export const UMBRAL_STOCK_BAJO = 5;

export function obtenerEstadoStock(stock, esOscuro = false) {
  const cantidad = Number(stock) || 0;

  if (cantidad <= 0) {
    return {
      agotado: true,
      bajo: false,
      icono: "🔴",
      etiqueta: "Agotado (0 unidades)",
      etiquetaCorta: "Agotado (0)",
      colorTexto: esOscuro ? "#FCA5A5" : "#DC2626",
      colorFondo: esOscuro ? "#450A0A" : "#FEE2E2",
      colorBorde: esOscuro ? "#991B1B" : "#FECACA",
    };
  }

  if (cantidad <= UMBRAL_STOCK_BAJO) {
    return {
      agotado: false,
      bajo: true,
      icono: "🟠",
      etiqueta: `Stock bajo: ${cantidad} ${cantidad === 1 ? "unidad" : "unidades"}`,
      etiquetaCorta: `${cantidad} en stock (Bajo)`,
      colorTexto: esOscuro ? "#FCD34D" : "#D97706",
      colorFondo: esOscuro ? "#451A03" : "#FEF3C7",
      colorBorde: esOscuro ? "#92400E" : "#FDE68A",
    };
  }

  return {
    agotado: false,
    bajo: false,
    icono: "🟢",
    etiqueta: `${cantidad} unidades en stock`,
    etiquetaCorta: `${cantidad} en stock`,
    colorTexto: esOscuro ? "#86EFAC" : "#16A34A",
    colorFondo: esOscuro ? "#14532D" : "#DCFCE7",
    colorBorde: esOscuro ? "#166534" : "#BBF7D0",
  };
}