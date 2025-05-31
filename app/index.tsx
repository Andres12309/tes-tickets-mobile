import React from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import TicketsScreen from "../src/components/TicketsScreen";
import { AppProvider } from "../src/contexts/AppContext";

export default function App() {
  return (
    <AppProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
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
