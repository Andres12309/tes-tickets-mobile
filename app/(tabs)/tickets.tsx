import { useAppContext } from "@/src/contexts/AppContext";
import { ticketDb } from "@/src/services/database";
import { Ticket } from "@/src/types/database";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
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
  const [searchCode, setSearchCode] = useState("");
  const [searchName, setSearchName] = useState("");
  const [showPendingOnly, setShowPendingOnly] = useState(false);

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
            {`${item.nombres || "Usuario"} ${item.apellidos || ""} - ${item.code || "Código no disponible"}`}
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

  // Filter tickets based on search criteria and sync status
  const filteredTickets = useMemo(() => {
    return localTickets.filter(ticket => {
      const matchesCode = !searchCode || 
        (ticket.code && ticket.code.toLowerCase().includes(searchCode.toLowerCase()));
      
      const fullName = `${ticket.nombres || ''} ${ticket.apellidos || ''}`.toLowerCase();
      const matchesName = !searchName || 
        fullName.includes(searchName.toLowerCase());
      
      const matchesSyncStatus = !showPendingOnly || ticket.sync_pending;
      
      return matchesCode && matchesName && matchesSyncStatus;
    });
  }, [localTickets, searchCode, searchName, showPendingOnly]);

  const clearFilters = () => {
    setSearchCode('');
    setSearchName('');
    setShowPendingOnly(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Tickets Registrados</Text>
        
        {/* Search Filters */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <MaterialIcons name="search" size={20} color="#6c757d" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por código..."
                value={searchCode}
                onChangeText={setSearchCode}
                placeholderTextColor="#6c757d"
              />
              {searchCode ? (
                <TouchableOpacity onPress={() => setSearchCode('')} style={styles.clearButton}>
                  <MaterialIcons name="close" size={18} color="#6c757d" />
                </TouchableOpacity>
              ) : null}
            </View>
            
            <View style={[styles.searchInputContainer, { marginTop: 8 }]}>
              <MaterialIcons name="person-search" size={20} color="#6c757d" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre..."
                value={searchName}
                onChangeText={setSearchName}
                placeholderTextColor="#6c757d"
              />
              {searchName ? (
                <TouchableOpacity onPress={() => setSearchName('')} style={styles.clearButton}>
                  <MaterialIcons name="close" size={18} color="#6c757d" />
                </TouchableOpacity>
              ) : null}
            </View>
            
            <View style={styles.filtersRow}>
              <TouchableOpacity 
                onPress={() => setShowPendingOnly(!showPendingOnly)}
                style={[styles.filterButton, showPendingOnly && styles.filterButtonActive]}
              >
                <MaterialIcons 
                  name={showPendingOnly ? "sync-problem" : "sync"} 
                  size={18} 
                  color={showPendingOnly ? "#fff" : "#4dabf7"} 
                />
                <Text style={[styles.filterButtonText, showPendingOnly && styles.filterButtonTextActive]}>
                  {showPendingOnly ? "Ocultar pendientes" : "Ver pendientes"}
                </Text>
                {showPendingOnly && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>
                      {localTickets.filter(t => t.sync_pending).length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              
              {(searchCode || searchName || showPendingOnly) && (
                <TouchableOpacity 
                  onPress={clearFilters} 
                  style={[styles.clearAllButton, { marginLeft: 8 }]}
                >
                  <Text style={styles.clearAllText}>Limpiar filtros</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        
        {/* Results count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsCount}>
            {filteredTickets.length} {filteredTickets.length === 1 ? 'resultado' : 'resultados'}
          </Text>
        </View>
        
        {filteredTickets.length > 0 ? (
          <FlatList
            data={filteredTickets}
            keyExtractor={(item) => item.uuid4}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={48} color="#adb5bd" />
            <Text style={styles.emptyText}>No se encontraron tickets</Text>
            {(searchCode || searchName) && (
              <TouchableOpacity onPress={clearFilters} style={styles.tryAgainButton}>
                <Text style={styles.tryAgainText}>Limpiar búsqueda</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  searchSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#212529",
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#212529',
  },
  clearButton: {
    padding: 4,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    flexWrap: 'wrap',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4dabf7',
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    backgroundColor: '#4dabf7',
  },
  filterButtonText: {
    marginLeft: 6,
    color: '#4dabf7',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  pendingBadge: {
    marginLeft: 6,
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clearAllButton: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  clearAllText: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: '500',
  },
  resultsContainer: {
    marginBottom: 12,
  },
  resultsCount: {
    color: '#6c757d',
    fontSize: 14,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#6c757d",
    marginTop: 16,
    textAlign: 'center',
  },
  syncPendingText: {
    color: "#ff6b6b",
    fontSize: 12,
    marginTop: 4,
  },
  tryAgainButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
  },
  tryAgainText: {
    color: '#4dabf7',
    fontWeight: '500',
  },
  syncedText: {
    color: "#51cf66",
    fontSize: 12,
    marginTop: 4,
  },
});
