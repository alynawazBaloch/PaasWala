import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import GlowInput from '../../components/glass/GlowInput';
import CategoryChip from '../../components/shared/CategoryChip';
import Colors from '../../utils/colors';
import { saveBusiness } from '../../services/dataService';
import type { Business, BusinessHours } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const CATEGORIES = ['Restaurants', 'Retail', 'Services', 'Healthcare', 'Education', 'Fitness', 'Other'];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

const CreateBusinessScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  /* ---- Role check ---- */
  if (user && user.role !== 'business') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <View style={styles.restrictedIconWrapper}>
            <Ionicons name="shield" size={64} color={Colors.warning} />
          </View>
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedText}>Only business owners can create listings</Text>
          <GlowButton
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={styles.restrictedBackBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  /* ---- Form state ---- */
  const [logo, setLogo] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>(
    DAYS.map((day) => ({ day, open: '9:00 AM', close: '9:00 PM' }))
  );
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  /* ---- Logo / Photo picker ---- */
  const handlePickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to pick a logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setLogo(result.assets[0].uri);
    }
  };

  /* ---- Additional photos ---- */
  const handleAddPhoto = async () => {
    if (additionalPhotos.length >= 6) {
      Alert.alert('Limit reached', 'You can add a maximum of 6 photos.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setAdditionalPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setAdditionalPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  /* ---- Location ---- */
  const handleUseMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to use your current location.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);

      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocode.length > 0) {
        const addr = geocode[0];
        const parts = [addr.name, addr.street, addr.city, addr.region, addr.postalCode].filter(
          (p): p is string => !!p
        );
        setLocation(parts.join(', '));
      } else {
        setLocation(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      }
    } catch (err) {
      console.warn('[CreateBusiness] location error:', err);
      Alert.alert('Error', 'Could not fetch your location. Please try again.');
    } finally {
      setLocating(false);
    }
  };

  /* ---- Hours change handler ---- */
  const handleHoursChange = (index: number, field: 'open' | 'close', value: string) => {
    setBusinessHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  };

  /* ---- Submit ---- */
  const handleSubmit = async () => {
    /* Validation */
    if (!name.trim()) {
      Alert.alert('Missing field', 'Please enter a business name.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Missing field', 'Please select a category.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing field', 'Please enter a description.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Missing field', 'Please enter a phone number.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Missing field', 'Please set your business location.');
      return;
    }

    const hasHours = businessHours.some((h) => h.open.trim() && h.close.trim());
    if (!hasHours) {
      Alert.alert('Missing field', 'Please add at least one day of operating hours.');
      return;
    }

    setSaving(true);
    try {
      const business: Business = {
        id: `biz_${Date.now()}`,
        name: name.trim(),
        category: selectedCategory,
        description: description.trim(),
        image: logo,
        photos: additionalPhotos,
        phone: phone.trim(),
        website: website.trim(),
        email,
        location,
        latitude,
        longitude,
        hours: businessHours,
        ownerId: user?.uid || '',
        ownerName: user?.name || '',
        neighborhoodId: user?.neighborhoodId || '',
        createdAt: Date.now(),
        distance: '',
        verified: false,
        rating: 0,
        reviewCount: 0,
        isOpen: false,
        viewCount: 0,
        totalReviews: 0,
        averageRating: 0,
        inquiryCount: 0,
      };

      await saveBusiness(business);
      Alert.alert('Success', 'Your business listing has been created!');
      navigation.goBack();
    } catch (err) {
      console.warn('[CreateBusiness] save failed:', err);
      Alert.alert('Error', 'Could not save the business. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ---- Render ---- */
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Business</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ============ Logo / Photo ============ */}
        <GlassCard style={styles.formCard}>
          <Text style={styles.label}>Business Logo</Text>
          <TouchableOpacity
            style={styles.logoPicker}
            onPress={handlePickLogo}
            activeOpacity={0.8}
          >
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logoPreview} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="camera-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.logoPlaceholderText}>Add Logo</Text>
              </View>
            )}
            <View style={styles.logoOverlay}>
              <Ionicons name="image-outline" size={18} color={Colors.textPrimary} />
            </View>
          </TouchableOpacity>

          {/* ============ Business Name ============ */}
          <Text style={styles.label}>Business Name</Text>
          <GlowInput
            placeholder="Enter your business name"
            value={name}
            onChangeText={setName}
            icon="business"
          />

          {/* ============ Category ============ */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                label={cat}
                active={selectedCategory === cat}
                onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              />
            ))}
          </View>

          {/* ============ Description ============ */}
          <Text style={styles.label}>Description</Text>
          <View style={styles.descriptionContainer}>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Describe your business..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
        </GlassCard>

        {/* ============ Hours ============ */}
        <GlassCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          {businessHours.map((hour, index) => (
            <View key={hour.day} style={styles.hoursRow}>
              <Text style={styles.hoursDayLabel}>{hour.day.slice(0, 3)}</Text>
              <View style={styles.hoursInputs}>
                <TextInput
                  style={styles.hoursInput}
                  placeholder="9:00 AM"
                  placeholderTextColor={Colors.textMuted}
                  value={hour.open}
                  onChangeText={(val) => handleHoursChange(index, 'open', val)}
                />
                <Text style={styles.hoursSeparator}>to</Text>
                <TextInput
                  style={styles.hoursInput}
                  placeholder="9:00 PM"
                  placeholderTextColor={Colors.textMuted}
                  value={hour.close}
                  onChangeText={(val) => handleHoursChange(index, 'close', val)}
                />
              </View>
            </View>
          ))}
        </GlassCard>

        {/* ============ Contact ============ */}
        <GlassCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <Text style={styles.label}>Phone</Text>
          <GlowInput
            placeholder="(555) 123-4567"
            value={phone}
            onChangeText={setPhone}
            icon="call-outline"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Website</Text>
          <GlowInput
            placeholder="https://example.com"
            value={website}
            onChangeText={setWebsite}
            icon="globe-outline"
            autoCapitalize="none"
            keyboardType="url"
          />

          <Text style={styles.label}>Email</Text>
          <GlowInput
            placeholder="contact@business.com"
            value={email}
            onChangeText={setEmail}
            icon="mail-outline"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </GlassCard>

        {/* ============ Location ============ */}
        <GlassCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Location</Text>

          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleUseMyLocation}
            activeOpacity={0.7}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator color={Colors.accent} size="small" />
            ) : (
              <Ionicons name="locate" size={20} color={Colors.accent} />
            )}
            <Text style={styles.locationButtonText}>
              {locating ? 'Getting location...' : 'Use My Location'}
            </Text>
          </TouchableOpacity>

          {location ? (
            <View style={styles.selectedAddress}>
              <Ionicons name="location" size={18} color={Colors.accent} />
              <Text style={styles.addressText}>{location}</Text>
            </View>
          ) : null}
        </GlassCard>

        {/* ============ Additional Photos ============ */}
        <GlassCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Additional Photos</Text>
          <Text style={styles.sectionSubtitle}>Up to 6 photos (optional)</Text>

          <View style={styles.photoGrid}>
            {additionalPhotos.map((photo, index) => (
              <View key={index} style={styles.photoCell}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.photoRemoveBtn}
                  onPress={() => handleRemovePhoto(index)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={22} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {additionalPhotos.length < 6 && (
              <TouchableOpacity
                style={styles.photoAddCell}
                onPress={handleAddPhoto}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={32} color={Colors.accent} />
                <Text style={styles.photoAddText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </GlassCard>

        {/* ============ Submit ============ */}
        <GlowButton
          title={saving ? 'Creating...' : 'Create Business'}
          onPress={handleSubmit}
          size="lg"
          loading={saving}
          icon={<Ionicons name="briefcase" size={20} color={Colors.textPrimary} />}
          style={styles.createButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  restrictedIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  restrictedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 12,
    textAlign: 'center',
  },
  restrictedText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  restrictedBackBtn: {
    minWidth: 160,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },

  /* Content */
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  formCard: {
    marginBottom: 20,
  },

  /* Labels */
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginBottom: 6,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginBottom: 12,
    marginTop: -4,
  },

  /* Logo picker */
  logoPicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignSelf: 'center',
    marginVertical: 8,
    position: 'relative',
  },
  logoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  logoPlaceholderText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter',
  },
  logoOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Category chips */
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },

  /* Description */
  descriptionContainer: {
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 12,
    marginTop: 4,
  },
  descriptionInput: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: 'Inter',
    minHeight: 100,
    lineHeight: 22,
  },

  /* Hours */
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  hoursDayLabel: {
    width: 40,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  hoursInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hoursInput: {
    flex: 1,
    backgroundColor: Colors.glassBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  hoursSeparator: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },

  /* Location */
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 8,
  },
  locationButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
  },
  selectedAddress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    lineHeight: 18,
  },

  /* Photo grid */
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoCell: {
    width: 100,
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  photoAddCell: {
    width: 100,
    height: 100,
    borderRadius: 14,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  photoAddText: {
    fontSize: 12,
    color: Colors.accent,
    fontFamily: 'Inter',
    fontWeight: '500',
  },

  /* Submit */
  createButton: {
    marginTop: 4,
  },
});

export default CreateBusinessScreen;
