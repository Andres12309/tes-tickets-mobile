import { AppProvider } from "@/src/contexts/AppContext";
import { Tabs } from "expo-router";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function TabLayout() {
  return (
    <AppProvider>
      <Tabs
        screenOptions={{ headerShown: false }}
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
      </Tabs>
    </AppProvider>
  );
}
