import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker } from 'react-native-maps';
import { doc, updateDoc } from 'firebase/firestore';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import AvatarBadge from '../../components/shared/AvatarBadge';
import { DARK_MAP_STYLE } from '../../services/maps';
import { db } from '../../services/firebase';
import {
  getVerificationRequest,
  approveVerification,
  rejectVerification,
} from '../../services/dataService';
import type { VerificationRequest } from '../../services/dataService';

const VerificationDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const requestId = route?.params?.requestId || '';
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!requestId) return;
    (async () => {
      setLoading(true);
      const vr = await getVerificationRequest(requestId);
      setRequest(vr);
      setLoading(false);
    })();
  }, [requestId]);

  const handleApprove = useCallback(async () => {
    if (!request || !user?.uid) return;
    setProcessing(true);
    try {
      const ok = await approveVerification(request.id, user.uid, adminNote.trim());
      if (!ok) throw new Error('Firestore update failed');

      // Also update user's verified status
      await updateDoc(doc(db, 'users', request.userId), {
        verified: true,
      });

      Alert.alert('Approved', `${request.userName}'s address has been verified.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      console.error('[VerificationDetail] Approve failed:', err);
      Alert.alert('Error', 'Failed to approve. Please try again.');
    } finally {
      setProcessing(false);
    }
  }, [request, user, adminNote, navigation]);

  const handleReject = useCallback(async () => {
    if (!request || !user?.uid) return;
    setProcessing(true);
    try {
      const ok = await rejectVerification(request.id, user.uid, adminNote.trim());
      if (!ok) throw new Error('Firestore update failed');

      Alert.alert('Rejected', `${request.userName}'s verification has been rejected.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      console.error('[VerificationDetail] Reject failed:', err);
      Alert.alert('Error', 'Failed to reject. Please try again.');
    } finally {
      setProcessing(false);
    }
  }, [request, user, adminNote, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading verification details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.loadingText}>Verification request not found.</Text>
          <GlowButton
            title="Go Back"
            onPress={() => navigation.goBack()}
            size="sm"
            style={{ marginTop: 16 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Determine if already resolved
  const resolved = request.status !== 'pending';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with back */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification Detail</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Map with pinned location */}
        <GlassCard style={styles.mapCard} glowColor="transparent" noTouch>
          <View style={styles.mapContainer}>
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: request.latitude,
                longitude: request.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              customMapStyle={DARK_MAP_STYLE}
              scrollEnabled
              zoomEnabled
            >
              <Marker
                coordinate={{
                  latitude: request.latitude,
                  longitude: request.longitude,
                }}
                pinColor={Colors.accent}
                title={request.streetAddress}
                description={`${request.area}, ${request.city}`}
              />
            </MapView>
          </View>
        </GlassCard>

        {/* User info card */}
        <GlassCard style={styles.infoCard} glowColor="transparent">
          <View style={styles.userRow}>
            <AvatarBadge
              name={request.userName}
              avatar={request.userAvatar || undefined}
              size={52}
              role="resident"
              verified={false}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{request.userName}</Text>
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={14} color={Colors.accent} />
                <Text style={styles.detailText}>{request.userPhone || 'No phone'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="at-outline" size={14} color={Colors.accent} />
                <Text style={styles.detailText}>User ID: {request.userId.slice(0, 12)}...</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Address details */}
        <GlassCard style={styles.infoCard} glowColor="transparent">
          <Text style={styles.sectionTitle}>Address Details</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={18} color={Colors.accent} />
            <Text style={styles.addressText}>{request.streetAddress}</Text>
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="business-outline" size={18} color={Colors.accent} />
            <Text style={styles.addressText}>{request.area}</Text>
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={18} color={Colors.accent} />
            <Text style={styles.addressText}>{request.city}</Text>
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="globe-outline" size={18} color={Colors.accent} />
            <Text style={styles.addressText}>
              {request.latitude.toFixed(5)}, {request.longitude.toFixed(5)}
            </Text>
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.accent} />
            <Text style={styles.addressText}>
              Submitted {new Date(request.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </GlassCard>

        {/* Status badge */}
        <GlassCard style={styles.infoCard} glowColor="transparent">
          <Text style={styles.sectionTitle}>Status</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  request.status === 'approved'
                    ? 'rgba(82,183,136,0.15)'
                    : request.status === 'rejected'
                    ? 'rgba(255,68,68,0.15)'
                    : 'rgba(255,215,0,0.15)',
                borderColor:
                  request.status === 'approved'
                    ? Colors.success
                    : request.status === 'rejected'
                    ? Colors.error
                    : Colors.warning,
              },
            ]}
          >
            <Ionicons
              name={
                request.status === 'approved'
                  ? 'checkmark-circle'
                  : request.status === 'rejected'
                  ? 'close-circle'
                  : 'time-outline'
              }
              size={20}
              color={
                request.status === 'approved'
                  ? Colors.success
                  : request.status === 'rejected'
                  ? Colors.error
                  : Colors.warning
              }
            />
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    request.status === 'approved'
                      ? Colors.success
                      : request.status === 'rejected'
                      ? Colors.error
                      : Colors.warning,
                },
              ]}
            >
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Text>
          </View>
          {request.adminNote ? (
            <View style={styles.adminNoteContainer}>
              <Text style={styles.adminNoteLabel}>Admin Note:</Text>
              <Text style={styles.adminNoteText}>{request.adminNote}</Text>
            </View>
          ) : null}
        </GlassCard>

        {/* Admin actions (only if pending) */}
        {!resolved && (
          <GlassCard style={styles.infoCard} glowColor="transparent">
            <Text style={styles.sectionTitle}>Admin Decision</Text>

            {/* Admin note input */}
            <View style={styles.noteInputContainer}>
              <TextInput
                style={styles.noteInput}
                placeholder="Add a note (optional)..."
                placeholderTextColor={Colors.textMuted}
                value={adminNote}
                onChangeText={setAdminNote}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.actionRow}>
              <GlowButton
                title="Approve"
                onPress={handleApprove}
                loading={processing}
                disabled={processing}
                size="sm"
                icon={<Ionicons name="checkmark" size={18} color={Colors.textPrimary} />}
                gradientColors={[Colors.success, Colors.accent]}
                style={{ flex: 1 }}
              />
              <View style={{ width: 12 }} />
              <GlowButton
                title="Reject"
                onPress={handleReject}
                loading={processing}
                disabled={processing}
                variant="danger"
                size="sm"
                style={{ flex: 1 }}
              />
            </View>
          </GlassCard>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: 'Inter',
    marginTop: 12,
  },
  content: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
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
  mapCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 14,
    height: 220,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  infoCard: {
    padding: 18,
    marginBottom: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  adminNoteContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  adminNoteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  adminNoteText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  noteInputContainer: {
    marginBottom: 16,
  },
  noteInput: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 12,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
  },
});

export default VerificationDetailScreen;
