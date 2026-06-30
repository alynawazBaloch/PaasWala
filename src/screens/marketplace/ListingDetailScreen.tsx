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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import AvatarBadge from '../../components/shared/AvatarBadge';
import Colors from '../../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ListingDetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const listing = route?.params?.listing;
  const listingImages = listing?.images?.length ? listing.images.map((u: string, i: number) => ({ id: `img_${i}`, uri: u })) : [{ id: '1', uri: null }, { id: '2', uri: null }, { id: '3', uri: null }];

  const handleBack = () => {
    navigation.goBack();
  };

  const title = listing?.title || 'Vintage Wooden Desk';
  const price = listing?.price || 25000;
  const location = listing?.location || 'Block A, Green Valley';
  const condition = listing?.condition || 'Like New';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImageIndex(index);
            }}
          >
            {listingImages.map((img, idx) => (
              <View key={img.id} style={[styles.carouselImageContainer, { width: SCREEN_WIDTH }]}>
                {img.uri ? (
                  <Image source={{ uri: img.uri }} style={styles.carouselImage} />
                ) : (
                  <View style={styles.carouselPlaceholder}>
                    <Ionicons name="image" size={64} color={Colors.textMuted} />
                    <Text style={styles.carouselPlaceholderText}>
                      Listing Photo {idx + 1}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          {/* Image Dots */}
          <View style={styles.dotsContainer}>
            {listingImages.map((_, idx) => (
              <View
                key={`dot-${idx}`}
                style={[
                  styles.dot,
                  idx === activeImageIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Info Card */}
        <GlassCard style={styles.infoCard}>
          <Text style={styles.listingTitle}>{title}</Text>
          <Text style={styles.listingPrice}>PKR {price?.toLocaleString()}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.conditionBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.accent} />
              <Text style={styles.conditionBadgeText}>{condition}</Text>
            </View>
            <View style={styles.locationBadge}>
              <Ionicons name="location" size={14} color={Colors.textMuted} />
              <Text style={styles.locationBadgeText}>{location}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {listing?.description || `Beautiful ${title} in excellent condition. Great addition to your home or office.`}
          </Text>

          <View style={styles.divider} />

          {/* Seller Info */}
          <Text style={styles.sectionTitle}>Seller</Text>
          <View style={styles.sellerRow}>
            <AvatarBadge
              name="Ahmad Khan"
              size={48}
              role="resident"
              verified
            />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>Ahmad Khan</Text>
              <Text style={styles.sellerDetail}>Member since 2024</Text>
            </View>
            <GlowButton
              title="Message"
              onPress={() => Alert.alert('Message', 'Messaging the seller will be available soon.')}
              size="sm"
              style={{ paddingHorizontal: 16 }}
            />
          </View>
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
  badgeRow: {
    flexDirection: 'row',
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
});

export default ListingDetailScreen;
