import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import MapView, { Marker, Region, Polygon } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import CategoryChip from '../../components/shared/CategoryChip';
import Colors from '../../utils/colors';
import { DARK_MAP_STYLE, calculateDistance, openGoogleMapsDirections } from '../../services/maps';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import useNearbyUsers from '../../hooks/useNearbyUsers';
import AvatarBadge from '../../components/shared/AvatarBadge';
import {
  listenAlerts,
  listenEvents,
  listenListings,
  getLostFoundItems,
  getBusinesses,
} from '../../services/dataService';
import type {
  Alert,
  Event,
  Listing,
  LostFoundItem,
  Business,
} from '../../services/dataService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ------------------------------------------------------------------ */
/*  Pin icon / color config per content type                           */
/* ------------------------------------------------------------------ */

const PIN_CONFIG = {
  alert: { icon: 'warning' as const, color: Colors.alertRed },
  event: { icon: 'calendar' as const, color: Colors.accent },
  listing: { icon: 'pricetag' as const, color: Colors.alertYellow },
  lostfound: { icon: 'search' as const, color: '#4A90D9' },
  business: { icon: 'business' as const, color: '#9B59B6' },
} as const;

type PinType = keyof typeof PIN_CONFIG;

interface MapPin {
  id: string;
  title: string;
  type: PinType;
  latitude: number;
  longitude: number;
  subtitle?: string;
  data?: Alert | Event | Listing | LostFoundItem | Business;
}

/* ------------------------------------------------------------------ */
/*  Filter chips                                                        */
/* ------------------------------------------------------------------ */

