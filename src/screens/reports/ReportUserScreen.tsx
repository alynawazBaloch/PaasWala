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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import AvatarBadge from '../../components/shared/AvatarBadge';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import { reportUser } from '../../services/dataService';
import type { UserData } from '../../context/AuthContext';

type ReportUserRouteParams = {
  ReportUser: { user: UserData };
};

type ReportUserRouteProp = RouteProp<ReportUserRouteParams, 'ReportUser'>;

interface ReasonOption {
  key: 'spam' | 'harassment' | 'fake' | 'dangerous' | 'other';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const reasons: ReasonOption[] = [
  { key: 'spam', label: 'Spam', icon: 'flag-outline' },
  { key: 'harassment', label: 'Harassment', icon: 'hand-left-outline' },
  { key: 'fake', label: 'Fake Account', icon: 'shield-outline' },
  { key: 'dangerous', label: 'Dangerous', icon: 'warning-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const ReportUserScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ReportUserRouteProp>();
  const { user: targetUser } = route.params;
  const { user: currentUser } = useAuth();

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select a Reason', 'Please select a reason for reporting this user.');
      return;
    }
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to report a user.');
      return;
    }
    setSubmitting(true);
    try {
      await reportUser(
        targetUser.uid,
        targetUser.name,
        selectedReason as 'spam' | 'harassment' | 'fake' | 'dangerous' | 'other',
        currentUser.uid,
        currentUser.name,
        description.trim() || undefined,
      );
      Alert.alert('Report Submitted', 'Thank you for your report. Our team will review this shortly.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Report User</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User preview */}
        <GlassCard style={styles.userCard} noTouch>
          <View style={styles.userRow}>
            <AvatarBadge
              name={targetUser.name}
              avatar={targetUser.avatar}
              size={52}
              role={targetUser.role}
              verified={targetUser.verified}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{targetUser.name}</Text>
              <Text style={styles.userRole}>
                {targetUser.role === 'admin'
                  ? 'Neighborhood Admin'
                  : targetUser.role === 'superAdmin'
                  ? 'Super Admin'
                  : targetUser.role === 'business'
                  ? 'Business Owner'
                  : 'Resident'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Reason selector */}
        <Text style={styles.sectionTitle}>Reason for Report</Text>
        <GlassCard style={styles.reasonsCard} noTouch>
          {reasons.map((reason, index) => (
            <TouchableOpacity
              key={reason.key}
              style={[
                styles.reasonRow,
                index < reasons.length - 1 && styles.reasonRowBorder,
                selectedReason === reason.key && styles.reasonRowSelected,
              ]}
              onPress={() => setSelectedReason(reason.key)}
              activeOpacity={0.7}
            >
              <View style={styles.reasonLeft}>
                <Ionicons
                  name={reason.icon}
                  size={22}
                  color={selectedReason === reason.key ? Colors.accent : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.reasonLabel,
                    selectedReason === reason.key && styles.reasonLabelSelected,
                  ]}
                >
                  {reason.label}
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  selectedReason === reason.key && styles.radioSelected,
                ]}
              >
                {selectedReason === reason.key && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </GlassCard>

        {/* Description (optional) */}
        <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
        <GlassCard style={styles.descriptionCard} noTouch>
          <TextInput
            style={styles.textInput}
            placeholder="Provide any additional information that may help our review..."
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </GlassCard>

        {/* Submit button */}
        <GlowButton
          title={submitting ? 'Submitting...' : 'Submit Report'}
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          style={styles.submitBtn}
          size="lg"
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
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
    backgroundColor: Colors.secondaryBg,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // User preview
  userCard: {
    marginBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  userRole: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginTop: 2,
  },

  // Sections
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 10,
  },

  // Reasons
  reasonsCard: {
    marginBottom: 24,
    padding: 4,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  reasonRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  reasonRowSelected: {
    backgroundColor: 'rgba(82, 183, 136, 0.08)',
  },
  reasonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reasonLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  reasonLabelSelected: {
    color: Colors.accent,
    fontWeight: '700',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.accent,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accent,
  },

  // Description
  descriptionCard: {
    marginBottom: 28,
  },
  textInput: {
    minHeight: 100,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    lineHeight: 20,
  },

  // Submit
  submitBtn: {
    width: '100%',
  },
});

export default ReportUserScreen;
