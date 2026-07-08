import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import SpringCard from '../../components/animated/SpringCard';
import AvatarBadge from '../../components/shared/AvatarBadge';
import EmptyState3D from '../../components/shared/EmptyState3D';
import Colors from '../../utils/colors';
import { formatTimestamp } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { getEvents, listenEvents, updateRsvp } from '../../services/dataService';
import type { Event as PSEvent } from '../../services/dataService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MAX_VISIBLE_AVATARS = 4;

const EventsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [events, setEvents] = useState<PSEvent[]>([]);

  useEffect(() => {
    const unsub = listenEvents((all) => {
      setEvents(all);
    });
    return unsub;
  }, []);

  const upcomingEvents = useMemo(
    () => events.filter((e) => !e.createdAt || e.createdAt >= Date.now() - 86400000 * 30),
    [events]
  );
  const pastEvents = useMemo(
    () => events.filter((e) => e.createdAt && e.createdAt < Date.now() - 86400000 * 30),
    [events]
  );
  const currentEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  const handleRsvp = useCallback(
    async (eventId: string, status: 'going' | 'interested') => {
      if (!user?.uid || !user?.name) return;
      const currentStatus = events.find((e) => e.id === eventId)?.rsvp;
      const newStatus = currentStatus === status ? null : status;
      await updateRsvp(eventId, user.uid, user.name, newStatus, user.avatar);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                rsvp: newStatus,
                attendeeCount:
                  newStatus === null
                    ? Math.max(0, e.attendeeCount - 1)
                    : currentStatus === null
                    ? e.attendeeCount + 1
                    : e.attendeeCount,
              }
            : e
        )
      );
    },
    [user?.uid, user?.name, user?.avatar, events]
  );

  const renderEventCard = ({ item }: { item: PSEvent }) => (
    <SpringCard onPress={() => navigation.navigate('EventDetail', { event: item })}>
      <GlassCard style={styles.eventCard}>
        {/* Cover Image */}
        <View style={styles.eventImageContainer}>
          <View style={styles.eventImagePlaceholder}>
            <Ionicons name="calendar" size={36} color={Colors.textMuted} />
          </View>

          {/* Date Badge */}
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>{item.date}</Text>
          </View>
        </View>

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>

          <View style={styles.eventMetaRow}>
            <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.eventMetaText}>{item.time}</Text>
          </View>

          <View style={styles.eventMetaRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.eventMetaText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>

          {/* Attendees */}
          <View style={styles.attendeesRow}>
            <View style={styles.avatarStack}>
              {item.attendees.slice(0, MAX_VISIBLE_AVATARS).map((attendee, idx) => (
                <View
                  key={`avatar-${idx}`}
                  style={[styles.overlappingAvatar, { marginLeft: idx === 0 ? 0 : -12 }]}
                >
                  <AvatarBadge
                    name={attendee.name}
                    role={attendee.role}
                    size={28}
                    verified={false}
                  />
                </View>
              ))}
              {item.attendeeCount > MAX_VISIBLE_AVATARS && (
                <View style={styles.attendeeCountBadge}>
                  <Text style={styles.attendeeCountText}>
                    +{item.attendeeCount - MAX_VISIBLE_AVATARS}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.attendeeLabel}>
              {item.attendeeCount} attending
            </Text>
          </View>

          {/* RSVP Buttons */}
          {activeTab === 'upcoming' && (
            <View style={styles.rsvpRow}>
              <TouchableOpacity
                style={[
                  styles.rsvpPill,
                  item.rsvp === 'going' && styles.rsvpActive,
                ]}
                onPress={() => handleRsvp(item.id, 'going')}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={item.rsvp === 'going' ? Colors.textPrimary : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.rsvpText,
                    item.rsvp === 'going' && styles.rsvpTextActive,
                  ]}
                >
                  Going
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.rsvpPill,
                  item.rsvp === 'interested' && styles.rsvpActive,
                ]}
                onPress={() => handleRsvp(item.id, 'interested')}
              >
                <Ionicons
                  name="star"
                  size={16}
                  color={item.rsvp === 'interested' ? Colors.textPrimary : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.rsvpText,
                    item.rsvp === 'interested' && styles.rsvpTextActive,
                  ]}
                >
                  Interested
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </GlassCard>
    </SpringCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.headerTitle}>Events</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => Alert.alert('Calendar', 'Calendar view coming soon.')}>
          <Ionicons name="calendar-outline" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Events List */}
      <FlatList
        data={currentEvents}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState3D
            icon="calendar-outline"
            title={activeTab === 'upcoming' ? 'No upcoming events' : 'No past events'}
            subtitle="Events in your neighborhood will appear here"
            actionTitle="Create Event"
            onAction={() => navigation.navigate('CreateEvent')}
          />
        }
      />

      {/* FAB Create Event */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => navigation.navigate('CreateEvent')}>
        <GlassCard
          glowColor="rgba(82,183,136,0.4)"
          style={styles.fabCard}
        >
          <Ionicons name="add" size={28} color={Colors.accent} />
        </GlassCard>
      </TouchableOpacity>
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  tabTextActive: {
    color: Colors.textPrimary,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },
  eventCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 14,
  },
  eventImageContainer: {
    height: 140,
    overflow: 'hidden',
  },
  eventImagePlaceholder: {
    flex: 1,
    backgroundColor: Colors.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.3)',
  },
  dateBadgeText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  eventInfo: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eventMetaText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlappingAvatar: {
    borderWidth: 2,
    borderColor: Colors.background,
    borderRadius: 14,
  },
  attendeeCountBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  attendeeCountText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  attendeeLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter',
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  rsvpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  rsvpActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent,
  },
  rsvpText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  rsvpTextActive: {
    color: Colors.textPrimary,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 30,
  },
  fabCard: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
});

export default EventsListScreen;

