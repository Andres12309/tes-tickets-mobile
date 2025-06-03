import ConfigScreen from "@/src/components/ConfigScreen";
import { useNavigation } from "expo-router";
import React from "react";
import { View } from "react-native";

export default function ConfigPage() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1 }}>
      <ConfigScreen navigation={navigation} />
    </View>
  );
}
