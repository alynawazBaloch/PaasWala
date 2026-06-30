import React, { useState } from 'react';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EventDetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const [rsvp, setRsvp] = useState<'going' | 'interested' | null>('going');
  const event = route?.params?.event;
  const attendees = event?.attendees || [];

  const handleBack = () => {
    navigation.goBack();
  };

  const handleShare = () => {
    Alert.alert('Share', 'Sharing events will be available soon.');
  };

  const eventTitle = event?.title || 'Community Clean-Up Day';
  const eventDate = event?.date || 'Saturday, June 28, 2025';
  const eventTime = event?.time || '9:00 AM - 12:00 PM';
  const eventLocation = event?.location || 'Community Park, Green Valley';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cover Image with Gradient Overlay */}
        <View style={styles.coverContainer}>
          <View style={styles.coverPlaceholder}>
            <Ionicons name="calendar" size={48} color={Colors.textMuted} />
          </View>
          <LinearGradient
            colors={['transparent', Colors.background]}
            style={styles.coverGradient}
            locations={[0.5, 1]}
          />

          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Event Info Card */}
        <GlassCard style={styles.infoCard}>
          <Text style={styles.eventTitle}>{eventTitle}</Text>

          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeIconContainer}>
              <Ionicons name="calendar" size={18} color={Colors.accent} />
            </View>
            <View style={styles.dateTimeTextBlock}>
              <Text style={styles.dateTimeLabel}>Date & Time</Text>
              <Text style={styles.dateTimeValue}>
                {eventDate} • {eventTime}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeIconContainer}>
              <Ionicons name="location" size={18} color={Colors.accent} />
            </View>
            <View style={styles.dateTimeTextBlock}>
              <Text style={styles.dateTimeLabel}>Location</Text>
              <Text style={styles.dateTimeValue}>
                {eventLocation}
              </Text>
            </View>
          </View>

          {/* Map Placeholder */}
          <TouchableOpacity style={styles.mapPlaceholder} activeOpacity={0.8} onPress={() => { Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(eventLocation)).catch(() => {}); }}>
            <View style={styles.mapPlaceholderInner}>
              <Ionicons name="map-outline" size={24} color={Colors.accent} />
              <Text style={styles.mapPlaceholderText}>Tap to view on map</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionTitle}>About this event</Text>
          <Text style={styles.description}>
            Join us for our monthly Community Clean-Up Day! Let's work together to keep our
            neighborhood beautiful. We'll be cleaning the park, planting flowers, and
            picking up litter. Gloves, bags, and refreshments will be provided. Bring your
            family and friends - all ages are welcome!
          </Text>

          <View style={styles.divider} />

          {/* Attendees */}
          <View style={styles.attendeesHeaderRow}>
            <Text style={styles.sectionTitle}>Attendees</Text>
            <Text style={styles.attendeeCount}>{attendees.length} going</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.attendeesList}
          >
            {attendees.map((attendee: { name: string; role: 'resident' | 'admin' | 'superAdmin' | 'business' }, idx: number) => (
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

          <View style={styles.divider} />

          {/* RSVP Card */}
          <Text style={styles.sectionTitle}>Your Response</Text>
          <View style={styles.rsvpRow}>
            <TouchableOpacity
              style={[styles.rsvpButton, rsvp === 'going' && styles.rsvpButtonActive]}
              onPress={() => setRsvp(rsvp === 'going' ? null : 'going')}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={rsvp === 'going' ? Colors.textPrimary : Colors.textMuted}
              />
              <Text
                style={[
                  styles.rsvpButtonText,
                  rsvp === 'going' && styles.rsvpButtonTextActive,
                ]}
              >
                Going
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rsvpButton, rsvp === 'interested' && styles.rsvpButtonActive]}
              onPress={() => setRsvp(rsvp === 'interested' ? null : 'interested')}
            >
              <Ionicons
                name="star"
                size={20}
                color={rsvp === 'interested' ? Colors.textPrimary : Colors.textMuted}
              />
              <Text
                style={[
                  styles.rsvpButtonText,
                  rsvp === 'interested' && styles.rsvpButtonTextActive,
                ]}
              >
                Interested
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rsvpButton}
              onPress={() => setRsvp(null)}
            >
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
              <Text style={styles.rsvpButtonText}>Not Going</Text>
            </TouchableOpacity>
          </View>

          {/* Share Button */}
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
  coverContainer: {
    height: 260,
    position: 'relative',
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
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  dateTimeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeTextBlock: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  dateTimeValue: {
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
