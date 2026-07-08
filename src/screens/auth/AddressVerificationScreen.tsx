import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { geohashForLocation } from 'geofire-common';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import GlowInput from '../../components/glass/GlowInput';
import { DARK_MAP_STYLE } from '../../services/maps';
import { createVerificationRequest } from '../../services/dataService';
import { enrichCoordinates } from '../../services/location';

type StatusType = 'pending' | 'submitted' | 'approved' | 'rejected';

const AddressVerificationScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [status, setStatus] = useState<StatusType>('pending');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 31.481120,
    longitude: 74.314970,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [markerCoord, setMarkerCoord] = useState({
    latitude: 31.481120,
    longitude: 74.314970,
  });

  // Auto-detect current location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (permStatus !== 'granted') {
          console.warn('[AddressVerification] Location permission denied');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = loc.coords;
        setMapRegion({ latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
        setMarkerCoord({ latitude, longitude });
        // Auto-fill address
        try {
          const results = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (results.length > 0) {
            const addr = results[0];
            if (addr.street || addr.name) setStreetAddress([addr.street, addr.name].filter(Boolean).join(', '));
            if (addr.district || addr.subregion) setArea(addr.district || addr.subregion || '');
            if (addr.city) setCity(addr.city);
          }
        } catch (geoErr) {
          console.warn('[AddressVerification] Reverse geocode failed:', geoErr);
        }
      } catch (locErr) {
        console.warn('[AddressVerification] Location fetch failed:', locErr);
      }
    })();
  }, []);

  const steps = [
    {
      icon: 'document-text-outline',
      title: 'Submit Address',
      desc: 'Enter your neighborhood address for verification',
    },
    {
      icon: 'time-outline',
      title: 'Admin Review',
      desc: 'Your neighborhood admin will verify your address',
    },
    {
      icon: 'checkmark-circle-outline',
      title: 'Approved',
      desc: 'You get full access to your mohalla community',
    },
  ];

  const handleConfirm = async () => {
    if (!streetAddress.trim() || !area.trim() || !city.trim()) {
      setError('Please fill in your full address (street, area, and city)');
      return;
    }
    if (!user?.uid) {
      setError('User not found. Please try logging in again.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      // Enrich coordinates with geohash
      const enriched = await enrichCoordinates(markerCoord.latitude, markerCoord.longitude);

      // Create verification request in Firestore
      const requestId = 'vr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
      await createVerificationRequest({
        id: requestId,
        userId: user.uid,
        userName: user.name,
        userPhone: user.phone || '',
        userAvatar: user.avatar,
        streetAddress: streetAddress.trim(),
        area: area.trim(),
        city: city.trim(),
        latitude: enriched.latitude,
        longitude: enriched.longitude,
        geohash: enriched.geohash,
        status: 'pending',
        createdAt: Date.now(),
      });

      // Update user profile with address details
      await updateUser({
        streetName: streetAddress.trim(),
        address: streetAddress.trim(),
        area: area.trim(),
        city: city.trim(),
        latitude: enriched.latitude,
        longitude: enriched.longitude,
        geohash: enriched.geohash,
      });

      setStatus('submitted');
    } catch (err: any) {
      console.error('[AddressVerification] Submit failed:', err);
      setError(err.message || 'Failed to submit verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setStatus('pending');
    setError('');
  };

  // Submitted (pending review) State
  if (status === 'submitted') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.statusCenter}>
          <GlassCard
            style={[styles.statusCard, { borderColor: Colors.warning }]}
            glowColor={Colors.warning}
          >
            <View style={[styles.statusIconContainer, { borderColor: Colors.warning }]}>
              <Ionicons name="time-outline" size={52} color={Colors.warning} />
            </View>
            <Text style={[styles.statusTitle, { color: Colors.warning }]}>
              Pending Review
            </Text>
            <Text style={styles.statusDesc}>
              Your address has been submitted for verification. Your neighborhood admin will
              review it shortly. You'll receive a notification once it's approved.
            </Text>
            <Text style={[styles.statusDesc, { marginTop: 12, fontSize: 13, color: Colors.textMuted }]}>
              You can browse the app while you wait, but posting and commenting will be
              available after verification.
            </Text>
            <GlowButton
              title="Browse Neighborhood"
              onPress={() => {
                // Navigate to MainTabs (read-only mode)
                navigation.replace('MainTabs');
              }}
              gradientColors={[Colors.primary, Colors.accent]}
              style={{ marginTop: 16, width: '100%' }}
            />
          </GlassCard>
        </View>
      </SafeAreaView>
    );
  }

  // Approved State
  if (status === 'approved') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.statusCenter}>
          <GlassCard
            style={[styles.statusCard, { borderColor: Colors.success }]}
            glowColor={Colors.success}
          >
            <View style={[styles.statusIconContainer, { borderColor: Colors.success }]}>
              <Ionicons name="checkmark-circle" size={52} color={Colors.success} />
            </View>
            <Text style={[styles.statusTitle, { color: Colors.success }]}>
              Address Verified!
            </Text>
            <Text style={styles.statusDesc}>
              Welcome to your neighborhood! You now have full access to PaasWala.
            </Text>
            <GlowButton
              title="Continue to PaasWala"
              onPress={async () => {
                await updateUser({
                  streetName: streetAddress,
                  neighborhoodName: area || 'My Mohalla',
                  verified: true,
                });
                navigation.replace('MainTabs');
              }}
              gradientColors={[Colors.success, Colors.accent]}
              style={{ marginTop: 16, width: '100%' }}
            />
          </GlassCard>
        </View>
      </SafeAreaView>
    );
  }

  // Rejected State
  if (status === 'rejected') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.statusCenter}>
          <GlassCard
            style={[styles.statusCard, { borderColor: Colors.error }]}
            glowColor={Colors.error}
          >
            <View style={[styles.statusIconContainer, { borderColor: Colors.error }]}>
              <Ionicons name="close-circle" size={52} color={Colors.error} />
            </View>
            <Text style={[styles.statusTitle, { color: Colors.error }]}>
              Verification Rejected
            </Text>
            <Text style={styles.statusDesc}>
              The provided address could not be verified. Please try again with a more detailed
              address, or contact your neighborhood admin for assistance.
            </Text>
            <GlowButton
              title="Try Again"
              onPress={handleTryAgain}
              variant="danger"
              style={{ marginTop: 16, width: '100%' }}
            />
          </GlassCard>
        </View>
      </SafeAreaView>
    );
  }

  // Pending State - show form
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Headline */}
        <Text style={styles.pageTitle}>Verify Your{'\n'}Address</Text>
        <Text style={styles.pageSubtitle}>
          Help us confirm your neighborhood to connect you with your community.
        </Text>

        {/* Address Form Card */}
        <GlassCard style={styles.formCard}>
          {/* Interactive Map Preview */}
          <View style={styles.mapPreview}>
            <MapView
              style={StyleSheet.absoluteFill}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
              customMapStyle={DARK_MAP_STYLE}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker
                coordinate={markerCoord}
                draggable
                onDragEnd={async (e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setMarkerCoord({ latitude, longitude });
                  setMapRegion((prev) => ({ ...prev, latitude, longitude }));
                  try {
                    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
                    if (results.length > 0) {
                      const addr = results[0];
                      if (addr.street || addr.name) {
                        setStreetAddress([addr.street, addr.name].filter(Boolean).join(', '));
                      }
                      if (addr.district || addr.subregion) {
                        setArea(addr.district || addr.subregion || '');
                      }
                      if (addr.city) setCity(addr.city);
                    }
                  } catch (geoErr) { console.warn('[AddressVerification] Drag geocode failed:', geoErr); }
                }}
                pinColor={Colors.accent}
              />
            </MapView>
            <View style={styles.mapPinRow}>
              <Ionicons name="locate" size={22} color={Colors.accent} />
            </View>
          </View>

          {/* Street Address */}
          <GlowInput
            icon="location-outline"
            placeholder="Street Address / House No."
            value={streetAddress}
            onChangeText={(t) => { setStreetAddress(t); if (error) setError(''); }}
            error={error}
          />

          {/* Area / Sector */}
          <GlowInput
            icon="business-outline"
            placeholder="Area / Sector / Mohalla"
            value={area}
            onChangeText={setArea}
          />

          {/* City */}
          <GlowInput
            icon="location-outline"
            placeholder="City"
            value={city}
            onChangeText={setCity}
          />
        </GlassCard>

        {/* What Happens Next? */}
        <Text style={styles.sectionTitle}>What happens next?</Text>
        <View style={styles.stepsContainer}>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepIconBox}>
                <Ionicons name={step.icon as any} size={22} color={Colors.accent} />
                {i < steps.length - 1 && <View style={styles.stepConnector} />}
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Confirm Button */}
        <GlowButton
          title="Confirm Address"
          onPress={handleConfirm}
          loading={isLoading}
          disabled={isLoading}
          icon={<Ionicons name="checkmark-circle" size={20} color={Colors.textPrimary} />}
          iconPosition="right"
          style={{ marginBottom: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
  },
  statusCenter: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    lineHeight: 40,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    lineHeight: 20,
    marginBottom: 24,
  },
  formCard: {
    padding: 20,
    marginBottom: 24,
  },
  mapPreview: {
    height: 160,
    borderRadius: 14,
    backgroundColor: '#050A05',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  mapPinRow: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  mapText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  mapSubtext: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 16,
  },
  stepsContainer: {
    marginBottom: 28,
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
    position: 'relative',
  },
  stepIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  stepConnector: {
    position: 'absolute',
    top: 44,
    left: 21,
    width: 2,
    height: 28,
    backgroundColor: Colors.glassBorder,
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    lineHeight: 18,
  },
  statusCard: {
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: Colors.glassBg,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  statusDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter',
    lineHeight: 20,
  },
});

export default AddressVerificationScreen;
