import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../utils/colors';
import { checkOnlineStatus } from '../../services/dataService';

const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    const check = async () => {
      const online = await checkOnlineStatus();
      setIsOffline(!online);
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, slideAnim]);

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
      pointerEvents={isOffline ? 'auto' : 'none'}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={Colors.textPrimary} />
      <Text style={styles.text}>You are offline — some features may be unavailable</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: Colors.alertRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
    flex: 1,
  },
});

export default OfflineBanner;
