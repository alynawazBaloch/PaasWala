import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import AvatarBadge from '../../components/shared/AvatarBadge';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import { updateRsvp } from '../../services/dataService';
import type { Event as PSEvent } from '../../services/dataService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ── helpers ──────────────────────────────────────────── */
interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function capitalize(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/* ── component ────────────────────────────────────────── */
const EventDetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { user } = useAuth();
  const event: PSEvent | undefined = route?.params?.event;

  /* ---- RSVP state (local mirror of event.rsvp) ---- */
  const [userRsvp, setUserRsvp] = useState<'going' | 'interested' | null>(event?.rsvp ?? null);

  /* ---- Countdown timer ---- */
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    const calculate = () => {
      const dateStr = event?.date || '';
      const timeStr = event?.time || '';
      const combined = dateStr + ' ' + timeStr;
      const targetDate = new Date(combined);

      if (isNaN(targetDate.getTime())) {
        setTimeRemaining(null);
        return;
      }

      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeRemaining({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [event?.date, event?.time]);

  /* ---- Handlers ---- */
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleShare = useCallback(() => {
    Alert.alert('Share', 'Sharing events will be available soon.');
  }, []);

  const handleMap = useCallback(() => {
    if (!event?.location) return;
    const url = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(event.location);
    Linking.openURL(url).catch(() => {});
  }, [event?.location]);

  const handleRsvp = useCallback(
    (status: 'going' | 'interested' | null) => {
      if (!event?.id || !user?.uid || !user?.name) return;
      const newStatus = userRsvp === status ? null : status;
      setUserRsvp(newStatus);
      updateRsvp(event.id, user.uid, user.name, newStatus, user.avatar).catch(() => {});
    },
    [event?.id, user?.uid, user?.name, user?.avatar, userRsvp],
  );

  /* ---- Derived data ---- */
  const attendees = event?.attendees ?? [];
  const hasCountdown = timeRemaining !== null && !(timeRemaining.days === 0 && timeRemaining.hours === 0 && timeRemaining.minutes === 0 && timeRemaining.seconds === 0);

  const coverSource = event?.coverPhoto || event?.image;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Cover Image with Gradient ── */}
        <View style={styles.coverContainer}>
          {coverSource ? (
            <Image source={{ uri: coverSource }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="calendar" size={48} color={Colors.textMuted} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', Colors.background]}
            style={styles.coverGradient}
            locations={[0.5, 1]}
          />
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ── Event Info Card ── */}
        <GlassCard style={styles.infoCard}>
          {/* Title */}
          <Text style={styles.eventTitle}>{event?.title || 'Untitled Event'}</Text>

          {/* ── Countdown Timer ── */}
          {hasCountdown && (
            <GlassCard style={styles.countdownCard} noTouch>
              <View style={styles.countdownRow}>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownValue}>{pad(timeRemaining.days)}</Text>
                  <Text style={styles.countdownLabel}>Days</Text>
                </View>
                <Text style={styles.countdownSeparator}>:</Text>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownValue}>{pad(timeRemaining.hours)}</Text>
                  <Text style={styles.countdownLabel}>Hrs</Text>
                </View>
                <Text style={styles.countdownSeparator}>:</Text>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownValue}>{pad(timeRemaining.minutes)}</Text>
                  <Text style={styles.countdownLabel}>Min</Text>
                </View>
                <Text style={styles.countdownSeparator}>:</Text>
                <View style={styles.countdownUnit}>
                  <Text style={styles.countdownValue}>{pad(timeRemaining.seconds)}</Text>
                  <Text style={styles.countdownLabel}>Sec</Text>
                </View>
              </View>
            </GlassCard>
          )}

          {/* ── Date & Time ── */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="calendar" size={18} color={Colors.accent} />
            </View>
            <View style={styles.detailTextBlock}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>
                {event?.date || 'TBD'} {event?.time ? '• ' + event.time : ''}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── Location ── */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="location" size={18} color={Colors.accent} />
            </View>
            <View style={styles.detailTextBlock}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{event?.location || 'TBD'}</Text>
            </View>
          </View>

          {/* Map placeholder */}
          <TouchableOpacity style={styles.mapPlaceholder} activeOpacity={0.8} onPress={handleMap}>
            <View style={styles.mapPlaceholderInner}>
              <Ionicons name="map-outline" size={24} color={Colors.accent} />
              <Text style={styles.mapPlaceholderText}>Tap to view on map</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* ── Category badge ── */}
          {event?.category && (
            <View style={styles.categoryBadgeRow}>
              <View style={styles.categoryBadge}>
                <Ionicons name="pricetag" size={14} color={Colors.accent} />
                <Text style={styles.categoryBadgeText}>{capitalize(event.category)}</Text>
              </View>
            </View>
          )}

          {/* ── Description ── */}
          {event?.description ? (
            <>
              <Text style={styles.sectionTitle}>About this event</Text>
              <Text style={styles.description}>{event.description}</Text>
              <View style={styles.divider} />
            </>
          ) : null}

          {/* ── Hosted by ── */}
          {event?.createdBy && (
            <>
              <Text style={styles.sectionTitle}>Hosted by</Text>
              <View style={styles.hostedByRow}>
                <AvatarBadge
                  name={event.createdBy}
                  role="resident"
                  size={40}
                  verified
                />
                <Text style={styles.hostedByName}>{event.createdBy}</Text>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* ── Attendees ── */}
          <View style={styles.attendeesHeaderRow}>
            <Text style={styles.sectionTitle}>Attendees</Text>
            <Text style={styles.attendeeCount}>
              {event?.maxAttendees
                ? `${attendees.length}/${event.maxAttendees} attending`
                : `${attendees.length} going`}
            </Text>
          </View>

          {attendees.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attendeesList}
            >
              {attendees.map((attendee, idx) => (
                <View key={`attendee-${idx}`} style={styles.attendeeItem}>
                  <AvatarBadge
                    name={attendee.name}
                    role={attendee.role}
                    size={48}
                    verified
                  />
                  <Text style={styles.attendeeName} numberOfLines={1}>
                    {attendee.name.split(' ')[0]}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noAttendees}>No attendees yet. Be the first!</Text>
          )}

          <View style={styles.divider} />

          {/* ── RSVP ── */}
          <Text style={styles.sectionTitle}>Your Response</Text>
          <View style={styles.rsvpRow}>
            <TouchableOpacity
              style={[styles.rsvpButton, userRsvp === 'going' && styles.rsvpButtonActive]}
              onPress={() => handleRsvp('going')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={userRsvp === 'going' ? Colors.textPrimary : Colors.textMuted}
              />
              <Text
                style={[
                  styles.rsvpButtonText,
                  userRsvp === 'going' && styles.rsvpButtonTextActive,
                ]}
              >
                Going
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rsvpButton, userRsvp === 'interested' && styles.rsvpButtonActive]}
              onPress={() => handleRsvp('interested')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="star"
                size={20}
                color={userRsvp === 'interested' ? Colors.textPrimary : Colors.textMuted}
              />
              <Text
                style={[
                  styles.rsvpButtonText,
                  userRsvp === 'interested' && styles.rsvpButtonTextActive,
                ]}
              >
                Interested
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rsvpButton, userRsvp === null && styles.rsvpButtonActive]}
              onPress={() => handleRsvp(null)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={userRsvp === null ? Colors.textPrimary : Colors.textMuted}
              />
              <Text
                style={[
                  styles.rsvpButtonText,
                  userRsvp === null && styles.rsvpButtonTextActive,
                ]}
              >
                Not Going
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Share Button ── */}
          <GlowButton
            title="Share Event"
            onPress={handleShare}
            variant="outline"
            icon={<Ionicons name="share-social" size={18} color={Colors.accent} />}
            style={styles.shareButton}
          />
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  /* ── Cover ── */
  coverContainer: {
    height: 260,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: Colors.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  /* ── Info card ── */
  infoCard: {
    margin: 16,
    marginTop: -40,
    zIndex: 5,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 16,
  },
  /* ── Countdown ── */
  countdownCard: {
    marginBottom: 16,
    padding: 0,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 4,
  },
  countdownUnit: {
    alignItems: 'center',
    minWidth: 48,
  },
  countdownValue: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Inter',
    color: Colors.accent,
    letterSpacing: 1,
  },
  countdownLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  countdownSeparator: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Inter',
    color: Colors.accent,
    opacity: 0.5,
    marginBottom: 14,
  },
  /* ── Detail rows ── */
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextBlock: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginVertical: 14,
  },
  /* ── Map ── */
  mapPlaceholder: {
    height: 100,
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginTop: 4,
    overflow: 'hidden',
  },
  mapPlaceholderInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mapPlaceholderText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  /* ── Category badge ── */
  categoryBadgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: Colors.accent,
  },
  /* ── Description ── */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    lineHeight: 22,
  },
  /* ── Hosted by ── */
  hostedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  hostedByName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  /* ── Attendees ── */
  attendeesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  attendeeCount: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Inter',
  },
  attendeesList: {
    paddingVertical: 8,
    gap: 16,
  },
  attendeeItem: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
  attendeeName: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  noAttendees: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Inter',
    fontStyle: 'italic',
    marginVertical: 12,
  },
  /* ── RSVP ── */
  rsvpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  rsvpButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 6,
  },
  rsvpButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent,
  },
  rsvpButtonText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  rsvpButtonTextActive: {
    color: Colors.textPrimary,
  },
  shareButton: {
    marginTop: 8,
  },
});

export default EventDetailScreen;
