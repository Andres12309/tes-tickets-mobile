import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

const LoadingAnimado = () => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animación de barra
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
          easing: Easing.linear,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Animación de rotación de reloj
    Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotateInterpolate = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const translateXInterpolate = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-100%", "100%"],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
        <MaterialIcons name="hourglass-empty" size={64} color="#4dabf7" />
      </Animated.View>
      <Text style={styles.text}>Inicializando aplicación...</Text>

      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressIndicator,
            { transform: [{ translateX: translateXInterpolate }] },
          ]}
        />
      </View>
      <Text style={styles.loadingTip}>
        💡 Consejo: ¡Ten tu código listo para agilizar el ingreso!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 18,
    color: "#343a40",
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    width: "80%",
    backgroundColor: "#dee2e6",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 24,
    marginBottom: 24,
  },
  progressIndicator: {
    height: "100%",
    width: "60%",
    backgroundColor: "#4dabf7",
    borderRadius: 4,
  },
  loadingTip: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#748ffc",
  },
});

export default LoadingAnimado;
