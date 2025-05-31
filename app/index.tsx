import { useColorScheme } from "@/hooks/useColorScheme";
import { DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates"; // Importa expo-updates
import React, { useEffect } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TicketsScreen from "../src/components/TicketsScreen";
import { AppProvider } from "../src/contexts/AppContext";

export default function App() {
  const colorScheme = useColorScheme();
  // Efecto para verificar actualizaciones OTA
  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          // Notificar al usuario o recargar automáticamente:
          await Updates.reloadAsync();
          Alert.alert(
            "Actualización disponible",
            "La aplicación se ha actualizado correctamente."
          );
        }
      } catch (error: any) {
        Alert.alert("Error en actualización OTA:", error.message);
      }
    };

    checkUpdates();
  }, []);

  return (
    <AppProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colorScheme === "dark" ? DarkTheme.colors.background : "#fff" }}>
          <StatusBar style="auto" />
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
