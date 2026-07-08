import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import GlowInput from '../../components/glass/GlowInput';
import AvatarBadge from '../../components/shared/AvatarBadge';
import CategoryChip from '../../components/shared/CategoryChip';
import Colors from '../../utils/colors';
import { savePost } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_CHARS = 500;

const CATEGORY_OPTIONS = [
  { label: 'General', key: 'general', icon: 'document-text' as const },
  { label: 'Announcement', key: 'announcement', icon: 'megaphone' as const },
  { label: 'Question', key: 'question', icon: 'help-circle' as const },
  { label: 'Recommendation', key: 'recommendation', icon: 'star' as const },
  { label: 'Appreciation', key: 'appreciation', icon: 'heart' as const },
  { label: 'Urgent', key: 'urgent', icon: 'warning' as const },
  { label: 'Safety', key: 'safety', icon: 'shield-checkmark' as const },
  { label: 'News', key: 'news', icon: 'newspaper' as const },
  { label: 'Sale', key: 'sale', icon: 'pricetag' as const },
  { label: 'Event', key: 'event', icon: 'calendar' as const },
  { label: 'Lost & Found', key: 'lost_found', icon: 'search' as const },
  { label: 'Alert', key: 'alert', icon: 'alert-circle' as const },
];

const PostComposerScreen: React.FC<{ navigation?: any; route?: any }> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const { user, isVerified } = useAuth();
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [audience, setAudience] = useState<'public' | 'neighborhood'>('neighborhood');
  const [mediaAttachments, setMediaAttachments] = useState<string[]>([]);
  const [locationTag, setLocationTag] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const charsRemaining = MAX_CHARS - content.length;
  const isValid = content.trim().length > 0 && charsRemaining >= 0;

  // Gate: unverified users cannot post
  useEffect(() => {
    if (!isVerified) {
      Alert.alert(
        'Verification Required',
        'Please verify your address before posting in the neighborhood.',
        [{ text: 'OK', onPress: () => navigation?.goBack() }]
      );
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);

    const postObj = {
      id: 'post_' + Date.now().toString(36),
      authorId: user?.uid ?? 'unknown',
      authorName: user?.name ?? 'You',
      authorAvatar: user?.avatar ?? '',
      authorRole: user?.role ?? 'resident',
      verified: user?.verified ?? false,
      street: user?.streetName ?? '',
      neighborhoodId: user?.neighborhoodId ?? undefined,
      neighborhoodName: user?.neighborhoodName ?? undefined,
      content: content.trim(),
      media: mediaAttachments,
      category: selectedCategory,
      likesCount: 0,
      commentsCount: 0,
      userLiked: false,
      timestamp: Date.now(),
      location: locationTag ?? undefined,
      audience,
    };

    await savePost(postObj);
    setIsSubmitting(false);
    navigation?.goBack();
  }, [isValid, isSubmitting, content, selectedCategory, audience, navigation, user, mediaAttachments, locationTag]);

  const handleCancel = useCallback(() => {
    navigation?.goBack();
  }, [navigation]);

  const pickImage = useCallback(async () => {
    try {
      if (mediaAttachments.length >= 10) {
        Alert.alert('Limit Reached', 'You can attach up to 10 photos per post.');
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera roll access to attach media.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const remaining = 10 - mediaAttachments.length;
        const newUris = result.assets.slice(0, remaining).map(a => a.uri);
        setMediaAttachments(prev => [...prev, ...newUris]);
        if (result.assets.length > remaining) {
          Alert.alert('Limit Reached', `Only ${remaining} more photo${remaining > 1 ? 's' : ''} could be added.`);
        }
      }
    } catch (err) {
      console.error('[PostComposer] Image picker error:', err);
    }
  }, [mediaAttachments.length]);

  const pickCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera access to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setMediaAttachments(prev => [...prev, result.assets[0].uri]);
      }
    } catch (err) {
      console.error('[PostComposer] Camera error:', err);
    }
  }, []);

  const removeMedia = useCallback((index: number) => {
    setMediaAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need location access to tag your post.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results.length > 0) {
        const addr = results[0];
        const parts = [addr.street, addr.name, addr.district, addr.city].filter(Boolean);
        setLocationTag(parts.join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      } else {
        setLocationTag(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (err) {
      console.warn('[PostComposer] Location fetch failed:', err);
      Alert.alert('Location Error', 'Could not get your current location. Please try again.');
    }
  }, []);

  const toggleAudience = useCallback(() => {
    setAudience((prev) =>
      prev === 'public' ? 'neighborhood' : 'public'
    );
  }, []);

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
      <TouchableOpacity onPress={handleCancel} activeOpacity={0.7} style={styles.headerBtn}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>New Post</Text>

      <GlowButton
        title="Share"
        onPress={handleShare}
        size="sm"
        disabled={!isValid || isSubmitting}
        loading={isSubmitting}
        style={styles.shareButton}
      />
    </View>
  );

  const renderAudienceSelector = () => (
    <View style={styles.audienceRow}>
      <AvatarBadge name="You" avatar="" size={40} role="resident" verified={false} />
      <View style={styles.audienceRight}>
        <Text style={styles.authorLabel}>You</Text>
        <TouchableOpacity
          style={styles.audiencePill}
          onPress={toggleAudience}
          activeOpacity={0.7}
        >
          <Ionicons
            name={audience === 'public' ? 'globe-outline' : 'people-outline'}
            size={14}
            color={Colors.accent}
          />
          <Text style={styles.audiencePillText}>
            {audience === 'public' ? 'Public' : 'Neighborhood'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={Colors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContentInput = () => (
    <View style={styles.inputSection}>
      <View style={styles.textAreaContainer}>
        <GlowInput
          placeholder="What's on your mind?"
          value={content}
          onChangeText={setContent}
          multiline
          containerStyle={styles.textAreaWrapper}
          textAlignVertical="top"
        />
      </View>

      {/* Character Counter */}
      <View style={styles.charCounter}>
        <View
          style={[
            styles.charBar,
            {
              width: `${(content.length / MAX_CHARS) * 100}%`,
              backgroundColor:
                charsRemaining < 50
                  ? Colors.error
                  : charsRemaining < 200
                  ? Colors.warning
                  : Colors.accent,
            },
          ]}
        />
        <Text
          style={[
            styles.charCountText,
            charsRemaining < 50 && { color: Colors.error },
            charsRemaining < 200 && charsRemaining >= 50 && { color: Colors.warning },
          ]}
        >
          {charsRemaining}
        </Text>
      </View>
    </View>
  );

  const renderMediaGrid = () => (
    <View style={styles.mediaSection}>
      <View style={styles.sectionLabel}>
        <Ionicons name="images-outline" size={18} color={Colors.textSecondary} />
        <Text style={styles.sectionLabelText}>Media</Text>
      </View>

      <View style={styles.mediaGrid}>
        {mediaAttachments.map((_, index) => (
          <View key={index} style={styles.mediaThumb}>
            <View style={styles.mediaThumbInner}>
              <Ionicons name="image" size={28} color={Colors.textMuted} />
            </View>
            <TouchableOpacity style={styles.mediaRemoveBtn} activeOpacity={0.7} onPress={() => removeMedia(index)}>
              <Ionicons name="close-circle" size={22} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.mediaAddBtn} activeOpacity={0.7} onPress={pickImage}>
          <Ionicons name="add" size={32} color={Colors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategorySelector = () => (
    <View style={styles.categorySection}>
      <View style={styles.sectionLabel}>
        <Ionicons name="pricetag-outline" size={18} color={Colors.textSecondary} />
        <Text style={styles.sectionLabelText}>Category</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORY_OPTIONS.map((cat) => (
          <CategoryChip
            key={cat.key}
            label={cat.label}
            active={selectedCategory === cat.key}
            onPress={() => setSelectedCategory(cat.key)}
            color={
              cat.key === 'urgent'
                ? Colors.error
                : cat.key === 'announcement'
                ? Colors.primary
                : Colors.accent
            }
            icon={
              <Ionicons
                name={cat.icon}
                size={14}
                color={
                  selectedCategory === cat.key
                    ? Colors.textPrimary
                    : Colors.textSecondary
                }
              />
            }
          />
        ))}
      </ScrollView>
    </View>
  );

  const renderLocationTag = () => {
    if (!locationTag) {
      return (
        <TouchableOpacity style={styles.locationAddBtn} activeOpacity={0.7} onPress={handleAddLocation}>
          <Ionicons name="location-outline" size={18} color={Colors.accent} />
          <Text style={styles.locationAddText}>Add location</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.locationTag}>
        <Ionicons name="location" size={16} color={Colors.accent} />
        <Text style={styles.locationTagText}>{locationTag}</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setLocationTag(null)}>
          <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderToolbar = () => (
    <View style={[styles.toolbar, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.toolbarDivider} />
      <View style={styles.toolbarRow}>
        <TouchableOpacity style={styles.toolbarBtn} activeOpacity={0.7} onPress={pickImage}>
          <View style={styles.toolbarIconBg}>
            <Ionicons name="images-outline" size={22} color={Colors.accent} />
          </View>
          <Text style={styles.toolbarLabel}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolbarBtn} activeOpacity={0.7} onPress={pickCamera}>
          <View style={styles.toolbarIconBg}>
            <Ionicons name="camera-outline" size={22} color={Colors.accent} />
          </View>
          <Text style={styles.toolbarLabel}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolbarBtn} activeOpacity={0.7} onPress={handleAddLocation}>
          <View style={styles.toolbarIconBg}>
            <Ionicons name="location-outline" size={22} color={Colors.accent} />
          </View>
          <Text style={styles.toolbarLabel}>Location</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolbarBtn} activeOpacity={0.7} onPress={() => Alert.alert('Poll', 'Poll creation coming soon.')}>
          <View style={styles.toolbarIconBg}>
            <Ionicons name="bar-chart-outline" size={22} color={Colors.accent} />
          </View>
          <Text style={styles.toolbarLabel}>Poll</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderHeader()}

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Author & Audience */}
          <GlassCard style={styles.composerCard} noTouch>
            {renderAudienceSelector()}

            {/* Content Input */}
            {renderContentInput()}

            {/* Media Grid */}
            {renderMediaGrid()}

            {/* Category */}
            {renderCategorySelector()}

            {/* Location */}
            {renderLocationTag()}
          </GlassCard>
        </ScrollView>

        {/* Bottom Toolbar */}
        {renderToolbar()}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  shareButton: {
    minWidth: 70,
  },

  // Composer
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  composerCard: {
    padding: 16,
  },

  // Audience
  audienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  audienceRight: {
    marginLeft: 12,
    flex: 1,
  },
  authorLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  audiencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  audiencePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
  },

  // Input
  inputSection: {
    marginBottom: 8,
  },
  textAreaContainer: {
    minHeight: 120,
  },
  textAreaWrapper: {
    marginBottom: 0,
  },
  charCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    height: 4,
    backgroundColor: Colors.glassBg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  charBar: {
    height: '100%',
    borderRadius: 2,
  },
  charCountText: {
    position: 'absolute',
    right: 0,
    top: 8,
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    fontFamily: 'Inter',
  },

  // Media
  mediaSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaThumb: {
    position: 'relative',
  },
  mediaThumbInner: {
    width: (SCREEN_WIDTH - 80) / 3,
    height: (SCREEN_WIDTH - 80) / 3,
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 2,
  },
  mediaAddBtn: {
    width: (SCREEN_WIDTH - 80) / 3,
    height: (SCREEN_WIDTH - 80) / 3,
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category
  categorySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  categoryScroll: {
    paddingVertical: 4,
  },

  // Location
  locationAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    paddingVertical: 4,
  },
  locationAddText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  locationTagText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
    fontFamily: 'Inter',
  },

  // Toolbar
  toolbar: {
    backgroundColor: Colors.secondaryBg,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  toolbarDivider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginBottom: 10,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  toolbarBtn: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  toolbarIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
});

export default PostComposerScreen;
