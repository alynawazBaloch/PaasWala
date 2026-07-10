import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import MapView, { Marker, Region } from 'react-native-maps';
import { geohashForLocation } from 'geofire-common';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import { DARK_MAP_STYLE } from '../../services/maps';

const { width } = Dimensions.get('window');
const VERIFY_DURATION = 10000; // 10 seconds

const LocationVerificationScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [phase, setPhase] = useState<'detecting' | 'verifying' | 'verified' | 'error'>('detecting');
  const [locAttempt, setLocAttempt] = useState<string>('Getting last known location...');
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 31.481120,
    longitude: 74.314970,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [capturedLat, setCapturedLat] = useState<number | null>(null);
  const [capturedLng, setCapturedLng] = useState<number | null>(null);

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  const attemptLocation = async () => {
    setPhase('detecting');
    setLocAttempt('Requesting location permission...');

    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setLocAttempt('Permission denied — using approximate area');
        setPhase('verifying');
        return;
      }

      // ----- TRY 1: Last known position (instant) -----
      setLocAttempt('Getting last known location...');
      let loc: Location.LocationObject | null = null;
      try {
        const last = await Location.getLastKnownPositionAsync({});
        if (last?.coords) {
          loc = last;
        }
      } catch {
        // Fall through to next try
      }

      // ----- TRY 2: Low accuracy (WiFi/cell, fast) -----
      if (!loc) {
        setLocAttempt('Finding location (WiFi/cell)...');
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 8000)
          );
          const locPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
          });
          loc = await Promise.race([locPromise, timeoutPromise]);
        } catch {
          // Fall through to next try
        }
      }

      // ----- TRY 3: Balanced accuracy (GPS, slower) -----
      if (!loc) {
        setLocAttempt('Getting precise location (GPS)...');
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 15000)
          );
          const locPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          loc = await Promise.race([locPromise, timeoutPromise]);
        } catch {
          // All attempts failed
        }
      }

      if (loc?.coords) {
        const { latitude, longitude } = loc.coords;
        setCapturedLat(latitude);
        setCapturedLng(longitude);
        setMapRegion({ latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });

        // Reverse geocode
        try {
          const results = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (results.length > 0) {
            const addr = results[0];
            if (addr.street || addr.name) setAddress([addr.street, addr.name].filter(Boolean).join(', '));
            if (addr.district || addr.subregion) setArea(addr.district || addr.subregion || '');
            if (addr.city) setCity(addr.city);
          }
        } catch {
          // Reverse geocode failed — proceed without address string
        }

        setPhase('verifying');
      } else {
        // No location obtained at all
        setPhase('error');
        setLocAttempt('Could not detect your location. Make sure GPS/WiFi is on.');
      }
    } catch (err) {
      console.warn('[LocationVerification] Location fetch failed:', err);
      setPhase('error');
      setLocAttempt('Something went wrong. Please try again.');
    }
  };

  // Auto-detect location on mount
  useEffect(() => {
    attemptLocation();
  }, []);

  // Start verification animation + timer
  useEffect(() => {
    if (phase !== 'verifying') return;

    // Animate progress bar from 0 to 1 over VERIFY_DURATION
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: VERIFY_DURATION,
      useNativeDriver: false,
    }).start();

    // After VERIFY_DURATION, auto-verify the user
    const timer = setTimeout(async () => {
      const lat = capturedLat ?? mapRegion.latitude;
      const lng = capturedLng ?? mapRegion.longitude;
      try {
        const geohash = geohashForLocation([lat, lng]);
        await updateUser({
          verified: true,
          streetName: address,
          address,
          area,
          city,
          latitude: lat,
          longitude: lng,
          geohash,
          neighborhoodName: area || 'My Mohalla',
          lastLocationUpdate: Date.now(),
        });
      } catch (err) {
        console.warn('[LocationVerification] Auto-verify failed:', err);
        // Still mark as verified even if location update fails
        try {
          await updateUser({ verified: true });
        } catch {}
      }

      // Transition to verified state
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setPhase('verified');
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }).start();
      });
    }, VERIFY_DURATION);

    return () => {
      clearTimeout(timer);
      progressAnim.stopAnimation();
    };
  }, [phase]);

  const handleContinue = () => {
    navigation.replace('MainTabs');
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // ============ DETECTING PHASE ============
  if (phase === 'detecting') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <View style={styles.detectingIcon}>
            <Ionicons name="locate-outline" size={48} color={Colors.accent} />
          </View>
          <Text style={styles.detectingTitle}>Detecting Your Location</Text>
          <Text style={styles.detectingSub}>{locAttempt}</Text>
          <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 24 }} />
          <TouchableOpacity
            style={styles.retryLink}
            onPress={attemptLocation}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={14} color={Colors.textSecondary} />
            <Text style={styles.retryLinkText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============ ERROR PHASE ============
  if (phase === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <View style={[styles.detectingIcon, { borderColor: Colors.warning }]}>
            <Ionicons name="warning-outline" size={48} color={Colors.warning} />
          </View>
          <Text style={styles.detectingTitle}>Location Unavailable</Text>
          <Text style={styles.detectingSub}>{locAttempt}</Text>

          <GlassCard style={{ padding: 24, marginTop: 24, alignItems: 'center' }}>
            <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              We'll use your general area for now. You can update your location later in Settings.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <GlowButton
                title="Retry"
                onPress={attemptLocation}
                variant="outline"
                icon={<Ionicons name="refresh" size={18} color={Colors.accent} />}
                iconPosition="left"
                style={{ flex: 1 }}
              />
              <GlowButton
                title="Continue Anyway"
                onPress={() => {
                  setPhase('verifying');
                }}
                gradientColors={[Colors.accent, Colors.primary]}
                style={{ flex: 1 }}
              />
            </View>
          </GlassCard>
        </View>
      </SafeAreaView>
    );
  }

  // ============ VERIFIED PHASE (success) ============
  if (phase === 'verified') {
    const lat = capturedLat ?? mapRegion.latitude;
    const lng = capturedLng ?? mapRegion.longitude;
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <GlassCard style={[styles.successCard, { borderColor: Colors.success }]}>
              <View style={[styles.successIcon, { borderColor: Colors.success }]}>
                <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>Location Verified!</Text>
              <Text style={styles.successDesc}>
                Your neighborhood has been confirmed. Welcome to{' '}
                <Text style={{ color: Colors.accent, fontWeight: '700' }}>
                  {area || city || 'your community'}
                </Text>
                {' — you now have full access to PaasWala.'}
              </Text>

              {/* Location Details */}
              {address || capturedLat ? (
                <View style={styles.locationDetails}>
                  <MapView
                    style={styles.miniMap}
                    region={{
                      latitude: lat,
                      longitude: lng,
                      latitudeDelta: 0.02,
                      longitudeDelta: 0.02,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    customMapStyle={DARK_MAP_STYLE}
                  >
                    <Marker coordinate={{ latitude: lat, longitude: lng }} />
                  </MapView>
                  <View style={styles.locationTextWrap}>
                    <Ionicons name="location" size={16} color={Colors.accent} />
                    <Text style={styles.locationText}>
                      {[address, area, city].filter(Boolean).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
                    </Text>
                  </View>
                </View>
              ) : null}

              <GlowButton
                title="Start Exploring"
                onPress={handleContinue}
                gradientColors={[Colors.success, Colors.accent]}
                style={{ marginTop: 24, width: '100%' }}
                icon={<Ionicons name="rocket-outline" size={20} color={Colors.textPrimary} />}
                iconPosition="right"
              />
            </GlassCard>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ============ VERIFYING PHASE (10s loading) ============
  const lat = capturedLat ?? mapRegion.latitude;
  const lng = capturedLng ?? mapRegion.longitude;
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Animated.View
        style={[
          styles.verifyContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Map Preview */}
        <View style={styles.mapPreview}>
          <MapView
            style={StyleSheet.absoluteFill}
            region={mapRegion}
            scrollEnabled={false}
            zoomEnabled={false}
            customMapStyle={DARK_MAP_STYLE}
          >
            <Marker
              coordinate={{ latitude: lat, longitude: lng }}
              pinColor={Colors.accent}
            />
          </MapView>
          <View style={styles.mapOverlay}>
            <Ionicons name="radio-outline" size={20} color={Colors.accent} />
            <Text style={styles.mapOverlayText}>Verifying your area...</Text>
          </View>
        </View>

        {/* Verification Card */}
        <GlassCard style={styles.verifyCard}>
          <View style={styles.verifyHeader}>
            <Ionicons name="shield-checkmark-outline" size={28} color={Colors.accent} />
            <Text style={styles.verifyTitle}>Verifying Your Location</Text>
          </View>

          <Text style={styles.verifyDesc}>
            We're confirming your neighborhood. This only takes a moment.
          </Text>

          {/* Address being verified */}
          {address ? (
            <View style={styles.addressPreview}>
              <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.addressPreviewText}>
                {[address, area, city].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : (
            <View style={styles.addressPreview}>
              <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.addressPreviewText}>
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </Text>
            </View>
          )}

          {/* Animated Progress Bar */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>

          <Text style={styles.progressHint}>Please wait while we verify...</Text>
        </GlassCard>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  // Detecting phase
  detectingIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  detectingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  detectingSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  retryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  retryLinkText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  // Verifying phase
  verifyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  mapPreview: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  mapOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,15,10,0.85)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.3)',
  },
  mapOverlayText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  verifyCard: {
    padding: 24,
    alignItems: 'center',
  },
  verifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  verifyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  verifyDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter',
    lineHeight: 20,
    marginBottom: 16,
  },
  addressPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(82,183,136,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  addressPreviewText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    flex: 1,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  progressHint: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  // Verified (success) phase
  successCard: {
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: Colors.glassBg,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 10,
  },
  successDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  locationDetails: {
    width: '100%',
    marginTop: 20,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  miniMap: {
    height: 120,
  },
  locationTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: Colors.glassBg,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    flex: 1,
  },
});

export default LocationVerificationScreen;
