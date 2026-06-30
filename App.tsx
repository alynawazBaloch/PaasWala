import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
export default function App() {
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