const FILTER_CHIPS: { label: string; type: PinType | 'all' }[] = [
  { label: 'All', type: 'all' },
  { label: 'Alerts', type: 'alert' },
  { label: 'Events', type: 'event' },
  { label: 'Marketplace', type: 'listing' },
  { label: 'Lost & Found', type: 'lostfound' },
  { label: 'Businesses', type: 'business' },
];

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_REGION: Region = {
  latitude: 31.48112,
  longitude: 74.31497,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

/** Fallback neighborhood boundary (rough area around the default center). */
const DEFAULT_POLYGON_COORDS: { latitude: number; longitude: number }[] = [
  { latitude: 31.477, longitude: 74.311 },
  { latitude: 31.477, longitude: 74.319 },
  { latitude: 31.485, longitude: 74.319 },
  { latitude: 31.485, longitude: 74.311 },
];

/** Type guard for objects that may have lat/lng at runtime. */
function hasCoords(
  obj: unknown,
): obj is { latitude: number; longitude: number } {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return typeof o.latitude === 'number' && typeof o.longitude === 'number';
}

/** Derive a list of MapPin items from each Firestore data source. */
function buildPins(
  alerts: Alert[],
  events: Event[],
  listings: Listing[],
  lostFoundItems: LostFoundItem[],
  businesses: Business[],
): MapPin[] {
  const pins: MapPin[] = [];

  for (const a of alerts) {
    if (hasCoords(a)) {
      pins.push({
        id: `alert_${a.id}`,
        title: a.title,
        type: 'alert',
        latitude: a.latitude,
        longitude: a.longitude,
        subtitle: a.type,
        data: a,
      });
    }
  }

  for (const e of events) {
    if (hasCoords(e)) {
      pins.push({
        id: `event_${e.id}`,
        title: e.title,
        type: 'event',
        latitude: e.latitude,
        longitude: e.longitude,
        subtitle: e.date,
        data: e,
      });
    }
  }

  for (const l of listings) {
    if (hasCoords(l)) {
      pins.push({
        id: `listing_${l.id}`,
        title: l.title,
        type: 'listing',
        latitude: l.latitude,
        longitude: l.longitude,
        subtitle: l.category,
        data: l,
      });
    }
  }

  for (const lf of lostFoundItems) {
    if (hasCoords(lf)) {
      pins.push({
        id: `lostfound_${lf.id}`,
        title: lf.title,
        type: 'lostfound',
        latitude: lf.latitude,
        longitude: lf.longitude,
        subtitle: lf.type === 'lost' ? 'Lost' : 'Found',
        data: lf,
      });
    }
  }

  for (const b of businesses) {
    if (hasCoords(b)) {
      pins.push({
        id: `business_${b.id}`,
        title: b.name,
        type: 'business',
        latitude: b.latitude,
        longitude: b.longitude,
        subtitle: b.category,
        data: b,
      });
    }
  }

  return pins;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

const MapScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const navigation = useNavigation();
  const { user } = useAuth();
  const { nearbyUsers } = useNearbyUsers();

  /* ---- location state ---- */
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);

  /* ---- data state ---- */
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [lostFound, setLostFound] = useState<LostFoundItem[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  /* ---- UI state ---- */
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [selectedUser, setSelectedUser] = useState<
    (typeof nearbyUsers)[0] | null
  >(null);

  /* ------------------------------------------------------------------ */
  /*  Effects                                                            */
  /* ------------------------------------------------------------------ */

  /** Request location permission and fetch initial position. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          console.warn('[MapScreen] Location permission not granted:', status);
          return;
        }
        setLocationPermission(true);
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
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
        if (!cancelled) console.warn('[MapScreen] Location fetch failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Subscribe to real-time data feeds. */
  useEffect(() => {
    let mounted = true;

    const unsubAlerts = listenAlerts((items) => {
      if (mounted) setAlerts(items);
    });
    const unsubEvents = listenEvents((items) => {
      if (mounted) setEvents(items);
    });
    const unsubListings = listenListings((items) => {
      if (mounted) setListings(items);
    });

    getLostFoundItems().then((items) => {
      if (mounted) setLostFound(items);
    });
    getBusinesses().then((items) => {
      if (mounted) setBusinesses(items);
    });

    return () => {
      mounted = false;
      unsubAlerts();
      unsubEvents();
      unsubListings();
    };
  }, []);

  /* ---- derived data ---- */

  const allPins = useMemo(
    () => buildPins(alerts, events, listings, lostFound, businesses),
    [alerts, events, listings, lostFound, businesses],
  );

  const filteredPins = useMemo(() => {
    if (activeFilter === 'All') return allPins;
    return allPins.filter((p) => p.type === activeFilter.toLowerCase());
  }, [allPins, activeFilter]);

  /** Read neighbourhood boundary from user profile or fall back to default. */
  const neighborhoodPolygon = useMemo(() => {
    const raw = (user as unknown as Record<string, unknown>)?.neighborhoodPolygon;
    if (Array.isArray(raw) && raw.length >= 3) {
      return raw.map(
        (p: unknown) =>
          ({
            latitude:
              (p as Record<string, unknown>)?.latitude ??
              (p as Record<string, unknown>)?.lat ??
              0,
            longitude:
              (p as Record<string, unknown>)?.longitude ??
              (p as Record<string, unknown>)?.lng ??
              0,
          }) as { latitude: number; longitude: number },
      );
    }
    return DEFAULT_POLYGON_COORDS;
  }, [user]);

  /* ---- distance helper ---- */

  const getDistanceText = useCallback(
    (pin: MapPin): string => {
      if (!userLocation) return '';
      const distKm = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        pin.latitude,
        pin.longitude,
      );
      if (distKm < 0.001) return 'Here';
      if (distKm < 1) return `${Math.round(distKm * 1000)}m away`;
      return `${distKm.toFixed(1)}km away`;
    },
    [userLocation],
  );

  /* ---- handlers ---- */

  const handlePinPress = (pin: MapPin) => {
    setSelectedPin(pin);
    setSelectedUser(null);
  };

  const handleClosePreview = () => {
    setSelectedPin(null);
    setSelectedUser(null);
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
        500,
      );
    }
  };

  /** Retrieve the right navigation action and label for a pin type. */
  const getTypeAction = (
    pin: MapPin,
  ): { label: string; onPress: () => void } | null => {
    const nav = navigation as any;

    switch (pin.type) {
      case 'alert':
        return {
          label: 'View Alert',
          onPress: () => {
            setSelectedPin(null);
            nav.navigate('AlertDetail', { alertId: (pin.data as Alert)?.id });
          },
        };
      case 'event':
        return {
          label: 'View Event',
          onPress: () => {
            setSelectedPin(null);
            nav.navigate('EventDetail', { eventId: (pin.data as Event)?.id });
          },
        };
      case 'listing':
        return {
          label: 'View Listing',
          onPress: () => {
            setSelectedPin(null);
            nav.navigate('ListingDetail', {
              listingId: (pin.data as Listing)?.id,
            });
          },
        };
      case 'lostfound':
        return {
          label: 'View Details',
          onPress: () => {
            setSelectedPin(null);
            nav.navigate('LostFoundDetail', {
              itemId: (pin.data as LostFoundItem)?.id,
            });
          },
        };
      case 'business':
        return {
          label: 'View Business',
          onPress: () => {
            setSelectedPin(null);
            nav.navigate('BusinessDetail', {
              businessId: (pin.data as Business)?.id,
            });
          },
        };
      default:
        return null;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.headerTitle}>Map</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() =>
              (navigation as any).navigate('NearbyNeighbors')
            }
          >
            <Ionicons
              name="people-outline"
              size={22}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() =>
              Linking.openURL(
                'https://www.google.com/maps/search/?api=1&query=' +
                  encodeURIComponent(
                    userLocation
                      ? `${userLocation.lat},${userLocation.lng}`
                      : 'nearby',
                  ),
              ).catch(() => {})
            }
          >
            <Ionicons
              name="layers-outline"
              size={22}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Area */}
      <View style={styles.mapContainer}>
        {locationPermission ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
            customMapStyle={
              Platform.OS === 'android' ? DARK_MAP_STYLE : undefined
            }
            mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass
          >
            {/* Neighborhood boundary */}
            <Polygon
              coordinates={neighborhoodPolygon}
              fillColor="rgba(82,183,136,0.1)"
              strokeColor={Colors.accent}
              strokeWidth={2}
            />

            {/* Content-type markers */}
            {filteredPins.map((pin) => {
              const config = PIN_CONFIG[pin.type];
              return (
                <Marker
                  key={pin.id}
                  coordinate={{
                    latitude: pin.latitude,
                    longitude: pin.longitude,
                  }}
                  onPress={() => handlePinPress(pin)}
                >
                  <View style={styles.markerWrapper}>
                    <View
                      style={[
                        styles.markerCircle,
                        { backgroundColor: config.color },
                      ]}
                    >
                      <Ionicons name={config.icon} size={18} color="#FFF" />
                    </View>
                  </View>
                </Marker>
              );
            })}

            {/* Nearby user markers */}
            {nearbyUsers.map((u) => {
              if (
                typeof u.latitude !== 'number' ||
                typeof u.longitude !== 'number'
              )
                return null;
              return (
                <Marker
                  key={`user_${u.uid}`}
                  coordinate={{
                    latitude: u.latitude,
                    longitude: u.longitude,
                  }}
                  title={u.name ?? 'User'}
                  onPress={() => {
                    setSelectedPin(null);
                    setSelectedUser(u);
                  }}
                >
                  <View style={styles.markerWrapper}>
                    <View
                      style={[
                        styles.userMarkerCircle,
                        {
                          backgroundColor: u.verified
                            ? Colors.accent
                            : Colors.primary,
                        },
                      ]}
                    >
                      <Ionicons
                        name="person"
                        size={14}
                        color={Colors.textPrimary}
                      />
                    </View>
                  </View>
                </Marker>
              );
            })}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.mapPlaceholderText}>
              Enable location to see the map
            </Text>
          </View>
        )}

        {/* My Location Button */}
        {locationPermission && (
          <TouchableOpacity
            style={styles.myLocationBtn}
            onPress={handleMyLocation}
            activeOpacity={0.8}
          >
            <GlassCard
              style={styles.myLocationCard}
              glowColor="rgba(82,183,136,0.4)"
            >
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
              key={chip.label}
              label={chip.label}
              active={activeFilter === chip.label}
              onPress={() => setActiveFilter(chip.label)}
              color={Colors.accent}
            />
          ))}
        </ScrollView>
      </View>

      {/* Pin Preview Bottom Sheet */}
      {selectedPin && (
        <View style={styles.previewContainer}>
          <GlassCard
            glowColor="rgba(82,183,136,0.3)"
            style={styles.previewCard}
          >
            <TouchableOpacity
              style={styles.previewClose}
              onPress={handleClosePreview}
            >
              <Ionicons
                name="close"
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
            <View style={styles.previewRow}>
              <View
                style={[
                  styles.previewIconContainer,
                  {
                    backgroundColor: PIN_CONFIG[selectedPin.type].color + '30',
                    borderColor: PIN_CONFIG[selectedPin.type].color,
                  },
                ]}
              >
                <Ionicons
                  name={PIN_CONFIG[selectedPin.type].icon}
                  size={28}
                  color={PIN_CONFIG[selectedPin.type].color}
                />
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>{selectedPin.title}</Text>
                <Text style={styles.previewSubtitle}>
                  {selectedPin.type.charAt(0).toUpperCase() +
                    selectedPin.type.slice(1)}{' '}
                  {'•'} {getDistanceText(selectedPin)}
                </Text>
              </View>
            </View>
            <View style={styles.previewActions}>
              <GlowButton
                title="Directions"
                onPress={() => {
                  openGoogleMapsDirections(
                    selectedPin.latitude,
                    selectedPin.longitude,
                  );
                }}
                size="sm"
                style={{ flex: 1 }}
              />
              {getTypeAction(selectedPin) && (
                <GlowButton
                  title={getTypeAction(selectedPin)!.label}
                  onPress={getTypeAction(selectedPin)!.onPress}
                  size="sm"
                  variant="outline"
                  style={{ flex: 1, marginLeft: 8 }}
                />
              )}
            </View>
          </GlassCard>
        </View>
      )}

      {/* User Preview Bottom Sheet */}
      {selectedUser && (
        <View style={styles.previewContainer}>
          <GlassCard
            glowColor="rgba(82,183,136,0.3)"
            style={styles.previewCard}
          >
            <TouchableOpacity
              style={styles.previewClose}
              onPress={handleClosePreview}
            >
              <Ionicons
                name="close"
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
            <View style={styles.previewRow}>
              <AvatarBadge
                name={selectedUser.name ?? 'User'}
                avatar={selectedUser.avatar ?? ''}
                size={48}
                role={selectedUser.role ?? 'resident'}
                verified={selectedUser.verified ?? false}
              />
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>
                  {selectedUser.name ?? 'User'}
                </Text>
                <Text style={styles.previewSubtitle}>
                  {selectedUser.verified ? 'Verified • ' : ''}
                  {selectedUser.distanceKm < 1
                    ? `${Math.round(selectedUser.distanceKm * 1000)}m away`
                    : `${selectedUser.distanceKm.toFixed(1)}km away`}
                </Text>
              </View>
            </View>
            <View style={styles.previewActions}>
              <GlowButton
                title="View Profile"
                onPress={() => {
                  setSelectedUser(null);
                  const nav = navigation as any;
                  if (selectedUser.uid === user?.uid) {
                    nav.navigate('MainTabs');
                  } else {
                    nav.navigate('AuthorProfile', {
                      userId: selectedUser.uid,
                    });
                  }
                }}
                size="sm"
                style={{ flex: 1 }}
              />
            </View>
          </GlassCard>
        </View>
      )}
    </SafeAreaView>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  /* ---- Custom marker styles ---- */
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  userMarkerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});

export default MapScreen;
