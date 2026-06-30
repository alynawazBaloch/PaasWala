import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../utils/colors';
import GlassCard from '../../components/glass/GlassCard';
import GlowInput from '../../components/glass/GlowInput';
import GlowButton from '../../components/glass/GlowButton';
import AvatarBadge from '../../components/shared/AvatarBadge';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DARK_MAP_STYLE } from '../../services/maps';

interface EditProfileScreenProps {
  navigation: any;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const { language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [street, setStreet] = useState(user?.streetName || '');
  const [bio, setBio] = useState('');
  const [notifyPosts, setNotifyPosts] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyEvents, setNotifyEvents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
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

  const handlePickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera roll access to change your profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        await updateUser({ avatar: result.assets[0].uri });
      }
    } catch (err) {
      console.error('[EditProfile] Image picker error:', err);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  }, [updateUser]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required.');
      return;
    }

    setIsSaving(true);
    try {
      await updateUser({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        streetName: street.trim(),
      });
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [name, phone, email, street, updateUser, navigation]);

  const handleOpenMapPicker = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required to pick an address on the map.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setMapRegion({ latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
      setMarkerCoord({ latitude, longitude });
    } catch (err) {
      console.warn('[EditProfile] Location fetch for map:', err);
    }
    setShowMapPicker(true);
  }, []);

  const handleConfirmAddress = useCallback(async () => {
    const { latitude, longitude } = markerCoord;
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results.length > 0) {
        const addr = results[0];
        const parts = [addr.street, addr.name, addr.district, addr.city, addr.region, addr.postalCode].filter(Boolean);
        setStreet(parts.join(', ') || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
      } else {
        setStreet(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
      }
    } catch (err) {
      console.warn('[EditProfile] Reverse geocode failed:', err);
      setStreet(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
    }
    setShowMapPicker(false);
  }, [markerCoord]);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'ur' : 'en');
  }, [language, setLanguage]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              <AvatarBadge
                name={name || 'You'}
                avatar={user?.avatar}
                size={96}
                role={user?.role || 'resident'}
                verified={user?.verified ?? true}
              />
              <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.8} onPress={handlePickImage}>
                <LinearGradient
                  colors={[Colors.primary, Colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cameraGradient}
                >
                  <Ionicons name="camera" size={18} color={Colors.textPrimary} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </View>

          {/* Personal Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <GlassCard noTouch style={styles.formCard}>
              <GlowInput
                label="Full Name"
                icon="person-outline"
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
              />
              <GlowInput
                label="Phone Number"
                icon="call-outline"
                placeholder="Enter phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <GlowInput
                label="Email"
                icon="mail-outline"
                placeholder="Enter email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.addressRow} onPress={handleOpenMapPicker} activeOpacity={0.7}>
                <View style={styles.addressRowLeft}>
                  <View style={styles.addressIconWrap}>
                    <Ionicons name="map-outline" size={20} color={Colors.accent} />
                  </View>
                  <View style={styles.addressTextWrap}>
                    <Text style={styles.addressLabel}>Street Address</Text>
                    <Text style={styles.addressValue} numberOfLines={1}>
                      {street || 'Tap to set your address'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
              <View style={styles.bioContainer}>
                <Text style={styles.inputLabel}>Bio</Text>
                <View style={styles.bioInputWrap}>
                  <GlowInput
                    placeholder="Write something about yourself..."
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={4}
                    containerStyle={styles.bioInput}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </GlassCard>
          </View>

          {/* Language */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Language</Text>
            <GlassCard noTouch style={styles.formCard}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelRow}>
                  <Ionicons name="language-outline" size={20} color={Colors.accent} />
                  <Text style={styles.toggleLabel}>Language Preference</Text>
                </View>
                <TouchableOpacity
                  style={styles.langToggle}
                  onPress={toggleLanguage}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.langOption,
                      language === 'en' && styles.langOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        language === 'en' && styles.langOptionTextActive,
                      ]}
                    >
                      EN
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.langOption,
                      language === 'ur' && styles.langOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        language === 'ur' && styles.langOptionTextActive,
                      ]}
                    >
                      اردو
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>

          {/* Notification Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <GlassCard noTouch style={styles.formCard}>
              <View style={styles.notifRow}>
                <View style={styles.notifLabelRow}>
                  <Ionicons name="newspaper-outline" size={20} color={Colors.accent} />
                  <Text style={styles.notifLabel}>Post Updates</Text>
                </View>
                <Switch
                  value={notifyPosts}
                  onValueChange={setNotifyPosts}
                  trackColor={{ false: Colors.glassBorder, true: Colors.primary }}
                  thumbColor={notifyPosts ? Colors.accent : Colors.textMuted}
                />
              </View>
              <View style={styles.notifDivider} />
              <View style={styles.notifRow}>
                <View style={styles.notifLabelRow}>
                  <Ionicons name="chatbubbles-outline" size={20} color={Colors.accent} />
                  <Text style={styles.notifLabel}>Messages</Text>
                </View>
                <Switch
                  value={notifyMessages}
                  onValueChange={setNotifyMessages}
                  trackColor={{ false: Colors.glassBorder, true: Colors.primary }}
                  thumbColor={notifyMessages ? Colors.accent : Colors.textMuted}
                />
              </View>
              <View style={styles.notifDivider} />
              <View style={styles.notifRow}>
                <View style={styles.notifLabelRow}>
                  <Ionicons name="calendar-outline" size={20} color={Colors.accent} />
                  <Text style={styles.notifLabel}>Events</Text>
                </View>
                <Switch
                  value={notifyEvents}
                  onValueChange={setNotifyEvents}
                  trackColor={{ false: Colors.glassBorder, true: Colors.primary }}
                  thumbColor={notifyEvents ? Colors.accent : Colors.textMuted}
                />
              </View>
            </GlassCard>
          </View>

          {/* Save Button */}
          <View style={styles.saveSection}>
            <GlowButton
              title="Save Changes"
              onPress={handleSave}
              loading={isSaving}
              size="lg"
              style={styles.saveBtn}
              gradientColors={[Colors.primary, Colors.accent]}
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Map Address Picker Modal */}
        <Modal visible={showMapPicker} animationType="slide" transparent={false}>
          <SafeAreaView style={styles.mapModal}>
            <View style={styles.mapModalHeader}>
              <TouchableOpacity onPress={() => setShowMapPicker(false)} activeOpacity={0.7}>
                <Text style={styles.mapModalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.mapModalTitle}>Set Address</Text>
              <TouchableOpacity onPress={handleConfirmAddress} activeOpacity={0.7}>
                <Text style={styles.mapModalConfirm}>Confirm</Text>
              </TouchableOpacity>
            </View>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFillObject}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
              customMapStyle={DARK_MAP_STYLE}
            >
              <Marker
                coordinate={markerCoord}
                draggable
                onDragEnd={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setMarkerCoord({ latitude, longitude });
                  setMapRegion((prev) => ({ ...prev, latitude, longitude }));
                }}
                pinColor={Colors.accent}
              />
            </MapView>
            <View style={styles.mapModalBottom}>
              <Text style={styles.mapModalHint}>Drag the pin to your exact location</Text>
            </View>
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  cameraGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 10,
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
  },

  // Bio
  bioContainer: {
    marginBottom: 0,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  bioInputWrap: {
    marginBottom: 0,
  },
  bioInput: {
    marginBottom: 0,
    minHeight: 100,
  },

  // Language Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  langToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.glassBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  langOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  langOptionActive: {
    backgroundColor: Colors.primary,
  },
  langOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  langOptionTextActive: {
    color: Colors.textPrimary,
  },

  // Notifications
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  notifLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  notifDivider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginVertical: 8,
  },

  // Save
  saveSection: {
    marginTop: 4,
  },
  saveBtn: {
    borderRadius: 24,
  },
  bottomSpacer: {
    height: 40,
  },

  // Address Row
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
    marginBottom: 12,
  },
  addressRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressTextWrap: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  addressValue: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },

  // Map Modal
  mapModal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
    zIndex: 10,
  },
  mapModalCancel: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  mapModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  mapModalConfirm: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  mapModalBottom: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  mapModalHint: {
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    fontFamily: 'Inter',
  },
});

export default EditProfileScreen;
