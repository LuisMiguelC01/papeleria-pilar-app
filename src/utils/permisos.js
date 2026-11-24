// src/utils/permisos.js

export const ROLES = {
  ADMIN: "admin",
  VENDEDOR: "vendedor",
};

export const ETIQUETA_ROL = {
  [ROLES.ADMIN]: "Administrador",
  [ROLES.VENDEDOR]: "Vendedor",
};

export const PERMISOS_POR_ROL = {
  [ROLES.ADMIN]: {
    verInicio: true,
    verInventario: true,
    gestionarInventario: true, // Crear, editar y eliminar productos
    registrarVentas: true,
    verTodosLosReportes: true, // Ve las ventas de todo el equipo
    gestionarUsuarios: true, // Administrar vendedores y roles
  },
  [ROLES.VENDEDOR]: {
    verInicio: true,
    verInventario: true, // Solo consulta de precios y stock
    gestionarInventario: false,
    registrarVentas: true,
    verTodosLosReportes: false, // Solo ve las ventas que él/ella registró
    gestionarUsuarios: false,
  },
};

export function obtenerPermisos(rol) {
  return PERMISOS_POR_ROL[rol] || PERMISOS_POR_ROL[ROLES.VENDEDOR];
}