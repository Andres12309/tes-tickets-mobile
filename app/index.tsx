import { useColorScheme } from "@/hooks/useColorScheme";
import { DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import React, { useEffect } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TicketsScreen from "../src/components/TicketsScreen";
import { AppProvider } from "../src/contexts/AppContext";

export default function App() {
  const colorScheme = useColorScheme();

  // Efecto mejorado para actualizaciones
  useEffect(() => {
    const handleUpdate = async () => {
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
        console.error("Error en OTA:", error);
        Alert.alert("Error", `No se pudo actualizar: ${error.message}`);
      }
    };

    // Verificar cada 30 minutos
    handleUpdate();
    const interval = setInterval(handleUpdate, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AppProvider>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor:
            colorScheme === "dark" ? DarkTheme.colors.background : "#fff",
        }}
      >
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TicketsScreen />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppProvider>
  );
}
