import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import CategoryChip from '../../components/shared/CategoryChip';
import Colors from '../../utils/colors';
import {
  saveReview,
  getBusinessReviews,
  incrementBusinessView,
} from '../../services/dataService';
import type { Business, BusinessReview, BusinessHours } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { openGoogleMapsDirections } from '../../services/maps';
import { formatTimestamp } from '../../utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DAY_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isOpenNow(hours?: BusinessHours[]): boolean {
  if (!hours || hours.length === 0) return false;
  const now = new Date();
  const todayName = DAY_MAP[now.getDay()];
  const today = hours.find(h => h.day === todayName);
  if (!today) return false;
  try {
    const parseTime = (t: string) => {
      const [time, mod] = t.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (mod === 'PM' && h !== 12) h += 12;
      if (mod === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const openMin = parseTime(today.open);
    const closeMin = parseTime(today.close);
    return nowMin >= openMin && nowMin <= closeMin;
  } catch {
    return false;
  }
}

const renderStars = (rating: number, size: number = 16, color: string = Colors.accent) => {
  const stars: React.ReactNode[] = [];
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const BusinessDetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { user: currentUser } = useAuth();
  const business: Business | undefined = route?.params?.business;

  /* ---- state ---- */
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState<BusinessReview[]>([]);

  /* ---- derived business data ---- */
  const bizId = business?.id || '';
  const bizName = business?.name || 'Business Name';
  const bizCategory = business?.category || 'General';
  const bizRating = business?.rating || 0;
  const bizReviewCount = business?.reviewCount || 0;
  const bizImage = business?.image || null;
  const bizPhotos = business?.photos || [];
  const bizDescription = business?.description || '';
  const bizHours = business?.hours || [];
  const bizPhone = business?.phone || '';
  const bizWebsite = business?.website || '';
  const bizEmail = (business as any)?.email || '';
  const bizAddress = (business as any)?.location || business?.address || '';
  const bizLat = business?.latitude;
  const bizLng = business?.longitude;
  const bizOwnerId = business?.ownerId || '';
  const bizViewCount = business?.viewCount ?? 0;
  const bizTotalReviews = business?.totalReviews ?? 0;
  const bizAvgRating = business?.averageRating ?? 0;
  const bizInquiryCount = business?.inquiryCount ?? 0;
  const openNow = isOpenNow(bizHours);

  const todayName = DAY_MAP[new Date().getDay()];

  /* ---- effects ---- */
  useEffect(() => {
    if (bizId) {
      incrementBusinessView(bizId);
      loadReviews();
    }
  }, [bizId]);

  const loadReviews = useCallback(async () => {
    if (!bizId) return;
    const loaded = await getBusinessReviews(bizId);
    setReviews(loaded);
  }, [bizId]);

  const handleBack = () => {
    navigation.goBack();
  };

  /* ---- submit review ---- */
  const handleSubmitReview = async () => {
    if (userRating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }
    if (!reviewText.trim()) {
      Alert.alert('Review Required', 'Please write a review before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const review: BusinessReview = {
        id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        businessId: bizId,
        authorName: currentUser?.name || 'Anonymous',
        authorAvatar: currentUser?.avatar || '',
        authorId: currentUser?.uid || '',
        rating: userRating,
        text: reviewText.trim(),
        timestamp: Date.now(),
      };
      await saveReview(review);
      Alert.alert('Thank You!', 'Your review has been submitted successfully.');
      setUserRating(0);
      setReviewText('');
      loadReviews();
    } catch (err) {
      Alert.alert('Error', 'Failed to submit your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCall = () => {
    if (bizPhone) {
      Linking.openURL(`tel:${bizPhone.replace(/\s/g, '')}`).catch(() => {});
    }
  };

  const handleWebsite = () => {
    if (bizWebsite) {
      Linking.openURL(bizWebsite.startsWith('http') ? bizWebsite : `https://${bizWebsite}`).catch(() => {});
    }
  };

  const handleEmail = () => {
    if (bizEmail) {
      Linking.openURL(`mailto:${bizEmail}`).catch(() => {});
    }
  };

  const handleOpenMap = () => {
    if (bizLat != null && bizLng != null) {
      openGoogleMapsDirections(bizLat, bizLng);
    } else if (bizAddress) {
      Linking.openURL(
        'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(bizName + ' ' + bizAddress)
      ).catch(() => {});
    }
  };

  const handleMessage = () => {
    Alert.alert('Messaging', 'Messaging coming soon');
  };

  /* ======================== RENDER ======================== */

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ---- Cover / Banner ---- */}
        <View style={styles.coverContainer}>
          {bizImage ? (
            <Image source={{ uri: bizImage }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="storefront" size={48} color={Colors.textMuted} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', Colors.background]}
            style={styles.coverGradient}
            locations={[0.4, 1]}
          />
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ---- Business Info Card ---- */}
        <GlassCard style={styles.infoCard}>
          <View style={styles.businessHeader}>
            <View style={styles.businessLogoLarge}>
              {bizImage ? (
                <Image source={{ uri: bizImage }} style={styles.businessLogoImage} />
              ) : (
                <Ionicons name="storefront" size={32} color={Colors.accent} />
              )}
            </View>
            <View style={styles.businessHeaderText}>
              <Text style={styles.businessName}>{bizName}</Text>
              <View style={styles.ratingRow}>
                <View style={styles.starsRow}>{renderStars(Math.round(bizRating), 14)}</View>
                <Text style={styles.ratingText}>
                  {bizRating.toFixed(1)} ({bizReviewCount} {bizReviewCount === 1 ? 'review' : 'reviews'})
                </Text>
              </View>
              <View style={styles.businessMetaRow}>
                <CategoryChip label={bizCategory} active color={Colors.primary} />
                <View style={[styles.openBadge, !openNow && styles.closedBadge]}>
                  <View style={[styles.openDot, !openNow && styles.closedDot]} />
                  <Text style={[styles.openText, !openNow && styles.closedText]}>
                    {openNow ? 'Open' : 'Closed'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* ---- About Section ---- */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.sectionText}>
            {bizDescription ||
              `${bizName} is your neighborhood destination for quality products and services. Visit us today!`}
          </Text>
        </GlassCard>

        {/* ---- Hours Section ---- */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Business Hours</Text>
          {bizHours.length > 0 ? (
            bizHours.map((h, idx) => {
              const isToday = h.day === todayName;
              return (
                <View
                  key={`hour-${idx}`}
                  style={[
                    styles.hoursRow,
                    idx < bizHours.length - 1 && styles.hoursRowBorder,
                    isToday && styles.hoursRowToday,
                  ]}
                >
                  <Text style={[styles.hoursDay, isToday && styles.hoursDayToday]}>
                    {h.day}
                  </Text>
                  <Text style={[styles.hoursTime, isToday && styles.hoursTimeToday]}>
                    {h.open} - {h.close}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.sectionText}>Hours not available</Text>
          )}
        </GlassCard>

        {/* ---- Contact Section ---- */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Contact</Text>

          {bizPhone ? (
            <View style={styles.contactRow}>
              <View style={styles.contactIconContainer}>
                <Ionicons name="call" size={18} color={Colors.accent} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>{bizPhone}</Text>
              </View>
              <GlowButton
                title="Call"
                onPress={handleCall}
                size="sm"
                variant="ghost"
              />
            </View>
          ) : null}

          {bizPhone && (bizWebsite || bizEmail) ? <View style={styles.divider} /> : null}

          {bizWebsite ? (
            <View style={styles.contactRow}>
              <View style={styles.contactIconContainer}>
                <Ionicons name="globe" size={18} color={Colors.accent} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Website</Text>
                <Text style={styles.contactValue} numberOfLines={1}>
                  {bizWebsite.replace(/^https?:\/\//, '')}
                </Text>
              </View>
              <GlowButton
                title="Open"
                onPress={handleWebsite}
                size="sm"
                variant="ghost"
              />
            </View>
          ) : null}

          {bizWebsite && bizEmail ? <View style={styles.divider} /> : null}

          {bizEmail ? (
            <View style={styles.contactRow}>
              <View style={styles.contactIconContainer}>
                <Ionicons name="mail" size={18} color={Colors.accent} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue} numberOfLines={1}>
                  {bizEmail}
                </Text>
              </View>
              <GlowButton
                title="Email"
                onPress={handleEmail}
                size="sm"
                variant="ghost"
              />
            </View>
          ) : null}

          {!bizPhone && !bizWebsite && !bizEmail ? (
            <Text style={styles.sectionText}>Contact information not available</Text>
          ) : null}
        </GlassCard>

        {/* ---- Location / Map ---- */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Location</Text>
          <TouchableOpacity
            style={styles.mapContainer}
            activeOpacity={0.8}
            onPress={handleOpenMap}
          >
            {bizLat != null && bizLng != null ? (
              <MapView
                style={styles.mapPreview}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                initialRegion={{
                  latitude: bizLat,
                  longitude: bizLng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker coordinate={{ latitude: bizLat, longitude: bizLng }} />
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map-outline" size={24} color={Colors.accent} />
              </View>
            )}
            <View style={styles.mapOverlay}>
              <Text style={styles.mapAddressText} numberOfLines={2}>
                {bizAddress || 'Location not specified'}
              </Text>
              <Text style={styles.mapTapText}>Tap to open in maps</Text>
            </View>
          </TouchableOpacity>
        </GlassCard>

        {/* ---- Photos Gallery ---- */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosContent}
          >
            {bizPhotos.length > 0
              ? bizPhotos.map((photo, idx) => (
                  <TouchableOpacity key={`photo-${idx}`} activeOpacity={0.8}>
                    <View style={styles.photoItem}>
                      <Image source={{ uri: photo }} style={styles.photoImage} />
                    </View>
                  </TouchableOpacity>
                ))
              : [1, 2, 3, 4].map((_, idx) => (
                  <TouchableOpacity key={`photo-ph-${idx}`} activeOpacity={0.8}>
                    <View style={styles.photoItem}>
                      <View style={styles.photoPlaceholder}>
                        <Ionicons name="image-outline" size={24} color={Colors.textMuted} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
          </ScrollView>
        </GlassCard>

        {/* ---- Rate & Review Section ---- */}
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
          <TextInput
            style={styles.reviewInput}
            placeholder="Write your review..."
            placeholderTextColor={Colors.textMuted}
            multiline
            value={reviewText}
            onChangeText={setReviewText}
          />
          <GlowButton
            title={submitting ? 'Submitting...' : 'Submit Review'}
            onPress={handleSubmitReview}
            disabled={submitting}
            size="md"
            style={styles.submitReviewBtn}
          />
        </GlassCard>

        {/* ---- Recent Reviews ---- */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAuthorRow}>
                    {review.authorAvatar ? (
                      <Image source={{ uri: review.authorAvatar }} style={styles.reviewAvatar} />
                    ) : (
                      <View style={styles.reviewAvatarPlaceholder}>
                        <Ionicons name="person" size={14} color={Colors.textMuted} />
                      </View>
                    )}
                    <Text style={styles.reviewUser}>{review.authorName}</Text>
                  </View>
                  <View style={styles.reviewStarsRow}>
                    {renderStars(review.rating, 12)}
                  </View>
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
                {review.timestamp ? (
                  <Text style={styles.reviewTimestamp}>
                    {formatTimestamp(review.timestamp)}
                  </Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.sectionText}>No reviews yet. Be the first to review!</Text>
          )}
        </GlassCard>

        {/* ---- Owner Analytics Section ---- */}
        {currentUser?.uid && bizOwnerId && currentUser.uid === bizOwnerId ? (
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Analytics</Text>
            <View style={styles.analyticsRow}>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsIcon}>👁️</Text>
                <Text style={styles.analyticsValue}>{bizViewCount}</Text>
                <Text style={styles.analyticsLabel}>Views</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsIcon}>⭐</Text>
                <Text style={styles.analyticsValue}>{bizTotalReviews}</Text>
                <Text style={styles.analyticsLabel}>Reviews</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsIcon}>📊</Text>
                <Text style={styles.analyticsValue}>{bizAvgRating.toFixed(1)}</Text>
                <Text style={styles.analyticsLabel}>Rating</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsIcon}>💬</Text>
                <Text style={styles.analyticsValue}>{bizInquiryCount}</Text>
                <Text style={styles.analyticsLabel}>Inquiries</Text>
              </View>
            </View>
          </GlassCard>
        ) : null}

        {/* ---- Message Business Button ---- */}
        <View style={styles.actionRow}>
          <GlowButton
            title="Message Business"
            onPress={handleMessage}
            icon={<Ionicons name="chatbubble-ellipses" size={18} color={Colors.textPrimary} />}
            size="lg"
            style={styles.messageBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

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

  /* ---- Cover ---- */
  coverContainer: {
    height: 200,
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

  /* ---- Info Card ---- */
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
    overflow: 'hidden',
  },
  businessLogoImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    resizeMode: 'cover',
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
  closedBadge: {
    backgroundColor: 'rgba(107,123,107,0.15)',
    borderColor: 'rgba(107,123,107,0.3)',
  },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.success,
  },
  closedDot: {
    backgroundColor: Colors.textMuted,
  },
  openText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  closedText: {
    color: Colors.textMuted,
  },

  /* ---- Section Cards ---- */
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

  /* ---- Hours ---- */
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  hoursRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  hoursRowToday: {
    backgroundColor: 'rgba(82,183,136,0.08)',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  hoursDay: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Inter',
  },
  hoursDayToday: {
    color: Colors.accent,
    fontWeight: '600',
  },
  hoursTime: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  hoursTimeToday: {
    color: Colors.accent,
  },

  /* ---- Contact ---- */
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

  /* ---- Map ---- */
  mapContainer: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    position: 'relative',
  },
  mapPreview: {
    width: '100%',
    height: 150,
  },
  mapPlaceholder: {
    height: 150,
    backgroundColor: Colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapOverlay: {
    backgroundColor: Colors.glassBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  mapAddressText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  mapTapText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter',
    marginTop: 2,
  },

  /* ---- Photos ---- */
  photosContent: {
    gap: 8,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  photoImage: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: Colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ---- Rating & Review ---- */
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
    marginBottom: 10,
  },
  reviewInput: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 12,
    padding: 12,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  submitReviewBtn: {
    width: '100%',
  },

  /* ---- Reviews ---- */
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
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  reviewAvatarPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
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
  reviewTimestamp: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter',
    marginTop: 4,
  },

  /* ---- Analytics ---- */
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingVertical: 12,
    gap: 4,
  },
  analyticsIcon: {
    fontSize: 20,
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  analyticsLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },

  /* ---- Action Row ---- */
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
