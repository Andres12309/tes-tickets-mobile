import React from 'react';
import { SafeAreaView } from 'react-native';
import TicketsScreen from '../../../src/components/TicketsScreen';
import { AppProvider } from '../../../src/contexts/AppContext';

export default function TicketsTab() {
  return (
    <AppProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <TicketsScreen />
      </SafeAreaView>
    </AppProvider>
  );
}
