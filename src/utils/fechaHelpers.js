// src/utils/fechaHelpers.js

export function obtenerTimestampVenta(venta) {
  if (venta?.fechaISO) {
    const fecha = new Date(venta.fechaISO);
    if (!isNaN(fecha.getTime())) return fecha.getTime();
  }

  // Respaldo para ventas antiguas cuyo id era Date.now().toString()
  const idNumerico = Number(venta?.id);
  if (!isNaN(idNumerico) && idNumerico > 1600000000000) {
    return idNumerico;
  }

  return Date.now();
}

export function formatearFecha(venta) {
  if (venta?.fecha) return venta.fecha;
  const fecha = new Date(obtenerTimestampVenta(venta));
  return fecha.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatearHora(venta) {
  if (venta?.hora) return venta.hora;
  const fecha = new Date(obtenerTimestampVenta(venta));
  return fecha.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function esMismoDia(fechaA, fechaB) {
  return (
    fechaA.getFullYear() === fechaB.getFullYear() &&
    fechaA.getMonth() === fechaB.getMonth() &&
    fechaA.getDate() === fechaB.getDate()
  );
}

export function perteneceAPeriodo(venta, periodo) {
  if (periodo === "todas") return true;

  const ahora = new Date();
  const fechaVenta = new Date(obtenerTimestampVenta(venta));

  if (periodo === "hoy") {
    return esMismoDia(fechaVenta, ahora);
  }

  if (periodo === "semana") {
    const inicioSemana = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate() - 6,
      0,
      0,
      0,
      0,
    );
    return fechaVenta >= inicioSemana;
  }

  if (periodo === "mes") {
    return (
      fechaVenta.getFullYear() === ahora.getFullYear() &&
      fechaVenta.getMonth() === ahora.getMonth()
    );
  }

  return true;
}