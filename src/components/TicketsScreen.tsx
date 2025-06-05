import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import appConfig from "../../app.json";
import { useAppContext } from "../contexts/AppContext";
import { ticketDb } from "../services/database";
import { TicketWithUser } from "../types/database";
import LoadingAnimado from "./LoadingAnimado";
import SyncButton from "./SyncButton";

// Get the app version from app.json
const appVersion = appConfig.expo.version || "1.0.2";
const appRutineVersion = appConfig.expo.runtimeVersion.policy || "1.0.0";

const TicketsScreen = () => {
  const {
    user,
    usuariosNomina,
    periodo,
    isOnline,
    loading,
    errorMessage,
    showError,
    showSuccess,
    handleCrearTicket,
    handleGetPeriodo,
    handleGetNomina,
    preComidaActual,
    isAppInitialized,
    syncStats,
  } = useAppContext();

  const inputRef = useRef(null);
  const [code, setCode] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const [showRecentTickets, setShowRecentTickets] = useState(false);
  const [recentTickets, setRecentTickets] = useState<TicketWithUser[]>([]);

  // Efecto para manejar el enfoque de la pantalla
  useFocusEffect(
    React.useCallback(() => {
      // Resetear el código cuando la pantalla recibe foco
      setCode("");

      // Recargar el período actual
      // handleGetPeriodo();

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

  const loadRecentTickets = async () => {
    try {
      const tickets = await ticketDb.getRecentTickets(10);
      setRecentTickets(tickets as TicketWithUser[]);
    } catch (error) {
      // console.log("Error al cargar tickets recientes:", error);
      setRecentTickets([]);
    }
  };

  useEffect(() => {
    loadRecentTickets();
  }, [code, showSuccess]);

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
      ["V", "P", "E", "G"], // Letras en una sola fila
    ];

    return (
      <View style={styles.keypadContainer}>
        {keys.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.keypadRow}>
            {row.map((key) => {
              let displayText = key;
              let onPress = () => handleKeyPress(key);
              // Crear un nuevo objeto de estilo para evitar mutaciones directas
              const buttonStyle = { ...styles.key };
              const buttonTextStyle = { ...styles.keyText };

              if (key === "delete") {
                displayText = "⌫";
                Object.assign(buttonStyle, { backgroundColor: "#ff6b6b" });
                Object.assign(buttonTextStyle, { fontSize: 24 });
              } else if (key === "enter") {
                displayText = "✓";
                const enterBgColor = code.length > 0 ? "#51cf66" : "#868e96";
                Object.assign(buttonStyle, { backgroundColor: enterBgColor });
                Object.assign(buttonTextStyle, {
                  fontSize: 28,
                  color: "white",
                });
                onPress =
                  code.length > 0 ? () => handleKeyPress("enter") : () => {};
              } else if (key === "V") {
                displayText = "V";
                Object.assign(buttonStyle, { backgroundColor: "#4dabf7" });
              } else if (key === "P") {
                displayText = "P";
                Object.assign(buttonStyle, { backgroundColor: "#f59e0b" });
              } else if (key === "E") {
                displayText = "E";
                Object.assign(buttonStyle, { backgroundColor: "#10b981" });
              } else if (key === "G") {
                displayText = "G";
                Object.assign(buttonStyle, { backgroundColor: "#8b5cf6" });
              }

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    buttonStyle,
                    key === "enter"
                      ? { opacity: code.length > 0 ? 1 : 0.6 }
                      : null,
                  ]}
                  onPress={onPress}
                  disabled={loading && key === "enter"}
                >
                  <Text style={buttonTextStyle}>{displayText}</Text>
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
          <Text style={styles.periodoText}>Sin período! </Text>
        </View>
      );
    }

    return (
      <View style={styles.periodoContainer}>
        {preComidaActual?.nombre ? (
          <Text style={styles.periodoText}>{preComidaActual?.nombre}</Text>
        ) : (
          <Text
            style={{
              fontSize: 12,
              fontWeight: "bold",
              color: "#dc3545",
              textAlign: "center",
              padding: 5,
              backgroundColor: "#f8d7da",
              borderRadius: 8,
              elevation: 5,
            }}
          >
            No es hora de comida
          </Text>
        )}
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
        value={code}
        inputMode="none"
        ref={inputRef}
        autoFocus
        onChangeText={(text) => {
          const partes = text.trim().split(/\s+/);
          let extractedCode = partes[1];

          if (extractedCode) {
            if (/^\d+$/.test(extractedCode)) {
              extractedCode = extractedCode.replace(/^0+/, "");
            }

            handleCrearTicket(extractedCode);
          } else {
            setCode(text);
          }
        }}
      />
    </View>
  );

  const toggleRecentTickets = () => {
    setShowRecentTickets(!showRecentTickets);
  };

  // Renderizar el listado de tickets recientes
  const renderRecentTickets = () => (
    <View style={styles.recentTicketsContainer}>
      <View style={styles.recentTicketsHeader}>
        <Text style={styles.recentTicketsTitle}>Recientes</Text>
        <TouchableOpacity
          onPress={toggleRecentTickets}
          style={styles.closeButton}
        >
          <MaterialIcons name="close" size={24} color="#6c757d" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={recentTickets}
        keyExtractor={(item) => item.uuid4}
        renderItem={({ item }) => (
          <View style={styles.recentTicketItem}>
            <View style={styles.recentTicketIcon}>
              <MaterialIcons
                name="confirmation-number"
                size={20}
                color="#4dabf7"
              />
            </View>
            <View style={styles.recentTicketInfo}>
              <Text style={styles.recentTicketCode}>
                {item.code || "Sin código"}
              </Text>
              <Text style={styles.recentTicketName}>
                {item.nombres || "Usuario"} {item.apellidos || ""}
              </Text>
              <Text style={styles.recentTicketTime}>
                {item.create_at
                  ? new Date(item.create_at).toLocaleTimeString()
                  : ""}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.recentTicketsList}
      />
    </View>
  );

  // Cargando minetras se obtiene la información
  if (loading) {
    return (
      <LoadingAnimado
        message="Sincronizando..."
        tip="💡 Consejo: ¡Ten tu código listo para agilizar el ingreso!"
      />
    );
  }

  // Mostrar un loading mientras se inicializa la app
  if (!isAppInitialized) {
    return (
      <LoadingAnimado
        message="Inicializando aplicación..."
        tip="💡 Consejo: ¡Ten tu código listo para agilizar el ingreso!"
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.versionText}>v{appVersion}</Text>
      {/* Encabezado */}
      <View style={styles.header}>
        <View style={styles.titleWithCounter}>
          <Text style={styles.title}>Tickets</Text>
          <View style={styles.ticketCounter}>
            <Text style={styles.ticketCounterText}>{syncStats.total}</Text>
          </View>
        </View>
        <View style={styles.syncGroup}>
          <TouchableOpacity
            onPress={toggleRecentTickets}
            style={styles.showRecentButton}
          >
            <MaterialIcons name="history" size={24} color="#4dabf7" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.syncButton, loading && styles.syncButtonDisabled]}
            onPress={() => handleGetPeriodo(false)}
            disabled={loading}
          >
            <Text style={styles.statusText}>
              <Icon name="sync" size={15} color="#fff" />
              Periodo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.syncButton, loading && styles.syncButtonDisabled]}
            onPress={() => handleGetNomina(false)}
            disabled={loading}
          >
            <Text style={styles.statusText}>
              <Icon name="sync" size={15} color="#fff" />
              Nómina {usuariosNomina.length}
            </Text>
          </TouchableOpacity>
          {renderConnectionStatus()}
        </View>
      </View>

      <View
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          alignContent: "space-between",
          padding: 2,
          marginBottom: 10,
          width: "100%",
        }}
      >
        {/* Información del período */}
        {renderPeriodoInfo()}
        <SyncButton />
      </View>

      {/* Contador de tickets */}
      {/* {renderTicketsCount()} */}
      <View style={styles.centeredContent}>
        {/* Código ingresado */}
        {renderCodeInput()}

        {/* Teclado numérico */}
        {showRecentTickets && renderRecentTickets()}
        {!showRecentTickets && renderNumericKeypad()}
      </View>

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
    paddingVertical: 20,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    marginTop: 5,
    width: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#212529",
  },
  titleWithCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  ticketCounter: {
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  ticketCounterText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
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
  codeContainer: {
    height: 80,
    width: "100%",
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
    marginTop: 10,
    display: "flex",
    justifyContent: "center",
    alignSelf: "center",
    width: "100%",
  },
  centeredContent: {
    width: "100%",
    maxWidth: 400,
    marginTop: "auto",
    alignItems: "center",
    justifyContent: "center",
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  key: {
    flex: 1,
    width: "30%",
    margin: 5,
    aspectRatio: 1.5,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#e9ecef",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  keyText: {
    fontSize: 22,
    fontWeight: "600",
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
  syncGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
  },
  syncButton: {
    backgroundColor: "grey",
    maxWidth: 120,
    height: 30,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  syncButtonDisabled: {
    backgroundColor: "#90CAF9",
  },
  // Recent tickets styles
  recentTicketsContainer: {
    marginTop: 10,
    display: "flex",
    justifyContent: "center",
    alignSelf: "center",
    width: "100%",
    height: 450,
  },
  recentTicketsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  recentTicketsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#495057",
  },
  closeButton: {
    padding: 5,
  },
  recentTicketsList: {
    padding: 10,
  },
  recentTicketItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  recentTicketIcon: {
    marginRight: 10,
  },
  recentTicketInfo: {
    flex: 1,
  },
  recentTicketCode: {
    fontWeight: "bold",
    fontSize: 16,
  },
  recentTicketName: {
    fontSize: 14,
    color: "#6c757d",
  },
  recentTicketTime: {
    fontSize: 12,
    color: "#adb5bd",
  },
  showRecentButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f1f3f5",
    borderRadius: 20,
    marginLeft: 10,
  },
  versionText: {
    position: "absolute",
    top: 5,
    right: 10,
    color: "#666",
    fontSize: 12,
  },
});

export default TicketsScreen;
