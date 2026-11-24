// src/screens/PantallaUsuarios.js
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useTema } from "../context/TemaContext";
import { ROLES, ETIQUETA_ROL } from "../utils/permisos";

export function PantallaUsuarios({
  usuarios,
  usuarioActual,
  onCrearUsuario,
  onEditarUsuario,
  onToggleActivoUsuario,
  onEliminarUsuario,
  onMostrarDialogo,
}) {
  const { tema } = useTema();

  const [modalVisible, setModalVisible] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState(ROLES.VENDEDOR);
  const [errorForm, setErrorForm] = useState("");

  const abrirNuevo = () => {
    setEditandoId(null);
    setNombre("");
    setUsuario("");
    setPassword("");
    setRol(ROLES.VENDEDOR);
    setErrorForm("");
    setModalVisible(true);
  };

  const abrirEditar = (u) => {
    setEditandoId(u.id);
    setNombre(u.nombre);
    setUsuario(u.usuario);
    setPassword(u.password);
    setRol(u.rol);
    setErrorForm("");
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditandoId(null);
    setErrorForm("");
  };

  const guardar = () => {
    const nombreLimpio = nombre.trim();
    const usuarioLimpio = usuario.trim().toLowerCase().replace(/\s+/g, "");
    const passLimpia = password.trim();

    if (nombreLimpio.length < 2) {
      setErrorForm("Ingresa el nombre completo (mínimo 2 caracteres).");
      return;
    }
    if (usuarioLimpio.length < 3) {
      setErrorForm("El usuario debe tener mínimo 3 caracteres sin espacios.");
      return;
    }
    if (passLimpia.length < 4) {
      setErrorForm("La contraseña debe tener mínimo 4 caracteres.");
      return;
    }

    const existeDuplicado = usuarios.some(
      (u) => u.usuario.toLowerCase() === usuarioLimpio && u.id !== editandoId,
    );
    if (existeDuplicado) {
      setErrorForm(`El usuario "${usuarioLimpio}" ya existe.`);
      return;
    }

    // Evitar degradar al último administrador activo
    if (editandoId && rol !== ROLES.ADMIN) {
      const otrosAdmins = usuarios.filter(
        (u) => u.id !== editandoId && u.rol === ROLES.ADMIN && u.activo,
      );
      if (otrosAdmins.length === 0) {
        setErrorForm("Debe existir al menos un Administrador activo.");
        return;
      }
    }

    if (editandoId) {
      const original = usuarios.find((u) => u.id === editandoId);
      onEditarUsuario({
        ...original,
        nombre: nombreLimpio,
        usuario: usuarioLimpio,
        password: passLimpia,
        rol,
      });
    } else {
      onCrearUsuario({
        id: `u-${Date.now()}`,
        nombre: nombreLimpio,
        usuario: usuarioLimpio,
        password: passLimpia,
        rol,
        activo: true,
      });
    }

    cerrarModal();
  };

  const confirmarEliminar = (u) => {
    if (u.id === usuarioActual.id) {
      onMostrarDialogo?.({
        titulo: "Acción no permitida",
        mensaje: "No puedes eliminar tu propia cuenta mientras tienes sesión activa.",
        tipo: "error",
      });
      return;
    }

    if (u.rol === ROLES.ADMIN) {
      const otrosAdmins = usuarios.filter(
        (item) => item.id !== u.id && item.rol === ROLES.ADMIN && item.activo,
      );
      if (otrosAdmins.length === 0) {
        onMostrarDialogo?.({
          titulo: "Acción no permitida",
          mensaje: "Debe quedar al menos un Administrador activo en el sistema.",
          tipo: "error",
        });
        return;
      }
    }

    onMostrarDialogo?.({
      titulo: "Eliminar usuario",
      mensaje: `¿Eliminar a "${u.nombre}" (@${u.usuario})?\nYa no podrá iniciar sesión, pero sus ventas históricas se conservarán.`,
      tipo: "confirmar",
      textoConfirmar: "Eliminar",
      onConfirmar: () => onEliminarUsuario(u.id),
    });
  };

  return (
    <View style={[styles.contenedor, { backgroundColor: tema.fondo }]}>
      <FlatList
        data={usuarios}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <View style={styles.encabezadoLista}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.titulo, { color: tema.texto }]}>
                Gestión de Equipo y Roles
              </Text>
              <Text style={[styles.subtitulo, { color: tema.textoSuave }]}>
                Crea cuentas para vendedores y controla quién puede acceder.
              </Text>
            </View>
            <Pressable
              style={[styles.botonNuevo, { backgroundColor: tema.primario }]}
              onPress={abrirNuevo}
            >
              <Text style={styles.textoBotonNuevo}>+ Nuevo Usuario</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const esYo = item.id === usuarioActual.id;
          const esAdmin = item.rol === ROLES.ADMIN;

          return (
            <View
              style={[
                styles.tarjetaUsuario,
                {
                  backgroundColor: tema.tarjeta,
                  borderColor: tema.bordeSuave,
                  opacity: item.activo ? 1 : 0.65,
                },
              ]}
            >
              <View style={styles.filaSuperior}>
                <View style={{ flex: 1 }}>
                  <View style={styles.filaNombre}>
                    <Text style={[styles.nombre, { color: tema.texto }]}>
                      {item.nombre}
                    </Text>
                    {esYo && (
                      <Text
                        style={[
                          styles.badgeYo,
                          {
                            backgroundColor: tema.primarioSuave,
                            color: tema.primario,
                          },
                        ]}
                      >
                        Tú
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.handle, { color: tema.textoSuave }]}>
                    @{item.usuario} • Clave: {"•".repeat(item.password.length)}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <View
                    style={[
                      styles.badgeRol,
                      {
                        backgroundColor: esAdmin
                          ? tema.primarioSuave
                          : tema.tarjetaSecundaria,
                        borderColor: esAdmin ? tema.primarioBorde : tema.borde,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.textoRol,
                        { color: esAdmin ? tema.primario : tema.textoSecundario },
                      ]}
                    >
                      {esAdmin ? "👑" : "🧑‍💼"} {ETIQUETA_ROL[item.rol]}
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: item.activo ? tema.exito : tema.peligro,
                    }}
                  >
                    {item.activo ? "🟢 Activo" : "🔴 Desactivado"}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.filaAcciones,
                  { borderTopColor: tema.bordeSuave },
                ]}
              >
                <Pressable
                  style={[
                    styles.btnAccion,
                    {
                      backgroundColor: tema.primarioSuave,
                      borderColor: tema.primarioBorde,
                    },
                  ]}
                  onPress={() => abrirEditar(item)}
                >
                  <Text style={[styles.txtAccion, { color: tema.primario }]}>
                    ✏️ Editar
                  </Text>
                </Pressable>

                {!esYo && (
                  <>
                    <Pressable
                      style={[
                        styles.btnAccion,
                        {
                          backgroundColor: tema.tarjetaSecundaria,
                          borderColor: tema.borde,
                        },
                      ]}
                      onPress={() => onToggleActivoUsuario(item.id)}
                    >
                      <Text
                        style={[
                          styles.txtAccion,
                          { color: tema.textoSecundario },
                        ]}
                      >
                        {item.activo ? "⏸️ Desactivar" : "▶️ Activar"}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.btnAccion,
                        {
                          backgroundColor: tema.peligroFondo,
                          borderColor: tema.peligroBorde,
                        },
                      ]}
                      onPress={() => confirmarEliminar(item)}
                    >
                      <Text style={[styles.txtAccion, { color: tema.peligro }]}>
                        🗑️ Eliminar
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Modal Crear / Editar Usuario */}
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
              <Text style={[styles.tituloModal, { color: tema.texto }]}>
                {editandoId ? "✏️ Editar Usuario" : "👤 Nuevo Usuario"}
              </Text>
              <Pressable
                style={[
                  styles.botonCerrarX,
                  { backgroundColor: tema.tarjetaSecundaria },
                ]}
                onPress={cerrarModal}
              >
                <Text
                  style={[styles.textoCerrarX, { color: tema.textoSecundario }]}
                >
                  ✕
                </Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {errorForm !== "" && (
                <View
                  style={[
                    styles.cajaError,
                    {
                      backgroundColor: tema.peligroFondo,
                      borderColor: tema.peligroBorde,
                    },
                  ]}
                >
                  <Text style={{ color: tema.peligro, fontSize: 12, fontWeight: "700" }}>
                    ⚠️ {errorForm}
                  </Text>
                </View>
              )}

              <Text style={[styles.label, { color: tema.textoSecundario }]}>
                Nombre completo *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: tema.inputFondo,
                    borderColor: tema.borde,
                    color: tema.texto,
                  },
                ]}
                placeholder="Ej. Laura Gómez"
                placeholderTextColor={tema.textoSuave}
                value={nombre}
                onChangeText={setNombre}
              />

              <Text style={[styles.label, { color: tema.textoSecundario }]}>
                Usuario de ingreso *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: tema.inputFondo,
                    borderColor: tema.borde,
                    color: tema.texto,
                  },
                ]}
                placeholder="Ej. laura"
                placeholderTextColor={tema.textoSuave}
                autoCapitalize="none"
                autoCorrect={false}
                value={usuario}
                onChangeText={setUsuario}
              />

              <Text style={[styles.label, { color: tema.textoSecundario }]}>
                Contraseña *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: tema.inputFondo,
                    borderColor: tema.borde,
                    color: tema.texto,
                  },
                ]}
                placeholder="Mínimo 4 caracteres"
                placeholderTextColor={tema.textoSuave}
                value={password}
                onChangeText={setPassword}
              />

              <Text style={[styles.label, { color: tema.textoSecundario }]}>
                Rol y permisos *
              </Text>
              <View style={styles.filaRoles}>
                {[ROLES.VENDEDOR, ROLES.ADMIN].map((r) => {
                  const activo = rol === r;
                  return (
                    <Pressable
                      key={r}
                      style={[
                        styles.chipRol,
                        {
                          backgroundColor: activo
                            ? tema.primario
                            : tema.tarjetaSecundaria,
                          borderColor: activo ? tema.primario : tema.borde,
                        },
                      ]}
                      onPress={() => setRol(r)}
                    >
                      <Text
                        style={[
                          styles.textoChipRol,
                          { color: activo ? "#FFFFFF" : tema.textoSecundario },
                        ]}
                      >
                        {r === ROLES.ADMIN
                          ? "👑 Administrador"
                          : "🧑‍💼 Vendedor"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.ayudaRol, { color: tema.textoSuave }]}>
                {rol === ROLES.ADMIN
                  ? "Acceso total: ventas, inventario, reportes globales y gestión del equipo."
                  : "Acceso de mostrador: puede registrar ventas, consultar inventario y ver solo sus propias ventas."}
              </Text>

              <View style={styles.filaBotonesModal}>
                <Pressable
                  style={[
                    styles.btnCancelar,
                    { backgroundColor: tema.tarjetaSecundaria },
                  ]}
                  onPress={cerrarModal}
                >
                  <Text
                    style={{ color: tema.textoSecundario, fontWeight: "bold" }}
                  >
                    Cancelar
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.btnGuardar, { backgroundColor: tema.exito }]}
                  onPress={guardar}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "bold" }}>
                    {editandoId ? "✓ Guardar Cambios" : "✓ Crear Usuario"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  lista: { padding: 16, paddingBottom: 110 },
  encabezadoLista: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  titulo: { fontSize: 19, fontWeight: "bold" },
  subtitulo: { fontSize: 12, marginTop: 2 },
  botonNuevo: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  textoBotonNuevo: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 },
  tarjetaUsuario: {
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
  },
  filaSuperior: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  filaNombre: { flexDirection: "row", alignItems: "center", gap: 8 },
  nombre: { fontSize: 16, fontWeight: "bold" },
  badgeYo: {
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  handle: { fontSize: 12, marginTop: 4 },
  badgeRol: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  textoRol: { fontSize: 11, fontWeight: "bold" },
  filaAcciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  btnAccion: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  txtAccion: { fontSize: 12, fontWeight: "bold" },

  fondoModal: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  tarjetaModal: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "90%",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
  },
  encabezadoModal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 14,
    borderBottomWidth: 1,
  },
  tituloModal: { fontSize: 17, fontWeight: "bold" },
  botonCerrarX: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textoCerrarX: { fontSize: 16, fontWeight: "bold" },
  cajaError: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 5 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  filaRoles: { flexDirection: "row", gap: 10, marginBottom: 8 },
  chipRol: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  textoChipRol: { fontSize: 13, fontWeight: "bold" },
  ayudaRol: { fontSize: 12, marginBottom: 16, lineHeight: 17 },
  filaBotonesModal: { flexDirection: "row", gap: 10 },
  btnCancelar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnGuardar: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});