import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import CategoryChip from '../../components/shared/CategoryChip';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import { reportPost } from '../../services/dataService';
import type { Post, PostReport } from '../../services/dataService';

/* ------------------------------------------------------------------ */
/*  Reason option config                                               */
/* ------------------------------------------------------------------ */

type ReasonOption = {
  key: PostReport['reason'];
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const REASONS: ReasonOption[] = [
  { key: 'spam', label: 'Spam', icon: 'flag' },
  { key: 'inappropriate', label: 'Inappropriate', icon: 'alert-circle' },
  { key: 'dangerous', label: 'Dangerous', icon: 'warning' },
  { key: 'fake', label: 'Fake', icon: 'shield' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

/* ------------------------------------------------------------------ */
/*  Route params                                                       */
/* ------------------------------------------------------------------ */

type ReportPostRouteParams = {
  ReportPost: { post: Post };
};

type RouteProps = RouteProp<ReportPostRouteParams, 'ReportPost'>;

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

const ReportPostScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();

  const { post } = route.params;
  const { user } = useAuth();

  const [selectedReason, setSelectedReason] = useState<PostReport['reason'] | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ---------- Submit handler ---------- */

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) {
      Alert.alert('Select a Reason', 'Please select a reason for reporting this post.');
      return;
    }

    if (!user) {
      Alert.alert('Not Logged In', 'You must be logged in to report a post.');
      return;
    }

    setSubmitting(true);
    try {
      await reportPost(
        post.id,
        selectedReason,
        user.uid,
        user.name,
        description.trim() || undefined,
      );
      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep the community safe.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedReason, description, user, post.id, navigation]);

  /* ---------- Content preview (first ~2 lines) ---------- */

  const previewContent =
    post.content.length > 120
      ? post.content.substring(0, 120) + '...'
      : post.content;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.top}
      >
        {/* ---- Header ---- */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Post</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ---- Post Preview ---- */}
          <GlassCard style={styles.previewCard} intensity={30}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewAuthor}>{post.authorName}</Text>
              <CategoryChip label={post.category} active />
            </View>
            <Text style={styles.previewContent} numberOfLines={2}>
              {previewContent}
            </Text>
          </GlassCard>

          {/* ---- Section heading ---- */}
          <Text style={styles.sectionTitle}>Why are you reporting this post?</Text>

          {/* ---- Reason Options ---- */}
          <View style={styles.reasonList}>
            {REASONS.map((reason) => {
              const isSelected = selectedReason === reason.key;
              return (
                <TouchableOpacity
                  key={reason.key}
                  style={[
                    styles.reasonItem,
                    isSelected && styles.reasonItemSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedReason(reason.key)}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <Ionicons
                    name={reason.icon}
                    size={20}
                    color={isSelected ? Colors.accent : Colors.textSecondary}
                    style={styles.reasonIcon}
                  />
                  <Text
                    style={[
                      styles.reasonLabel,
                      isSelected && styles.reasonLabelSelected,
                    ]}
                  >
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ---- Description ---- */}
          <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Provide any additional context..."
              placeholderTextColor={Colors.textMuted}
              multiline
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
          </View>

          {/* ---- Submit ---- */}
          <GlowButton
            title="Submit Report"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting || !selectedReason}
            style={styles.submitButton}
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  headerSpacer: {
    width: 40,
  },

  /* Scroll */
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  /* Post Preview */
  previewCard: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  previewAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  previewContent: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontFamily: 'Inter',
  },

  /* Section */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 14,
    fontFamily: 'Inter',
  },

  /* Reason Options */
  reasonList: {
    marginBottom: 24,
    gap: 10,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  reasonItemSelected: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(82,183,136,0.08)',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: Colors.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accent,
  },
  reasonIcon: {
    marginRight: 10,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  reasonLabelSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },

  /* Description Input */
  inputWrapper: {
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 28,
    overflow: 'hidden',
  },
  textInput: {
    minHeight: 110,
    padding: 16,
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },

  /* Submit */
  submitButton: {
    width: '100%',
  },
});

export default ReportPostScreen;
