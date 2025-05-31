import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates"; // Importa expo-updates
import React, { useEffect } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TicketsScreen from "../src/components/TicketsScreen";
import { AppProvider } from "../src/contexts/AppContext";

export default function App() {
  // Efecto para verificar actualizaciones OTA
  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          // Notificar al usuario o recargar automáticamente:
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.error("Error en actualización OTA:", error);
      }
    };

    checkUpdates();
  }, []);

  return (
    <AppProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
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
