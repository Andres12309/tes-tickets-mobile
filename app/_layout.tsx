import { useColorScheme } from "@/hooks/useColorScheme.web";
import { DarkTheme } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as Updates from "expo-updates";
import React, { useEffect } from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const handleUpdate = async () => {
      if (!navigator.onLine) return;
      try {
        // Solo en producción/preview
        if (__DEV__) return;

        console.log("Verificando actualizaciones...");
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          console.log("Descargando actualización...");
          await Updates.fetchUpdateAsync();

          Alert.alert("Actualización disponible", "Se aplicará en 5 segundos", [
            { text: "OK" },
          ]);

          // Recargar después de 5 segundos
          setTimeout(() => {
            Updates.reloadAsync();
          }, 5000);
        }
      } catch (error: any) {
        //console.error("Error en OTA:", error);
        Alert.alert("Error", `No se pudo actualizar: ${error.message}`);
      }
    };

    // Verificar cada 30 minutos
    handleUpdate();
    const interval = setInterval(handleUpdate, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor:
          colorScheme === "dark" ? DarkTheme.colors.background : "#fff",
      }}
    >
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </SafeAreaView>
  );
}
