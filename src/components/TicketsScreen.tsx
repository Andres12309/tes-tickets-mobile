import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppContext } from "../contexts/AppContext";
import LoadingAnimado from "./LoadingAnimado";
import SyncButton from "./SyncButton";

const TicketsScreen = () => {
  const {
    user,
    periodo,
    isOnline,
    loading,
    errorMessage,
    showError,
    showSuccess,
    handleCrearTicket,
    speak,
    setShowError,
    setShowSuccess,
    handleGetPeriodo,
    preComidaActual,
    ticketsCount,
    isAppInitialized,
  } = useAppContext();

  const [code, setCode] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Efecto para manejar el enfoque de la pantalla
  useFocusEffect(
    React.useCallback(() => {
      // Resetear el código cuando la pantalla recibe foco
      setCode("");

      // Recargar el período actual
      handleGetPeriodo();

      // Establecer como inicializado después del primer render
      if (!isInitialized) {
        setIsInitialized(true);
      }

      return () => {
        // Limpieza si es necesario
      };
    }, [])
  );

  // Efecto para manejar éxito en la operación
  useEffect(() => {
    if (showSuccess) {
      // Reiniciar el código después de mostrar éxito
      setCode("");
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [showSuccess]);

  // Función para manejar la entrada de teclado numérico
  const handleKeyPress = (value: string) => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (value === "delete") {
      setCode("");
    } else if (value === "enter") {
      if (code.length > 0) {
        handleCrearTicket(code);
      }
    } else if (code.length < 10) {
      // Limitar la longitud del código
      setCode((prev) => prev + value);
    }
  };

  // Renderizar teclado numérico
  const renderNumericKeypad = () => {
    const keys = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["delete", "0", "enter"],
      ["V", "P", "E"],
      ["G", "X"],
    ];

    return (
      <View style={styles.keypadContainer}>
        {keys.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.keypadRow}>
            {row.map((key) => {
              let displayText = key;
              let onPress = () => handleKeyPress(key);
              let style = styles.key;
              let textStyle = styles.keyText;

              if (key === "delete") {
                displayText = "⌫";
                style = { ...style, backgroundColor: "#ff6b6b" };
                textStyle = { ...textStyle, fontSize: 24 };
              } else if (key === "enter") {
                displayText = "✓";
                style = {
                  ...style,
                  backgroundColor: code.length > 0 ? "#51cf66" : "#868e96",
                };
                textStyle = { ...textStyle, fontSize: 28, color: "white" };
                onPress =
                  code.length > 0 ? () => handleKeyPress("enter") : () => {};
              } else if (key === "V") {
                displayText = "V";
                style = {
                  ...style,
                  backgroundColor: "#4dabf7",
                };
              } else if (key === "P") {
                displayText = "P";
                style = { ...style, backgroundColor: "#f59e0b" };
              } else if (key === "E") {
                displayText = "E";
                style = { ...style, backgroundColor: "#10b981" };
              } else if (key === "G") {
                displayText = "G";
                style = { ...style, backgroundColor: "#8b5cf6" };
              } else if (key === "X") {
                displayText = "X";
                style = { ...style, backgroundColor: "#dc2626" };
              }

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    style,
                    key === "enter"
                      ? { opacity: code.length > 0 ? 1 : 0.6 }
                      : null,
                  ]}
                  onPress={onPress}
                  disabled={loading && key === "enter"}
                >
                  <Text style={textStyle}>{displayText}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  // Renderizar información del período actual
  const renderPeriodoInfo = () => {
    if (!periodo) {
      return (
        <View style={styles.periodoContainer}>
          <Text style={styles.periodoText}>Cargando período...</Text>
        </View>
      );
    }

    return (
      <View style={styles.periodoContainer}>
        <Text style={styles.periodoText}>
          {preComidaActual?.nombre || "Período actual"}
        </Text>
        <Text style={styles.periodoTime}>
          {preComidaActual?.hora_inicio} - {preComidaActual?.hora_fin}
        </Text>
      </View>
    );
  };

  // Renderizar estado de conexión
  const renderConnectionStatus = () => (
    <View
      style={[
        styles.statusContainer,
        { backgroundColor: isOnline ? "#51cf66" : "#ff6b6b" },
      ]}
    >
      <Text style={styles.statusText}>
        {isOnline ? "EN LÍNEA" : "SIN CONEXIÓN"}
      </Text>
    </View>
  );

  // Renderizar código ingresado
  const renderCodeInput = () => (
    <View style={styles.codeContainer}>
      <TextInput
        style={styles.codeText}
        value={code || "Ingrese su código"}
        inputMode="none"
        editable={false}
        autoFocus={true}
        onChangeText={(text) => {
          if (text.includes(" ")) {
            const parts = text.split(" ");
            if (parts.length > 1) {
              const c = parts[1];
              handleCrearTicket(c);
            }
          } else {
            if (text.length > 0) {
              handleCrearTicket(text);
            } else {
              setCode(text);
            }
          }
        }}
      />
    </View>
  );

  // Renderizar indicador de carga
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4dabf7" />
        <Text style={styles.loadingText}>Procesando...</Text>
      </View>
    );
  }

  // Mostrar un loading mientras se inicializa la app
  if (!isAppInitialized) {
    return <LoadingAnimado />;
  }

  return (
    <View style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.title}>Tickets</Text>
        {renderConnectionStatus()}
      </View>

      <View
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          alignContent:"space-between",
          padding: 2,
          marginBottom: 10,
        }}
      >
        {/* Información del período */}
        {renderPeriodoInfo()}
        <SyncButton />
      </View>

      {/* Contador de tickets */}
      {/* {renderTicketsCount()} */}

      {/* Código ingresado */}
      {renderCodeInput()}

      {/* Teclado numérico */}
      {renderNumericKeypad()}

      {/* Mensaje de éxito */}
      {showSuccess && user ? (
        <View style={styles.successContainer}>
          <MaterialIcons name="check-circle" size={64} color="#51cf66" />
          <Text style={styles.successText}>¡Ticket registrado!</Text>
          <Text style={styles.userText}>
            {user.nombres} {user.apellidos}
          </Text>
        </View>
      ) : (
        showSuccess && (
          <View style={styles.successContainer}>
            <MaterialIcons name="info" size={64} color="#F44336" />
            <Text style={styles.errorText}>
              ¡Ya separo {preComidaActual?.nombre}!
            </Text>
          </View>
        )
      )}
      {errorMessage && errorMessage.length > 0 && showError && (
        <View style={styles.successContainer}>
          <MaterialIcons name="error" size={64} color="#F44336" />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Text style={styles.userText}>
            {user ? `${user.nombres} ${user.apellidos}` : errorMessage[1]}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212529",
  },
  statusContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statusText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  periodoContainer: {
    alignItems: "center",
  },
  periodoText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 4,
  },
  periodoTime: {
    fontSize: 16,
    color: "#495057",
  },
  counterContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  counterText: {
    fontSize: 18,
    color: "#495057",
  },
  codeContainer: {
    height: 80,
    backgroundColor: "white",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  codeText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#212529",
    letterSpacing: 2,
  },
  keypadContainer: {
    marginTop: "auto",
    marginBottom: 32,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  key: {
    width: "30%",
    aspectRatio: 1.5,
    backgroundColor: "white",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  keyText: {
    fontSize: 28,
    color: "#212529",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#495057",
  },
  successContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  successText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2b8a3e",
    marginTop: 16,
  },
  errorText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#dc3545",
    marginTop: 16,
  },
  userText: {
    fontSize: 20,
    color: "#495057",
    marginTop: 8,
  },
});

export default TicketsScreen;
