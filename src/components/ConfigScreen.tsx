import React, { useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View, ActivityIndicator, TouchableOpacity } from "react-native";
import { updateApiInstance, getApiUrl } from "../services/api";
import { MaterialIcons } from "@expo/vector-icons";

const DEFAULT_API_URL = "https://tickets-api-production-bb7a.up.railway.app/api";

const ConfigScreen = ({ navigation }: { navigation: any }) => {
  const [apiUrl, setApiUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const currentUrl = await getApiUrl();
      setApiUrl(currentUrl === DEFAULT_API_URL ? "" : currentUrl);
    } catch (error) {
      console.error("Error al cargar la configuración:", error);
      Alert.alert("Error", "No se pudo cargar la configuración actual");
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!apiUrl.trim()) {
      Alert.alert("Error", "Por favor ingresa una URL válida");
      return;
    }

    setIsSaving(true);
    try {
      // Actualizar la URL en AsyncStorage y en la instancia de axios
      await updateApiInstance(apiUrl);
      Alert.alert(
        "¡Listo!",
        "La URL de la API ha sido actualizada correctamente",
        [
          {
            text: "Aceptar",
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error("Error al guardar la configuración:", error);
      Alert.alert("Error", "No se pudo actualizar la URL de la API");
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = async () => {
    try {
      setIsSaving(true);
      await updateApiInstance(DEFAULT_API_URL);
      setApiUrl("");
      Alert.alert(
        "Restablecido",
        "Se ha restablecido la URL de la API al valor por defecto",
        [
          {
            text: "Aceptar",
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error("Error al restablecer la configuración:", error);
      Alert.alert("Error", "No se pudo restablecer la configuración");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Configuración de la API</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>URL de la API</Text>
        <TextInput
          style={styles.input}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="https://tu-api.com"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          autoComplete="off"
        />
        <Text style={styles.helperText}>
          Deja en blanco para usar la URL por defecto
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={saveConfig}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Guardar Cambios</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={resetToDefault}
            disabled={isSaving}
          >
            <Text style={[styles.buttonText, styles.resetButtonText]}>
              Usar URL por Defecto
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    width: 40, // Mismo ancho que el botón de atrás para centrar el título
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
    color: '#333',
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  resetButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButtonText: {
    color: '#007AFF',
  },
});

export default ConfigScreen;
