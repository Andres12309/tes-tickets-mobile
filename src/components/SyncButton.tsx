import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, useTheme } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useAppContext } from "../contexts/AppContext";
import CircularProgress from "./CircularProgress";

const SyncButton = () => {
  const { syncTickets, isSyncing, syncStats, syncProgress } = useAppContext();

  const theme = useTheme();
  const [showProgress, setShowProgress] = useState(false);
  const spinValue = new Animated.Value(0);

  // Calculate progress based on sync progress
  const progress = useMemo(() => {
    if (syncProgress.status === "idle") return 0;
    if (syncProgress.total <= 0) return 0;
    return Math.min(100, (syncProgress.current / syncProgress.total) * 100);
  }, [syncProgress]);

  // Show progress when syncing starts
  useEffect(() => {
    if (isSyncing) {
      setShowProgress(true);
    }
  }, [isSyncing]);

  // Handle sync button press
  const handleSync = async () => {
    if (!isSyncing) {
      setShowProgress(true);
      try {
        await syncTickets(true);
      } finally {
        // Keep showing progress until sync is complete
        if (!isSyncing) {
          setShowProgress(false);
        }
      }
    }
  };

  // Animation for the sync icon
  useEffect(() => {
    if (isSyncing) {
      // Start rotation animation
      spinValue.setValue(0);
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // Stop animation when not syncing
      spinValue.stopAnimation();

      // Hide progress shortly after sync completes
      const timer = setTimeout(() => setShowProgress(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing]);

  // Interpolate rotation value
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
        onPress={handleSync}
        disabled={isSyncing}
      >
        {showProgress ? (
          <CircularProgress
            size={36}
            progress={progress}
            strokeWidth={3}
            backgroundColor={theme.colors.surfaceVariant}
            progressColor={theme.colors.primary}
            showText={true}
            textColor="#fff"
          />
        ) : (
          <Animated.View
            style={{ transform: [{ rotate: isSyncing ? spin : "0deg" }] }}
          >
            <Icon name="sync" size={24} color="#fff" />
          </Animated.View>
        )}
      </TouchableOpacity>

      <View style={styles.statsContainer}>
        {syncProgress.status !== "idle" &&
          syncProgress.status !== "completed" && (
            <Text style={styles.statusText} numberOfLines={1}>
              {syncProgress.message}
            </Text>
          )}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total:</Text>
            <Text style={styles.statValue}>{syncStats.total}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, styles.pendingText]}>
              Pendientes:
            </Text>
            <Text style={[styles.statValue, styles.pendingText]}>
              {syncStats.pending}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, styles.syncedText]}>
              Sincronizados:
            </Text>
            <Text style={[styles.statValue, styles.syncedText]}>
              {syncStats.synced}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    padding: 5,
    borderRadius: 8,
    elevation: 2,
  },
  syncButton: {
    backgroundColor: "#2196F3",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  syncButtonDisabled: {
    backgroundColor: "#90CAF9",
  },

  statsContainer: {
    maxWidth: 200,
    marginLeft: 12,
  },
  statusText: {
    color: "#000",
    fontSize: 12,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: "column",
    justifyContent: "space-between",
  },
  statItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
    gap: 10,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 14,
    color: "#333",
  },
  statValue: {
    fontWeight: "bold",
    color: "#333",
  },
  pendingText: {
    color: "#FF5722",
  },
  syncedText: {
    color: "#4CAF50",
  },
});

export default SyncButton;
