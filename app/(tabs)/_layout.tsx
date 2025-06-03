import { AppProvider } from "@/src/contexts/AppContext";
import { Tabs } from "expo-router";
import * as Updates from "expo-updates";
import { useEffect } from "react";
import { Alert } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function TabLayout() {
  useEffect(() => {
    const handleUpdate = async () => {
      if (__DEV__) return; // Solo en producción
      if (!navigator.onLine) return; // Requiere conexión

      try {
        console.log("🔄 Verificando actualizaciones...");
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          console.log("⬇️ Descargando actualización...");
          await Updates.fetchUpdateAsync();

          Alert.alert(
            "Actualización disponible",
            "Se aplicará automáticamente en 5 segundos.",
            [{ text: "OK" }]
          );

          setTimeout(() => {
            Updates.reloadAsync();
          }, 5000);
        }
      } catch (error: any) {
        // console.warn("❌ Error al buscar actualizaciones:", error);
        Alert.alert("Error", `No se pudo actualizar: ${error.message}`);
      }
    };

    // Verifica al montar y luego cada 30 minutos
    handleUpdate();
    const intervalId = setInterval(handleUpdate, 30 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [navigator.onLine]);

  return (
    <AppProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        // initialRouteName="index"
      >
        <Tabs.Screen
          name="index"
          options={{
            headerShown: false,
            tabBarLabel: "Marcar Tickets",
            tabBarIcon: ({ color }) => (
              <Icon name="keyboard" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tickets"
          options={{
            headerShown: false,
            tabBarLabel: "Tickets Marcados",
            tabBarIcon: ({ color }) => (
              <Icon name="check-circle" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="config"
          options={{
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <Icon name="cog" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
    </AppProvider>
  );
}
