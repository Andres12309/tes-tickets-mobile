import { useAppContext } from "@/src/contexts/AppContext";
import { ticketDb } from "@/src/services/database";
import { Ticket } from "@/src/types/database";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface TicketWithUser extends Ticket {
  nombres?: string;
  apellidos?: string;
  comida?: string;
  code?: string;
}

export default function TicketsScreen() {
  const { tickets, handleGetTickets } = useAppContext();
  const [localTickets, setLocalTickets] = useState<TicketWithUser[]>([]);

  // Cargar tickets locales al enfocar la pantalla
  useFocusEffect(
    React.useCallback(() => {
      loadLocalTickets();
      return () => {}; // Limpieza opcional
    }, [])
  );

  const loadLocalTickets = async () => {
    try {
      const allTickets = await ticketDb.getAllTickets();
      // Ensure we're setting properly typed data
      setLocalTickets(allTickets as TicketWithUser[]);
    } catch (error) {
      console.log("Error al cargar tickets locales:", error);
    }
  };

  const handleDeleteTicket = async (ticket: TicketWithUser) => {
    if (!ticket.uuid4) {
      Alert.alert("Error", "No se puede eliminar el ticket: ID no válido");
      return;
    }

    if (!ticket.sync_pending) {
      Alert.alert(
        "No se puede eliminar",
        "Este ticket ya ha sido sincronizado con el servidor."
      );
      return;
    }

    Alert.alert(
      "Eliminar Ticket",
      `¿Está seguro de que desea eliminar el ticket con código de usuario: ${ticket.code}? Esta acción no se puede deshacer.`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await ticketDb.deleteTicketByUuid(ticket.uuid4);
              await loadLocalTickets();
              if (handleGetTickets) {
                await handleGetTickets();
              }
            } catch (error) {
              // console.error("Error al eliminar ticket:", error);
              Alert.alert("Error", "No se pudo eliminar el ticket.");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: TicketWithUser }) => {
    return (
      <View style={styles.ticketItem}>
        <View style={styles.ticketInfo}>
          <Text style={styles.ticketUser}>
            {item.nombres || "Usuario"} {item.apellidos || ""} - {" "}
            {item.code || "Código no disponible"}
          </Text>
          <Text style={styles.ticketDate}>
            {item.create_at
              ? new Date(item.create_at).toLocaleString()
              : "Fecha no disponible"}
          </Text>
          <Text style={styles.ticketComida}>
            {item.comida || "Comida no especificada"}
          </Text>
          {item.sync_pending ? (
            <Text style={styles.syncPendingText}>Pendiente de sincronizar</Text>
          ) : (
            <Text style={styles.syncedText}>Sincronizado</Text>
          )}
        </View>
        {item.sync_pending && item.uuid4 && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteTicket(item)}
          >
            <MaterialIcons name="delete" size={24} color="#ff6b6b" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Tickets Registrados</Text>
      {localTickets.length > 0 ? (
        <FlatList
          data={localTickets}
          keyExtractor={(item) => item.uuid4}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay tickets registrados</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#212529",
  },
  listContainer: {
    paddingBottom: 20,
  },
  ticketItem: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  ticketInfo: {
    flex: 1,
  },
  ticketUser: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 4,
  },
  ticketDate: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
  },
  ticketComida: {
    fontSize: 14,
    color: "#4dabf7",
    fontWeight: "500",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6c757d",
  },
  syncPendingText: {
    color: "#ff6b6b",
    fontSize: 12,
    marginTop: 4,
  },
  syncedText: {
    color: "#4caf50",
    fontSize: 12,
    marginTop: 4,
  },
});
