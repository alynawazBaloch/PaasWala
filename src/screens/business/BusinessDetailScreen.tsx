import React, { useState, useEffect } from 'react';
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
import CategoryChip from '../../components/shared/CategoryChip';
import Colors from '../../utils/colors';
import { getBusinessReviews } from '../../services/dataService';
import type { BusinessReview } from '../../services/dataService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BUSINESS_HOURS = [
  { day: 'Monday', hours: '8:00 AM - 10:00 PM' },
  { day: 'Tuesday', hours: '8:00 AM - 10:00 PM' },
  { day: 'Wednesday', hours: '8:00 AM - 10:00 PM' },
  { day: 'Thursday', hours: '8:00 AM - 10:00 PM' },
  { day: 'Friday', hours: '8:00 AM - 11:00 PM' },
  { day: 'Saturday', hours: '9:00 AM - 11:00 PM' },
  { day: 'Sunday', hours: '9:00 AM - 9:00 PM' },
];

const PHOTO_PLACEHOLDERS = [null, null, null, null];

const renderStars = (rating: number, size: number = 16, color: string = Colors.accent) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= rating ? 'star' : 'star-outline'}
        size={size}
        color={i <= rating ? color : Colors.textMuted}
      />
    );
  }
  return stars;
};

const BusinessDetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const [userRating, setUserRating] = useState(0);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const business = route?.params?.business;

  useEffect(() => { loadReviews(); }, []);
  const loadReviews = async () => {
    const bizId = route?.params?.business?.id || 'seed_biz_1';
    const loaded = await getBusinessReviews(bizId);
    setReviews(loaded);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const bizName = business?.name || 'Green Valley Cafe';
  const bizCategory = business?.category || 'Restaurants';
  const bizRating = business?.rating || 4.8;
  const bizReviewCount = business?.reviewCount || 52;
  const bizIsOpen = business?.isOpen !== undefined ? business.isOpen : true;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cover / Banner */}
        <View style={styles.coverContainer}>
          <View style={styles.coverPlaceholder}>
            <Ionicons name="storefront" size={48} color={Colors.textMuted} />
          </View>
          <LinearGradient
            colors={['transparent', Colors.background]}
            style={styles.coverGradient}
            locations={[0.4, 1]}
          />
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Business Info Card */}
        <GlassCard style={styles.infoCard}>
          <View style={styles.businessHeader}>
            <View style={styles.businessLogoLarge}>
              <Ionicons name="storefront" size={32} color={Colors.accent} />
            </View>
            <View style={styles.businessHeaderText}>
              <Text style={styles.businessName}>{bizName}</Text>
              <View style={styles.ratingRow}>
                <View style={styles.starsRow}>{renderStars(bizRating, 14)}</View>
                <Text style={styles.ratingText}>{bizRating} ({bizReviewCount} reviews)</Text>
              </View>
              <View style={styles.businessMetaRow}>
                <CategoryChip label={bizCategory} active color={Colors.primary} />
                <View style={styles.openBadge}>
                  <View style={[styles.openDot, !bizIsOpen && { backgroundColor: Colors.textMuted }]} />
                  <Text style={[styles.openText, !bizIsOpen && { color: Colors.textMuted }]}>{bizIsOpen ? 'Open' : 'Closed'}</Text>
                </View>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* About Section */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.sectionText}>
            {business?.description || `${bizName} is your neighborhood destination for quality products and services. Visit us today!`}
          </Text>
        </GlassCard>

        {/* Hours Section */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Business Hours</Text>
          {BUSINESS_HOURS.map((item, idx) => (
            <View
              key={`hour-${idx}`}
              style={[styles.hoursRow, idx < BUSINESS_HOURS.length - 1 && styles.hoursRowBorder]}
            >
              <Text style={styles.hoursDay}>{item.day}</Text>
              <Text style={styles.hoursTime}>{item.hours}</Text>
            </View>
          ))}
        </GlassCard>

        {/* Contact Section */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.contactRow}>
            <View style={styles.contactIconContainer}>
              <Ionicons name="call" size={18} color={Colors.accent} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>+92 300 1234567</Text>
            </View>
            <GlowButton title="Call" onPress={() => Alert.alert('Call', 'Phone calling will be available soon.')} size="sm" variant="ghost" />
          </View>
          <View style={styles.divider} />
          <View style={styles.contactRow}>
            <View style={styles.contactIconContainer}>
              <Ionicons name="mail" size={18} color={Colors.accent} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>cafe@greenvalley.com</Text>
            </View>
            <GlowButton title="Email" onPress={() => Alert.alert('Email', 'Emailing the business will be available soon.')} size="sm" variant="ghost" />
          </View>
        </GlassCard>

        {/* Location / Map */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Location</Text>
          <TouchableOpacity style={styles.mapPlaceholder} activeOpacity={0.8} onPress={() => { const bizName = business?.name || 'Business'; const bizLoc = business?.location || ''; Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(bizName + ' ' + bizLoc)).catch(() => {}); }}>
            <View style={styles.mapPlaceholderInner}>
              <Ionicons name="map-outline" size={24} color={Colors.accent} />
              <Text style={styles.mapPlaceholderText}>
                {business?.location || 'Block A, Green Valley'}
              </Text>
              <Text style={styles.mapPlaceholderSubtext}>
                Tap to open in maps
              </Text>
            </View>
          </TouchableOpacity>
        </GlassCard>

        {/* Photos */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosContent}
          >
            {PHOTO_PLACEHOLDERS.map((photo, idx) => (
              <TouchableOpacity key={`photo-${idx}`} activeOpacity={0.8}>
                <View style={styles.photoItem}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.photoImage} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="image" size={24} color={Colors.textMuted} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </GlassCard>

        {/* Rating Section */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rate this business</Text>
          <View style={styles.userRatingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={`star-${star}`}
                onPress={() => setUserRating(star)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={star <= userRating ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= userRating ? Colors.accent : Colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
          {userRating > 0 && (
            <Text style={styles.userRatingText}>
              You rated {userRating} out of 5 stars
            </Text>
          )}
        </GlassCard>

        {/* Recent Reviews */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewUser}>{review.authorName}</Text>
                <View style={styles.reviewStarsRow}>
                  {renderStars(review.rating, 12)}
                </View>
              </View>
              <Text style={styles.reviewText}>{review.text}</Text>
            </View>
          ))}
        </GlassCard>

        {/* Message Button */}
        <View style={styles.actionRow}>
          <GlowButton
            title="Message Business"
            onPress={() => Alert.alert('Message', 'Messaging the business will be available soon.')}
            icon={<Ionicons name="chatbubble-ellipses" size={18} color={Colors.textPrimary} />}
            size="lg"
            style={styles.messageBtn}
          />
        </View>
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
    height: 200,
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
    height: 100,
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
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  businessLogoLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessHeaderText: {
    flex: 1,
  },
  businessName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter',
  },
  businessMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(82,183,136,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.success,
  },
  openText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    lineHeight: 21,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  hoursRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  hoursDay: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Inter',
  },
  hoursTime: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter',
  },
  contactValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginVertical: 10,
  },
  mapPlaceholder: {
    height: 120,
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  mapPlaceholderInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mapPlaceholderText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  mapPlaceholderSubtext: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter',
  },
  photosContent: {
    gap: 8,
  },
  photoItem: {
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  photoImage: {
    width: 80,
    height: 80,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: Colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userRatingRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  userRatingText: {
    textAlign: 'center',
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginTop: 4,
  },
  reviewItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewUser: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Inter',
    lineHeight: 19,
    marginTop: 4,
  },
  actionRow: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 20,
  },
  messageBtn: {
    width: '100%',
  },
});

export default BusinessDetailScreen;
