import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../utils/colors';
import GlowButton from '../../components/glass/GlowButton';
import { STORAGE_KEYS } from '../../utils/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideData {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

const slides: SlideData[] = [
  {
    icon: 'people-outline',
    title: 'Stay Connected',
    subtitle:
      'Connect with your neighbors and build a stronger community together.',
  },
  {
    icon: 'cart-outline',
    title: 'Buy, Sell & Share',
    subtitle:
      'From groceries to services, find everything you need in your neighborhood.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Stay Safe Together',
    subtitle:
      'Real-time alerts keep everyone informed and protected. Together we are stronger.',
  },
];

const OnboardingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentSlide(slide);
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      scrollRef.current?.scrollTo({
        x: (currentSlide + 1) * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
    } catch (err) { console.error('[Onboarding] Storage write failed:', err); }
    navigation.replace('Login');
  };

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
    } catch (err) { console.error('[Onboarding] Storage write failed:', err); }
    navigation.replace('Login');
  };

  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Skip Button - Glass Pill */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <Text style={styles.skipText}>Skip</Text>
        <Ionicons name="arrow-forward" size={14} color={Colors.textSecondary} />
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {slides.map((slide, index) => (
          <View key={index} style={styles.slide}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconOuterRing}>
                <View style={styles.iconInnerRing}>
                  <Ionicons name={slide.icon} size={72} color={Colors.accent} />
                </View>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.slideTitle}>{slide.title}</Text>

            {/* Subtitle */}
            <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dot Indicators */}
      <View style={styles.dotsRow}>
        {slides.map((_, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.7}
            onPress={() => {
              scrollRef.current?.scrollTo({
                x: index * SCREEN_WIDTH,
                animated: true,
              });
            }}
          >
            <View
              style={[
                styles.dot,
                index === currentSlide && styles.dotActive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom Action */}
      <View style={styles.bottomSection}>
        <GlowButton
          title={isLastSlide ? 'Get Started' : 'Next'}
          onPress={handleNext}
          icon={
            <Ionicons
              name={isLastSlide ? 'checkmark-circle' : 'arrow-forward'}
              size={20}
              color={Colors.textPrimary}
            />
          }
          iconPosition="right"
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
    gap: 6,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOuterRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(82,183,136,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInnerRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotActive: {
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
});

export default OnboardingScreen;
