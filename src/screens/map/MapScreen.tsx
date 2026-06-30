import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import CategoryChip from '../../components/shared/CategoryChip';
import Colors from '../../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MOCK_PINS = [
  { id: '1', title: 'Community Garden', type: 'park', lat: 31.481120, lng: 74.314970 },
  { id: '2', title: 'Local Market', type: 'market', lat: 31.482220, lng: 74.316370 },
  { id: '3', title: 'Playground', type: 'play', lat: 31.480520, lng: 74.315470 },
  { id: '4', title: 'Library', type: 'library', lat: 31.482820, lng: 74.313870 },
  { id: '5', title: 'Sports Complex', type: 'fitness', lat: 31.481720, lng: 74.317270 },
  { id: '6', title: 'Coffee Shop', type: 'cafe', lat: 31.480920, lng: 74.315770 },
];

const FILTER_CHIPS = ['All', 'Parks', 'Markets', 'Services', 'Eateries', 'Sports'];

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  park: 'leaf',
  market: 'cart',
  play: 'game-controller',
  library: 'library',
  fitness: 'fitness',
  cafe: 'cafe',
};

const DEFAULT_REGION: Region = {
  latitude: 31.481120,
  longitude: 74.314970,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const MapScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedPin, setSelectedPin] = useState<typeof MOCK_PINS[0] | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[MapScreen] Location permission not granted:', status);
          return;
        }
        setLocationPermission(true);
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const userRegion: Region = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        setRegion(userRegion);
        setUserLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      } catch (err) {
        console.warn('[MapScreen] Location fetch failed:', err);
      }
    })();
  }, []);

  const handlePinPress = (pin: typeof MOCK_PINS[0]) => {
    setSelectedPin(pin);
  };

  const handleClosePreview = () => {
    setSelectedPin(null);
  };

  const handleMyLocation = () => {
    if (userLocation) {
      mapRef.current?.animateToRegion(
        {
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500
      );
    }
  };

  const handleMarkerPress = (pin: typeof MOCK_PINS[0]) => {
    setSelectedPin(pin);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.headerTitle}>Map</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => Alert.alert('Map Layers', 'Map layer options coming soon.')}>
          <Ionicons name="layers-outline" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Map Area */}
      <View style={styles.mapContainer}>
        {locationPermission ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
            customMapStyle={darkMapStyle}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass
          >
            {MOCK_PINS.map((pin) => (
              <Marker
                key={pin.id}
                coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                title={pin.title}
                onPress={() => handleMarkerPress(pin)}
                pinColor={Colors.accent}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.mapPlaceholderText}>Enable location to see the map</Text>
          </View>
        )}

        {/* My Location Button */}
        {locationPermission && (
          <TouchableOpacity style={styles.myLocationBtn} onPress={handleMyLocation} activeOpacity={0.8}>
            <GlassCard style={styles.myLocationCard} glowColor="rgba(82,183,136,0.4)">
              <Ionicons name="locate" size={22} color={Colors.accent} />
            </GlassCard>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {FILTER_CHIPS.map((chip) => (
            <CategoryChip
              key={chip}
              label={chip}
              active={activeFilter === chip}
              onPress={() => setActiveFilter(chip)}
              color={Colors.accent}
            />
          ))}
        </ScrollView>
      </View>

      {/* Pin Preview Bottom Sheet */}
      {selectedPin && (
        <View style={styles.previewContainer}>
          <GlassCard glowColor="rgba(82,183,136,0.3)" style={styles.previewCard}>
            <TouchableOpacity style={styles.previewClose} onPress={handleClosePreview}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.previewRow}>
              <View style={styles.previewIconContainer}>
                <Ionicons
                  name={CATEGORY_ICONS[selectedPin.type] || 'location'}
                  size={28}
                  color={Colors.accent}
                />
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>{selectedPin.title}</Text>
                <Text style={styles.previewSubtitle}>
                  {selectedPin.type.charAt(0).toUpperCase() + selectedPin.type.slice(1)} • 0.2 km away
                </Text>
              </View>
            </View>
            <View style={styles.previewActions}>
              <GlowButton
                title="Directions"
                onPress={() => { Linking.openURL('https://www.google.com/maps/dir/?api=1&destination=' + selectedPin.lat + ',' + selectedPin.lng).catch(() => {}); }}
                size="sm"
                style={{ flex: 1 }}
              />
              <GlowButton
                title="Details"
                onPress={() => { Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(selectedPin.title)).catch(() => {}); }}
                size="sm"
                variant="outline"
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </GlassCard>
        </View>
      )}
    </SafeAreaView>
  );
};

// Dark map style matching the app's #0A0F0A theme
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0A0F0A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A8B8A8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0F0A' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1A2A1A' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#6B7B6B' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#A8B8A8' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#111811' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6B7B6B' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1A2A1A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A3A1A' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6B7B6B' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2D6A4F' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#52B788' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A1A0A' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2D6A4F' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#111811' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#6B7B6B' }] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
    borderRadius: 24,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.mapDark,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mapPlaceholderText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: 'Inter',
  },
  myLocationBtn: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    zIndex: 20,
  },
  myLocationCard: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  filterContainer: {
    position: 'absolute',
    top: 100,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  filterContent: {
    paddingHorizontal: 4,
  },
  previewContainer: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    zIndex: 30,
    paddingBottom: 20,
  },
  previewCard: {
    borderRadius: 24,
    padding: 0,
    overflow: 'hidden',
  },
  previewClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingRight: 48,
  },
  previewIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    marginLeft: 14,
    flex: 1,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  previewSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    marginTop: 4,
  },
  previewActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

export default MapScreen;
