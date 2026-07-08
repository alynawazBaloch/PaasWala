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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import GlowInput from '../../components/glass/GlowInput';
import GlassModal from '../../components/glass/GlassModal';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import { saveEvent } from '../../services/dataService';
import type { Event as PSEvent } from '../../services/dataService';

type Category = 'social' | 'sports' | 'religious' | 'cleanup' | 'emergency' | 'other';

const CATEGORIES: { label: string; value: Category }[] = [
  { label: 'Social', value: 'social' },
  { label: 'Sports', value: 'sports' },
  { label: 'Religious', value: 'religious' },
  { label: 'Cleanup', value: 'cleanup' },
  { label: 'Emergency', value: 'emergency' },
  { label: 'Other', value: 'other' },
];

const CreateEventScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();

  /* ---- Form state ---- */
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [maxAttendees, setMaxAttendees] = useState('');
  const [saving, setSaving] = useState(false);

  /* ---- Cover photo ---- */
  const handlePickCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to pick a cover image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setCoverPhoto(result.assets[0].uri);
    }
  };

  /* ---- Use My Location ---- */
  const handleUseMyLocation = () => {
    setLocation('My Location');
  };

  /* ---- Create ---- */
  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Missing field', 'Please enter an event title.');
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();
      const newEvent: PSEvent = {
        id: 'evt_' + now.toString(36) + Math.random().toString(36).substr(2, 6),
        title: title.trim(),
        date: date.trim(),
        time: time.trim(),
        location: location.trim(),
        image: coverPhoto,
        coverPhoto,
        attendees: [],
        attendeeCount: 0,
        rsvp: null,
        createdBy: user?.name ?? 'A Resident',
        createdById: user?.uid,
        description: description.trim(),
        category: category ?? undefined,
        maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
        createdAt: now,
      };

      await saveEvent(newEvent);
      Alert.alert('Success', 'Your event has been created!');
      navigation?.goBack();
    } catch (err) {
      console.warn('[CreateEvent] save failed:', err);
      Alert.alert('Error', 'Could not save the event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.formCard}>
          {/* Cover Photo */}
          <Text style={styles.label}>Cover Photo</Text>
          <TouchableOpacity style={styles.coverPicker} onPress={handlePickCover} activeOpacity={0.8}>
            {coverPhoto ? (
              <Image source={{ uri: coverPhoto }} style={styles.coverPreview} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="camera-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.coverPlaceholderText}>Tap to add cover photo</Text>
              </View>
            )}
            <View style={styles.coverOverlay}>
              <Ionicons name="image-outline" size={20} color={Colors.textPrimary} />
            </View>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.label}>Event Title</Text>
          <GlowInput
            placeholder="What's the event?"
            value={title}
            onChangeText={setTitle}
            icon="calendar"
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <GlowInput
            placeholder="Describe your event..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            containerStyle={styles.multilineInput}
            icon="document-text"
          />

          {/* Date & Time row */}
          <View style={styles.row}>
            <View style={styles.rowHalf}>
              <Text style={styles.label}>Date</Text>
              <GlowInput
                placeholder="e.g. 25 Dec 2025"
                value={date}
                onChangeText={setDate}
                icon="calendar"
              />
            </View>
            <View style={styles.rowHalf}>
              <Text style={styles.label}>Time</Text>
              <GlowInput
                placeholder="e.g. 6:00 PM"
                value={time}
                onChangeText={setTime}
                icon="time"
              />
            </View>
          </View>

          {/* Location */}
          <Text style={styles.label}>Location</Text>
          <View style={styles.locationRow}>
            <View style={styles.locationInput}>
              <GlowInput
                placeholder="Where is it?"
                value={location}
                onChangeText={setLocation}
                icon="location"
              />
            </View>
            <TouchableOpacity style={styles.useLocationBtn} onPress={handleUseMyLocation} activeOpacity={0.7}>
              <Ionicons name="locate" size={20} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const selected = category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.categoryChip, selected && styles.categoryChipActive]}
                  onPress={() => setCategory(selected ? null : cat.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Max Attendees */}
          <Text style={styles.label}>Max Attendees (optional)</Text>
          <GlowInput
            placeholder="e.g. 50"
            value={maxAttendees}
            onChangeText={setMaxAttendees}
            keyboardType="numeric"
            icon="people"
          />
        </GlassCard>

        <GlowButton
          title={saving ? 'Creating...' : 'Create Event'}
          onPress={handleCreate}
          size="lg"
          loading={saving}
          icon={<Ionicons name="add-circle" size={20} color={Colors.textPrimary} />}
          style={styles.createButton}
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  formCard: {
    marginBottom: 24,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginBottom: 6,
    marginTop: 12,
  },
  multilineInput: {
    minHeight: 80,
  },
  /* Cover photo */
  coverPicker: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    height: 180,
    position: 'relative',
  },
  coverPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coverPlaceholderText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Inter',
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Row layout */
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowHalf: {
    flex: 1,
  },
  /* Location */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  locationInput: {
    flex: 1,
  },
  useLocationBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  /* Category chips */
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent,
  },
  categoryChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  categoryChipTextActive: {
    color: Colors.textPrimary,
  },
  createButton: {
    marginTop: 8,
  },
});

export default CreateEventScreen;
