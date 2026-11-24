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
} from "react-native";
import { useTema } from "../context/TemaContext";

export function PantallaLogin({ onIniciarSesion }) {
  const { tema, esOscuro, alternarTema } = useTema();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");

  const margenSuperiorAndroid =
    Platform.OS === "android" ? Math.max(StatusBar.currentHeight || 0, 34) : 0;

  const manejarIngreso = () => {
    const res = onIniciarSesion(usuario, password);
    if (!res.ok) {
      setError(res.error || "Credenciales incorrectas.");
      return;
    }
    setError("");
  };

  const autocompletar = (u, p) => {
    setUsuario(u);
    setPassword(p);
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
          {/* Botón rápido de tema */}
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
            {/* Marca */}
            <View style={styles.encabezadoMarca}>
              <View
                style={[styles.circuloLogo, { backgroundColor: tema.primario }]}
              >
                <Text style={{ fontSize: 30 }}>🛍️</Text>
              </View>
              <Text style={[styles.tituloMarca, { color: tema.texto }]}>
                Papelería Pilar
              </Text>
              <Text
                style={[styles.subtituloMarca, { color: tema.textoSuave }]}
              >
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

            {/* Accesos rápidos para pruebas */}
            <View
              style={[
                styles.cajaDemos,
                {
                  backgroundColor: tema.tarjetaSecundaria,
                  borderColor: tema.bordeSuave,
                },
              ]}
            >
              <Text style={[styles.tituloDemos, { color: tema.textoSuave }]}>
                ACCESOS RÁPIDOS DE PRUEBA
              </Text>
              <View style={styles.filaDemos}>
                <Pressable
                  style={[
                    styles.chipDemo,
                    {
                      backgroundColor: tema.primarioSuave,
                      borderColor: tema.primarioBorde,
                    },
                  ]}
                  onPress={() => autocompletar("admin", "1234")}
                >
                  <Text style={[styles.textoDemo, { color: tema.primario }]}>
                    👑 Admin (admin / 1234)
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.chipDemo,
                    {
                      backgroundColor: tema.tarjeta,
                      borderColor: tema.borde,
                    },
                  ]}
                  onPress={() => autocompletar("vendedor", "1234")}
                >
                  <Text
                    style={[styles.textoDemo, { color: tema.textoSecundario }]}
                  >
                    🧑‍💼 Vendedor (vendedor / 1234)
                  </Text>
                </Pressable>
              </View>
            </View>
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
  cajaDemos: {
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tituloDemos: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.7,
    marginBottom: 8,
    textAlign: "center",
  },
  filaDemos: { gap: 8 },
  chipDemo: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  textoDemo: { fontSize: 12, fontWeight: "700" },
});