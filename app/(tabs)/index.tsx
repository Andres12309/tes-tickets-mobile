import React from "react";
import { SafeAreaView } from "react-native";
import TicketsScreen from "../../src/components/TicketsScreen";

export default function MarkTickets() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TicketsScreen />
    </SafeAreaView>
  );
}
