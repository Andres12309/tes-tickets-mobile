import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const CONFIG_KEY = '@app_config';

export const useApiConfig = () => {
  const [apiUrl, setApiUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await AsyncStorage.getItem(CONFIG_KEY);
      if (config) {
        const { apiUrl: savedUrl } = JSON.parse(config);
        setApiUrl(savedUrl || '');
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading API config:', error);
      setIsLoading(false);
    }
  };

  return { apiUrl, isLoading };
};