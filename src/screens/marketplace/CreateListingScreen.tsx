import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import GlowInput from '../../components/glass/GlowInput';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import { saveListing } from '../../services/dataService';
import type { Listing } from '../../services/dataService';
import CategoryChip from '../../components/shared/CategoryChip';
import { generateId } from '../../utils/helpers';

const CATEGORIES = ['Furniture', 'Electronics', 'Clothing', 'Books', 'Sports', 'Other'];

const CONDITIONS = ['New', 'Like New', 'Excellent', 'Good', 'Used'];

const CreateListingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();

  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const location = user?.address || user?.area || '';

  const handleAddPhoto = async () => {
    if (images.length >= 10) {
      Alert.alert('Limit Reached', 'You can add up to 10 photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...newUris].slice(0, 10));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter a title.');
      return;
    }
    if (!category) {
      Alert.alert('Missing Field', 'Please select a category.');
      return;
    }
    if (!condition) {
      Alert.alert('Missing Field', 'Please select a condition.');
      return;
    }
    if (!isFree && (!price || parseFloat(price) <= 0)) {
      Alert.alert('Missing Field', 'Please enter a valid price or toggle Free.');
      return;
    }

    setSubmitting(true);

    const finalPrice = isFree ? 0 : parseFloat(price);

    const listing: Listing = {
      id: generateId(),
      title: title.trim(),
      price: finalPrice,
      image: images.length > 0 ? images[0] : null,
      images: images.length > 0 ? images : undefined,
      category,
      location,
      timestamp: Date.now(),
      condition,
      sellerName: user?.name || '',
      sellerId: user?.uid || '',
      sellerAvatar: user?.avatar || '',
      description: description.trim() || undefined,
      status: 'available',
      viewCount: 0,
    };

    try {
      await saveListing(listing);
      Alert.alert('Success', 'Your listing has been created.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to save listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Listing</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Photos Section */}
        <GlassCard style={styles.sectionCard} noTouch>
          <Text style={styles.sectionLabel}>Photos</Text>
          <Text style={styles.sectionHint}>
            Add up to 10 photos ({images.length}/10)
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosRow}
          >
            {images.map((uri, index) => (
              <View key={`photo-${index}`} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => handleRemovePhoto(index)}
                >
                  <Ionicons name="close-circle" size={22} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 10 && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto}>
                <Ionicons name="camera-outline" size={28} color={Colors.accent} />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </GlassCard>

        {/* Title */}
        <GlowInput
          label="Title"
          placeholder="e.g. Vintage Wooden Desk"
          value={title}
          onChangeText={setTitle}
          icon="document-text-outline"
        />

        {/* Description */}
        <GlowInput
          label="Description"
          placeholder="Describe your item..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{ minHeight: 100 }}
        />

        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                label={cat}
                active={category === cat}
                onPress={() => setCategory(cat)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Condition */}
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>Condition</Text>
          <View style={styles.conditionRow}>
            {CONDITIONS.map((cond) => (
              <TouchableOpacity
                key={cond}
                style={[
                  styles.conditionPill,
                  condition === cond && styles.conditionPillActive,
                ]}
                onPress={() => setCondition(cond)}
              >
                <Text
                  style={[
                    styles.conditionPillText,
                    condition === cond && styles.conditionPillTextActive,
                  ]}
                >
                  {cond}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price */}
        <View style={styles.fieldGroup}>
          <Text style={styles.sectionLabel}>Price</Text>
          <View style={styles.priceRow}>
            <View style={styles.priceInputContainer}>
              <GlowInput
                placeholder="0"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                icon="pricetag-outline"
                editable={!isFree}
                containerStyle={{ flex: 1, marginBottom: 0 }}
              />
              {!isFree && (
                <Text style={styles.currencyLabel}>PKR</Text>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.freeToggle,
                isFree && styles.freeToggleActive,
              ]}
              onPress={() => {
                setIsFree(!isFree);
                if (!isFree) setPrice('');
              }}
            >
              <Text
                style={[
                  styles.freeToggleText,
                  isFree && styles.freeToggleTextActive,
                ]}
              >
                Free
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Location (auto-filled) */}
        <GlassCard style={styles.sectionCard} noTouch>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={20} color={Colors.accent} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Location</Text>
              <Text style={styles.locationValue}>
                {location || 'No address set in profile'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Submit Button */}
        <GlowButton
          title={submitting ? 'Creating...' : 'Create Listing'}
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          size="lg"
          style={styles.submitButton}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  closeButton: {
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
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginBottom: 12,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 2,
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    borderStyle: 'dashed',
    backgroundColor: Colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 10,
    color: Colors.accent,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionPill: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  conditionPillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  conditionPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  conditionPillTextActive: {
    color: Colors.textPrimary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
    position: 'relative',
  },
  currencyLabel: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
    lineHeight: 48,
  },
  freeToggle: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  freeToggleActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  freeToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  freeToggleTextActive: {
    color: Colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  locationValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 20,
  },
});

export default CreateListingScreen;
