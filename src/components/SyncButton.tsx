import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppContext } from '../contexts/AppContext';

const SyncButton = () => {
  const { syncTickets, isSyncing, syncStats } = useAppContext();

  const handleSync = async () => {
    if (!isSyncing) {
      await syncTickets(true);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]} 
        onPress={handleSync}
        disabled={isSyncing}
      >
        {isSyncing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Icon name="sync" size={24} color="#fff" />
        )}
      </TouchableOpacity>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total:</Text>
          <Text style={styles.statValue}>{syncStats.total}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, styles.pendingText]}>Pendientes:</Text>
          <Text style={[styles.statValue, styles.pendingText]}>{syncStats.pending}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, styles.syncedText]}>Sincronizados:</Text>
          <Text style={[styles.statValue, styles.syncedText]}>{syncStats.synced}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    margin: 10,
    elevation: 2,
  },
  syncButton: {
    backgroundColor: '#2196F3',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  syncButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  statsContainer: {
    marginLeft: 15,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
    gap: 10,
  },
  statLabel: {
    fontSize: 14,
    color: '#333',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#333',
  },
  pendingText: {
    color: '#FF5722',
  },
  syncedText: {
    color: '#4CAF50',
  },
});

export default SyncButton;
