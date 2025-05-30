import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { AppProvider } from './src/contexts/AppContext';
import TicketsScreen from './src/components/TicketsScreen';

// Configuración del tema
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1a73e8',
    secondary: '#f1c40f',
    error: '#d32f2f',
    background: '#f8f9fa',
    surface: '#ffffff',
    text: '#212529',
    onSurface: '#212529',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#4285f4',
    secondary: '#fbbc04',
    error: '#f44336',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#e1e1e1',
    onSurface: '#e1e1e1',
  },
};

// Tipos de navegación
type RootStackParamList = {
  Tickets: undefined;
  // Agregar más pantallas según sea necesario
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Componente principal de la aplicación
const App = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <AppProvider>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <NavigationContainer theme={{
            dark: colorScheme === 'dark',
            colors: {
              primary: theme.colors.primary,
              background: theme.colors.background,
              card: theme.colors.surface,
              text: theme.colors.text,
              border: theme.colors.outline,
              notification: theme.colors.error,
            },
          }}>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background },
              }}
            >
              <Stack.Screen name="Tickets" component={TicketsScreen} />
              {/* Agregar más pantallas aquí */}
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    </AppProvider>
  );
};

export default App;
