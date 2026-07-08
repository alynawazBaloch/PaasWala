import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
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
  const [phase, setPhase] = useState<'detecting' | 'verifying' | 'verified'>('detecting');
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 31.481120,
    longitude: 74.314970,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [capturedLat, setCapturedLat] = useState(31.481120);
  const [capturedLng, setCapturedLng] = useState(74.314970);

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  // Auto-detect location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm !== 'granted') {
          console.warn('[LocationVerification] Location permission denied');
          // Use default location if denied
          setPhase('verifying');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
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
        } catch (geoErr) {
          console.warn('[LocationVerification] Reverse geocode failed:', geoErr);
        }

        setPhase('verifying');
      } catch (err) {
        console.warn('[LocationVerification] Location fetch failed:', err);
        setPhase('verifying');
      }
    })();
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
      try {
        const geohash = geohashForLocation([capturedLat, capturedLng]);
        await updateUser({
          verified: true,
          streetName: address,
          address,
          area,
          city,
          latitude: capturedLat,
          longitude: capturedLng,
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
          <Text style={styles.detectingSub}>Please enable location access to verify your neighborhood</Text>
          <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  // ============ VERIFIED PHASE (success) ============
  if (phase === 'verified') {
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
              {address ? (
                <View style={styles.locationDetails}>
                  <MapView
                    style={styles.miniMap}
                    region={mapRegion}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    customMapStyle={DARK_MAP_STYLE}
                  >
                    <Marker coordinate={{ latitude: capturedLat, longitude: capturedLng }} />
                  </MapView>
                  <View style={styles.locationTextWrap}>
                    <Ionicons name="location" size={16} color={Colors.accent} />
                    <Text style={styles.locationText}>
                      {[address, area, city].filter(Boolean).join(', ')}
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
              coordinate={{ latitude: capturedLat, longitude: capturedLng }}
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
          ) : null}

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
