import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import AvatarBadge from '../../components/shared/AvatarBadge';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import { updateListingStatus, incrementListingViews } from '../../services/dataService';
import { formatTimestamp } from '../../utils/helpers';
import type { Listing } from '../../services/dataService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  available: { label: 'Available', color: Colors.success, icon: 'checkmark-circle' },
  reserved: { label: 'Reserved', color: '#FFD700', icon: 'time-outline' },
  sold: { label: 'Sold', color: Colors.error, icon: 'close-circle' },
};

const ListingDetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { user: currentUser } = useAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  const listing: Listing | undefined = route?.params?.listing;

  // Track view on mount
  React.useEffect(() => {
    if (listing?.id) {
      incrementListingViews(listing.id).catch(() => {});
    }
  }, [listing?.id]);

  const images: string[] = React.useMemo(() => {
    if (listing?.images && listing.images.length > 0) {
      return listing.images;
    }
    if (listing?.image) {
      return [listing.image];
    }
    return [];
  }, [listing]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleStatusUpdate = useCallback(
    async (status: 'available' | 'reserved' | 'sold') => {
      if (!listing?.id) return;
      try {
        await updateListingStatus(listing.id, status);
        Alert.alert('Updated', `Listing marked as ${status}.`);
      } catch {
        Alert.alert('Error', 'Failed to update listing status.');
      }
    },
    [listing?.id],
  );

  const handleMessage = useCallback(() => {
    Alert.alert('Message', 'Messaging the seller will be available soon.');
  }, []);

  const toggleSave = useCallback(() => {
    setIsSaved((prev) => !prev);
  }, []);

  if (!listing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.errorText}>Listing not found</Text>
          <GlowButton title="Go Back" onPress={handleBack} size="sm" />
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = listing.status ? STATUS_CONFIG[listing.status] : null;
  const isOwnListing = currentUser?.uid === listing.sellerId;
  const displayPrice = listing.price === 0 ? 'Free' : `PKR ${listing.price?.toLocaleString()}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          {images.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setActiveImageIndex(index);
                }}
              >
                {images.map((uri, idx) => (
                  <View key={`img-${idx}`} style={[styles.carouselImageContainer, { width: SCREEN_WIDTH }]}>
                    <Image source={{ uri }} style={styles.carouselImage} />
                  </View>
                ))}
              </ScrollView>

              {/* Dot Indicators */}
              {images.length > 1 && (
                <View style={styles.dotsContainer}>
                  {images.map((_, idx) => (
                    <View
                      key={`dot-${idx}`}
                      style={[styles.dot, idx === activeImageIndex && styles.dotActive]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={[styles.carouselImageContainer, styles.carouselPlaceholder, { width: SCREEN_WIDTH }]}>
              <Ionicons name="image-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.carouselPlaceholderText}>No photos</Text>
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={toggleSave}>
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={22}
              color={isSaved ? Colors.error : Colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <GlassCard style={styles.infoCard} noTouch>
          {/* Status Badge */}
          {statusConfig && (
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20', borderColor: statusConfig.color }]}>
              <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
              <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
          )}

          {/* Title */}
          <Text style={styles.listingTitle}>{listing.title}</Text>

          {/* Price */}
          {listing.price === 0 ? (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>Free</Text>
            </View>
          ) : (
            <Text style={styles.listingPrice}>{displayPrice}</Text>
          )}

          {/* Badge Row */}
          <View style={styles.badgeRow}>
            {listing.condition && (
              <View style={styles.conditionBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.accent} />
                <Text style={styles.conditionBadgeText}>{listing.condition}</Text>
              </View>
            )}
            {listing.location && (
              <View style={styles.locationBadge}>
                <Ionicons name="location" size={14} color={Colors.textMuted} />
                <Text style={styles.locationBadgeText}>{listing.location}</Text>
              </View>
            )}
            {listing.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{listing.category}</Text>
              </View>
            )}
          </View>

          {/* View Count */}
          {typeof listing.viewCount === 'number' && (
            <View style={styles.viewCountRow}>
              <Ionicons name="eye-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.viewCountText}>{listing.viewCount} views</Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Description */}
          {listing.description ? (
            <>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{listing.description}</Text>
              <View style={styles.divider} />
            </>
          ) : null}

          {/* Timestamp */}
          {listing.timestamp && (
            <View style={styles.timestampRow}>
              <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.timestampText}>
                Listed {formatTimestamp(listing.timestamp)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Seller Info */}
          <Text style={styles.sectionTitle}>Seller</Text>
          <View style={styles.sellerRow}>
            <AvatarBadge
              name={listing.sellerName || 'Unknown'}
              avatar={listing.sellerAvatar}
              size={48}
              role="resident"
              verified
            />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{listing.sellerName || 'Unknown'}</Text>
              <Text style={styles.sellerDetail}>Member</Text>
            </View>
            {!isOwnListing && (
              <GlowButton
                title="Message"
                onPress={handleMessage}
                size="sm"
                style={{ paddingHorizontal: 16 }}
              />
            )}
          </View>
        </GlassCard>

        {/* Seller Actions */}
        {isOwnListing && listing.status && listing.status !== 'sold' && (
          <GlassCard style={styles.actionsCard} noTouch>
            <Text style={styles.sectionTitle}>Manage Listing</Text>
            {listing.status === 'available' && (
              <GlowButton
                title="Mark as Reserved"
                onPress={() => handleStatusUpdate('reserved')}
                variant="outline"
                size="md"
                style={styles.actionButton}
              />
            )}
            {listing.status === 'reserved' && (
              <GlowButton
                title="Mark as Available"
                onPress={() => handleStatusUpdate('available')}
                variant="outline"
                size="md"
                style={styles.actionButton}
              />
            )}
            <GlowButton
              title="Mark as Sold"
              onPress={() => handleStatusUpdate('sold')}
              variant="danger"
              size="md"
              style={styles.actionButton}
            />
          </GlassCard>
        )}
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
  carouselContainer: {
    height: 320,
    position: 'relative',
  },
  carouselImageContainer: {
    height: 320,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  carouselPlaceholder: {
    flex: 1,
    backgroundColor: Colors.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  carouselPlaceholderText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: 'Inter',
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
  saveButton: {
    position: 'absolute',
    top: 16,
    right: 16,
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
  dotsContainer: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 20,
    borderRadius: 4,
  },
  infoCard: {
    margin: 16,
    marginTop: -24,
    zIndex: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    marginBottom: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  listingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  listingPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.accent,
    fontFamily: 'Inter',
    marginTop: 6,
  },
  freeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent + '30',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  freeBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accent,
    fontFamily: 'Inter',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  conditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  conditionBadgeText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  locationBadgeText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter',
  },
  categoryBadge: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  categoryBadgeText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  viewCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  viewCountText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginVertical: 16,
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
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestampText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  sellerDetail: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  actionsCard: {
    margin: 16,
    marginTop: 0,
  },
  actionButton: {
    marginBottom: 10,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
});

export default ListingDetailScreen;
