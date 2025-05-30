import React from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import TicketsScreen from "../../src/components/TicketsScreen";
import { AppProvider } from "../../src/contexts/AppContext";

export default function TicketsTab() {
  return (
    <AppProvider>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TicketsScreen />
      </KeyboardAvoidingView>
    </AppProvider>
  );
}
