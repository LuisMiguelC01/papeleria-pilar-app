// src/components/ImagenProducto.js
import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useTema } from "../context/TemaContext";

export function ImagenProducto({ uri, tamano = 56, radio = 12 }) {
  const { tema } = useTema();
  const [errorCarga, setErrorCarga] = useState(false);

  useEffect(() => {
    setErrorCarga(false);
  }, [uri]);

  // En src/components/ImagenProducto.js
  const esRecursoLocal = typeof uri === "number";
  const tieneUriValida =
  (esRecursoLocal || Boolean(uri && String(uri).trim() !== "")) && !errorCarga;

  if (tieneUriValida) {
    return (
      <Image
        source={esRecursoLocal ? uri : { uri: String(uri).trim() }}
        style={[
          styles.imagen,
          {
            width: tamano,
            height: tamano,
            borderRadius: radio,
            borderColor: tema.bordeSuave,
            backgroundColor: tema.tarjetaSecundaria,
          },
        ]}
        resizeMode="cover"
        onError={() => setErrorCarga(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: tamano,
          height: tamano,
          borderRadius: radio,
          backgroundColor: tema.tarjetaSecundaria,
          borderColor: tema.bordeSuave,
        },
      ]}
    >
      <Text style={{ fontSize: Math.max(16, Math.round(tamano * 0.42)) }}>
        📦
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  imagen: {
    borderWidth: 1,
  },
  placeholder: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});