import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../utils/colors';

interface LocationCardProps {
  latitude: number;
  longitude: number;
  locationName?: string;
}

const LocationCard: React.FC<LocationCardProps> = ({ latitude, longitude, locationName }) => {
  const handleOpenMap = () => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleOpenMap} activeOpacity={0.8}>
      <View style={styles.mapPreview}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={32} color={Colors.accent} />
          <Text style={styles.mapCoords}>
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </Text>
        </View>
      </View>
      <View style={styles.info}>
        <Ionicons name="location" size={16} color={Colors.accent} />
        <Text style={styles.locationName} numberOfLines={1}>
          {locationName || 'Shared Location'}
        </Text>
        <Ionicons name="open-outline" size={14} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glassBg,
    width: 200,
  },
  mapPreview: {
    height: 100,
    backgroundColor: Colors.secondaryBg || Colors.glassBg,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mapCoords: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  locationName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
});

export default LocationCard;
