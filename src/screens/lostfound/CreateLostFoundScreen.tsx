import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import GlowInput from '../../components/glass/GlowInput';
import CategoryChip from '../../components/shared/CategoryChip';
import Colors from '../../utils/colors';
import { useNavigation } from '@react-navigation/native';
import { saveLostFoundItem } from '../../services/dataService';
import type { LostFoundItem } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

const CATEGORY_CHOICES = ['Pet', 'Item', 'Electronics', 'Keys', 'Wallet', 'Accessory', 'Other'];

const CONTACT_OPTIONS = { chat: 'In-App Chat', phone: 'Phone', both: 'Both' } as const;

type ItemType = 'lost' | 'found';
type ContactKey = keyof typeof CONTACT_OPTIONS;

const CreateLostFoundScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [itemType, setItemType] = useState<ItemType>('lost');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [selectedContact, setSelectedContact] = useState<ContactKey>('chat');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ------------------------------------------------------------------ */
  /*  Validation                                                         */
  /* ------------------------------------------------------------------ */

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!location.trim()) newErrors.location = 'Location is required';
    if (!selectedCategory) newErrors.category = 'Please select a category';
    if (selectedContact === 'phone' && !contactPhone.trim()) {
      newErrors.contactPhone = 'Phone number is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ------------------------------------------------------------------ */
  /*  Photo picker                                                       */
  /* ------------------------------------------------------------------ */

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick an image. Please try again.');
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Location                                                           */
  /* ------------------------------------------------------------------ */

  const handleGetLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);

      // Reverse geocode to a human-readable address
      const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (addresses.length > 0) {
        const addr = addresses[0];
        const parts = [
          addr.name,
          addr.street,
          addr.district,
          addr.city,
          addr.region,
          addr.country,
        ].filter((p): p is string => !!p);
        setLocation(parts.join(', '));
      } else {
        setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }

      // Clear any previous location error
      setErrors((prev) => {
        const next = { ...prev };
        delete next.location;
        return next;
      });
    } catch {
      Alert.alert('Error', 'Failed to get location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Submit                                                             */
  /* ------------------------------------------------------------------ */

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      // Map contact preference to the LostFoundItem type:
      //   'chat' / 'both' → 'dm' (both support in-app chat; phone is stored separately)
      //   'phone'        → 'phone'
      const mappedContact: 'dm' | 'phone' =
        selectedContact === 'phone' ? 'phone' : 'dm';

      const item: LostFoundItem = {
        id: `lf_${Date.now()}`,
        type: itemType,
        category: selectedCategory,
        title: title.trim(),
        description: description.trim(),
        image: photo,
        location: location.trim(),
        latitude,
        longitude,
        timestamp: Date.now(),
        reporterId: user?.uid || '',
        reporterName: user?.name || 'Anonymous',
        reporterAvatar: user?.avatar || '',
        contactMethod: mappedContact,
        phone: contactPhone || undefined,
        resolved: false,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };

      await saveLostFoundItem(item);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  const typeLabel = itemType === 'lost' ? 'Lost' : 'Found';

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report {typeLabel} Item</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Type Selector ─────────────────────────────────── */}
        <GlassCard style={styles.typeSelectorCard} noTouch>
          <Text style={styles.sectionLabel}>Type</Text>
          <View style={styles.typePillsRow}>
            <TouchableOpacity
              style={[
                styles.typePill,
                itemType === 'lost' && styles.typePillLostActive,
              ]}
              onPress={() => setItemType('lost')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="search"
                size={16}
                color={itemType === 'lost' ? Colors.alertRed : Colors.textMuted}
              />
              <Text
                style={[
                  styles.typePillText,
                  itemType === 'lost' && { color: Colors.alertRed, fontWeight: '700' },
                ]}
              >
                Lost
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typePill,
                itemType === 'found' && styles.typePillFoundActive,
              ]}
              onPress={() => setItemType('found')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="heart"
                size={16}
                color={itemType === 'found' ? Colors.accent : Colors.textMuted}
              />
              <Text
                style={[
                  styles.typePillText,
                  itemType === 'found' && { color: Colors.accent, fontWeight: '700' },
                ]}
              >
                Found
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* ── Category ─────────────────────────────────────── */}
        <GlassCard style={styles.sectionCard} noTouch>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_CHOICES.map((cat) => (
              <CategoryChip
                key={cat}
                label={cat}
                active={selectedCategory === cat}
                onPress={() => {
                  setSelectedCategory(cat);
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.category;
                    return next;
                  });
                }}
                color={itemType === 'lost' ? Colors.alertRed : Colors.accent}
              />
            ))}
          </View>
          {errors.category ? (
            <Text style={styles.errorText}>{errors.category}</Text>
          ) : null}
        </GlassCard>

        {/* ── Photo ────────────────────────────────────────── */}
        <GlassCard style={styles.sectionCard} noTouch>
          <Text style={styles.sectionLabel}>Photo</Text>
          <TouchableOpacity
            style={styles.photoPicker}
            onPress={handlePickPhoto}
            activeOpacity={0.75}
          >
            {photo ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <View style={styles.photoChangeBadge}>
                  <Ionicons name="camera" size={14} color={Colors.textPrimary} />
                </View>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </GlassCard>

        {/* ── Title ────────────────────────────────────────── */}
        <GlowInput
          label="Title"
          placeholder="e.g. Lost Brown Wallet"
          placeholderTextColor={Colors.textMuted}
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (errors.title) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.title;
                return next;
              });
            }
          }}
          icon="document-text-outline"
          error={errors.title}
        />

        {/* ── Description ──────────────────────────────────── */}
        <View style={styles.descriptionWrapper}>
          <Text style={styles.inputLabel}>Description</Text>
          <View
            style={[
              styles.descriptionContainer,
              errors.description ? styles.descriptionContainerError : null,
            ]}
          >
            <TextInput
              style={styles.descriptionInput}
              placeholder="Describe the item in detail — color, brand, distinguishing features..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (errors.description) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.description;
                    return next;
                  });
                }
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          {errors.description ? (
            <Text style={styles.errorText}>{errors.description}</Text>
          ) : null}
        </View>

        {/* ── Location ─────────────────────────────────────── */}
        <GlassCard style={styles.sectionCard} noTouch>
          <Text style={styles.sectionLabel}>Last Seen Location</Text>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleGetLocation}
            activeOpacity={0.7}
            disabled={locationLoading}
          >
            <Ionicons
              name={locationLoading ? 'hourglass-outline' : 'location-outline'}
              size={20}
              color={Colors.accent}
            />
            <Text style={styles.locationButtonText}>
              {locationLoading ? 'Getting location...' : 'Use My Location'}
            </Text>
            {locationLoading ? (
              <ActivityIndicator size="small" color={Colors.accent} style={{ marginLeft: 8 }} />
            ) : null}
          </TouchableOpacity>

          {location ? (
            <View style={styles.locationDisplay}>
              <Ionicons name="location" size={16} color={Colors.accent} />
              <Text style={styles.locationDisplayText} numberOfLines={2}>
                {location}
              </Text>
              <TouchableOpacity
                onPress={() => setLocation('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : null}

          {errors.location ? (
            <Text style={styles.errorText}>{errors.location}</Text>
          ) : null}
        </GlassCard>

        {/* ── Contact Preference ───────────────────────────── */}
        <GlassCard style={styles.sectionCard} noTouch>
          <Text style={styles.sectionLabel}>Contact Preference</Text>
          <View style={styles.contactRow}>
            {(Object.entries(CONTACT_OPTIONS) as [ContactKey, string][]).map(
              ([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.contactPill,
                    selectedContact === key && styles.contactPillActive,
                  ]}
                  onPress={() => setSelectedContact(key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.contactPillText,
                      selectedContact === key && styles.contactPillTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {selectedContact === 'phone' || selectedContact === 'both' ? (
            <View style={styles.phoneInputContainer}>
              <GlowInput
                placeholder="Enter phone number"
                placeholderTextColor={Colors.textMuted}
                value={contactPhone}
                onChangeText={setContactPhone}
                icon="call-outline"
                keyboardType="phone-pad"
                error={errors.contactPhone}
              />
            </View>
          ) : null}
        </GlassCard>

        {/* ── Submit Button ────────────────────────────────── */}
        <GlowButton
          title={`Report ${typeLabel} Item`}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          variant={itemType === 'lost' ? 'danger' : 'primary'}
          gradientColors={
            itemType === 'lost'
              ? ([Colors.error, Colors.errorLight] as [string, string])
              : ([Colors.primary, Colors.accent] as [string, string])
          }
          style={styles.submitButton}
          icon={
            <Ionicons
              name={itemType === 'lost' ? 'search' : 'heart'}
              size={20}
              color={Colors.textPrimary}
            />
          }
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* -------------------------------------------------------------------- */
/*  Styles                                                               */
/* -------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },

  /* Scroll */
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Cards */
  typeSelectorCard: {
    marginBottom: 16,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    marginBottom: 12,
  },

  /* Type Pills */
  typePillsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 8,
  },
  typePillLostActive: {
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderColor: 'rgba(255,68,68,0.4)',
  },
  typePillFoundActive: {
    backgroundColor: 'rgba(82,183,136,0.1)',
    borderColor: 'rgba(82,183,136,0.4)',
  },
  typePillText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },

  /* Category Chips */
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  /* Error */
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 2,
    fontFamily: 'Inter',
  },

  /* Photo */
  photoPicker: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderStyle: 'dashed',
  },
  photoPreviewContainer: {
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  photoChangeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholder: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: 'Inter',
  },

  /* Description (custom multiline input with glass theme) */
  descriptionWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  descriptionContainer: {
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  descriptionContainerError: {
    borderColor: Colors.error,
    borderWidth: 1.5,
  },
  descriptionInput: {
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    minHeight: 120,
    lineHeight: 22,
  },

  /* Location */
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(82,183,136,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.2)',
    gap: 10,
  },
  locationButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
    flex: 1,
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 8,
  },
  locationDisplayText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    lineHeight: 18,
  },

  /* Contact */
  contactRow: {
    flexDirection: 'row',
    gap: 8,
  },
  contactPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  contactPillActive: {
    backgroundColor: 'rgba(82,183,136,0.12)',
    borderColor: Colors.accent,
  },
  contactPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  contactPillTextActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
  phoneInputContainer: {
    marginTop: 12,
  },

  /* Submit */
  submitButton: {
    marginTop: 8,
  },
});

export default CreateLostFoundScreen;
