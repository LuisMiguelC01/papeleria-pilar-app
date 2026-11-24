// src/screens/PantallaLogin.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useTema } from "../context/TemaContext";
import {
  GOOGLE_AUTH_DISPONIBLE,
  iniciarSesionConGoogle,
} from "../services/authGoogleService";
import { obtenerOCrearUsuarioGoogle } from "../services/firestoreService";

export function PantallaLogin({ onIniciarSesion, onLoginGoogle }) {
  const { tema, esOscuro, alternarTema } = useTema();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const [error, setError] = useState("");

  const margenSuperiorAndroid =
    Platform.OS === "android" ? Math.max(StatusBar.currentHeight || 0, 34) : 0;

  async function manejarLoginGoogle() {
    if (cargandoGoogle) return;
    setError("");
    setCargandoGoogle(true);
    try {
      const datosGoogle = await iniciarSesionConGoogle();
      const cuentaVendedor = await obtenerOCrearUsuarioGoogle(datosGoogle);

      if (!cuentaVendedor.activo) {
        setError("Tu cuenta de vendedor fue desactivada por el administrador.");
        return;
      }

      if (onLoginGoogle) {
        onLoginGoogle(cuentaVendedor);
      }
    } catch (err) {
      setError(err?.message || "No se pudo iniciar sesión con Google.");
    } finally {
      setCargandoGoogle(false);
    }
  }

  const manejarIngreso = () => {
    const res = onIniciarSesion(usuario, password);
    if (!res.ok) {
      setError(res.error || "Credenciales incorrectas.");
      return;
    }
    setError("");
  };

  return (
    <View
      style={[
        styles.pantalla,
        { backgroundColor: tema.fondo, paddingTop: margenSuperiorAndroid },
      ]}
    >
      <StatusBar
        barStyle={esOscuro ? "light-content" : "dark-content"}
        backgroundColor={tema.fondo}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContenedor}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.barraSuperior}>
            <Pressable
              style={[
                styles.botonTema,
                {
                  backgroundColor: tema.tarjeta,
                  borderColor: tema.bordeSuave,
                },
              ]}
              onPress={alternarTema}
            >
              <Text style={[styles.textoTema, { color: tema.texto }]}>
                {esOscuro ? "☀️ Modo Claro" : "🌙 Modo Oscuro"}
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.tarjetaLogin,
              {
                backgroundColor: tema.tarjeta,
                borderColor: tema.bordeSuave,
              },
            ]}
          >
            <View style={styles.encabezadoMarca}>
              <View
                style={[styles.circuloLogo, { backgroundColor: tema.primario }]}
              >
                <Text style={{ fontSize: 30 }}>🛍️</Text>
              </View>
              <Text style={[styles.tituloMarca, { color: tema.texto }]}>
                Papelería Pilar
              </Text>
              <Text style={[styles.subtituloMarca, { color: tema.textoSuave }]}>
                Sistema de Gestión Interna • Inicia sesión
              </Text>
            </View>

            {error !== "" && (
              <View
                style={[
                  styles.cajaError,
                  {
                    backgroundColor: tema.peligroFondo,
                    borderColor: tema.peligroBorde,
                  },
                ]}
              >
                <Text style={[styles.textoError, { color: tema.peligro }]}>
                  ⚠️ {error}
                </Text>
              </View>
            )}

            <Text style={[styles.label, { color: tema.textoSecundario }]}>
              Usuario
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
              placeholder="Ej. admin"
              placeholderTextColor={tema.textoSuave}
              autoCapitalize="none"
              autoCorrect={false}
              value={usuario}
              onChangeText={(t) => {
                setUsuario(t);
                if (error) setError("");
              }}
            />

            <Text style={[styles.label, { color: tema.textoSecundario }]}>
              Contraseña
            </Text>
            <View
              style={[
                styles.filaPassword,
                {
                  backgroundColor: tema.inputFondo,
                  borderColor: tema.borde,
                },
              ]}
            >
              <TextInput
                style={[styles.inputPassword, { color: tema.texto }]}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor={tema.textoSuave}
                secureTextEntry={!mostrarPassword}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError("");
                }}
                returnKeyType="done"
                onSubmitEditing={manejarIngreso}
              />
              <Pressable
                style={styles.botonOjo}
                onPress={() => setMostrarPassword(!mostrarPassword)}
              >
                <Text style={{ fontSize: 16 }}>
                  {mostrarPassword ? "🙈" : "👁️"}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.botonIngresar, { backgroundColor: tema.primario }]}
              onPress={manejarIngreso}
            >
              <Text style={styles.textoBotonIngresar}>Ingresar al Sistema</Text>
            </Pressable>

            {GOOGLE_AUTH_DISPONIBLE && (
              <>
                <View style={styles.separadorO}>
                  <View
                    style={[styles.lineaSep, { backgroundColor: tema.borde }]}
                  />
                  <Text style={[styles.textoSep, { color: tema.textoSuave }]}>
                    o ingresa como invitado / vendedor
                  </Text>
                  <View
                    style={[styles.lineaSep, { backgroundColor: tema.borde }]}
                  />
                </View>

                <Pressable
                  style={[
                    styles.botonGoogle,
                    {
                      backgroundColor: tema.tarjetaSecundaria,
                      borderColor: tema.borde,
                      opacity: cargandoGoogle ? 0.65 : 1,
                    },
                  ]}
                  disabled={cargandoGoogle}
                  onPress={manejarLoginGoogle}
                >
                  {cargandoGoogle ? (
                    <ActivityIndicator size="small" color={tema.primario} />
                  ) : (
                    <Text
                      style={[styles.textoBotonGoogle, { color: tema.texto }]}
                    >
                      G  Continuar con Google (Rol Vendedor)
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  scrollContenedor: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  barraSuperior: {
    width: "100%",
    maxWidth: 420,
    alignItems: "flex-end",
    marginBottom: 14,
  },
  botonTema: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  textoTema: { fontSize: 12, fontWeight: "bold" },
  tarjetaLogin: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  encabezadoMarca: { alignItems: "center", marginBottom: 22 },
  circuloLogo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  tituloMarca: { fontSize: 24, fontWeight: "bold" },
  subtituloMarca: { fontSize: 13, marginTop: 4, textAlign: "center" },
  cajaError: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  textoError: { fontSize: 12, fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 14,
  },
  filaPassword: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
  },
  inputPassword: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    fontSize: 14,
  },
  botonOjo: {
    paddingHorizontal: 14,
    height: "100%",
    justifyContent: "center",
  },
  botonIngresar: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  textoBotonIngresar: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
  separadorO: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 14,
  },
  lineaSep: { flex: 1, height: 1 },
  textoSep: { fontSize: 11.5, fontWeight: "600" },
  botonGoogle: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  textoBotonGoogle: { fontSize: 14, fontWeight: "700" },
});