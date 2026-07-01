import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { STORAGE_KEYS } from './src/utils/constants';

// Once-cleanup: remove all old seed/dummy data from AsyncStorage
const SEED_CLEANUP_KEY = '@paaswala_seed_cleanup_done';
const SEED_KEYS = [
  STORAGE_KEYS.SEED_DONE,
  STORAGE_KEYS.POSTS,
  STORAGE_KEYS.COMMENTS,
  STORAGE_KEYS.CHATS,
  STORAGE_KEYS.MESSAGES,
  STORAGE_KEYS.CHAT_REQUESTS,
  STORAGE_KEYS.EVENTS,
  STORAGE_KEYS.POLLS,
  STORAGE_KEYS.ALERTS,
  STORAGE_KEYS.BUSINESSES,
  STORAGE_KEYS.LISTINGS,
  STORAGE_KEYS.LOST_FOUND,
  STORAGE_KEYS.NOTIFICATIONS,
  STORAGE_KEYS.ADMIN_PENDING,
  STORAGE_KEYS.ADMIN_REPORTS,
];

async function clearSeedData() {
  try {
    const done = await AsyncStorage.getItem(SEED_CLEANUP_KEY);
    if (done === 'true') return;
    await AsyncStorage.multiRemove(SEED_KEYS);
    await AsyncStorage.setItem(SEED_CLEANUP_KEY, 'true');
    console.log('[App] Seed data cleared');
  } catch (err) {
    console.warn('[App] Seed cleanup failed:', err);
  }
}

export default function App() {
  useEffect(() => { clearSeedData(); }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.root}>
        <SafeAreaProvider>
          <AuthProvider>
            <ThemeProvider>
              <LanguageProvider>
                <StatusBar style="light" />
                <AppNavigator />
              </LanguageProvider>
            </ThemeProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
