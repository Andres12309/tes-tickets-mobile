import { AppProvider } from "@/src/contexts/AppContext";
import { Tabs, useNavigation } from "expo-router";
import * as Updates from "expo-updates";
import { useEffect } from "react";
import { Alert } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function TabLayout() {
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

  const navigation = useNavigation();

  return (
    <AppProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="index"
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
