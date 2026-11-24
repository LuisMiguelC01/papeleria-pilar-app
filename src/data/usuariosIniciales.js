// src/data/usuariosIniciales.js
import { ROLES } from "../utils/permisos";

export const USUARIOS_INICIALES = [
  {
    id: "u-admin-1",
    nombre: "Luis Miguel",
    usuario: "admin",
    password: "1234",
    rol: ROLES.ADMIN,
    activo: true,
  },
  {
    id: "u-vendedor-1",
    nombre: "Aleja",
    usuario: "vendedor",
    password: "1234",
    rol: ROLES.VENDEDOR,
    activo: true,
  },
];