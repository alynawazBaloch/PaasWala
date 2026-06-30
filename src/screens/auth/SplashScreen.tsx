import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { isAuthenticated, loading } = useAuth();
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const orbScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);

  // Mount-only animations
  useEffect(() => {
    logoScale.value = withSpring(1, { stiffness: 100, damping: 12 });
    logoOpacity.value = withTiming(1, { duration: 800 });

    setTimeout(() => {
      textOpacity.value = withTiming(1, { duration: 500 });
    }, 400);

    setTimeout(() => {
      taglineOpacity.value = withTiming(1, { duration: 600 });
    }, 800);

    orbScale.value = withRepeat(
      withTiming(1.15, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    progressWidth.value = withTiming(0.75, { duration: 2000 });
  }, []);

  // Reactive navigation -- re-evaluates when auth state settles
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (isAuthenticated) {
          navigation.replace('MainTabs');
        } else {
          navigation.replace('Login');
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, loading]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Background Grid Pattern */}
      <View style={styles.bgGrid}>
        {Array.from({ length: 20 }).map((_, i) => (
          <View key={i} style={[styles.gridLine, i % 2 === 0 ? styles.gridH : styles.gridV]} />
        ))}
      </View>

      {/* Subtle Orb Glow Behind Logo */}
      <Animated.View style={[styles.orb, orbStyle]}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* Logo Icon */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <View style={styles.iconBox}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <Ionicons name="home-outline" size={48} color={Colors.accent} />
          <View style={styles.logoAccentDot}>
            <Ionicons name="sunny" size={16} color={Colors.glow} />
          </View>
        </View>
      </Animated.View>

      {/* App Name */}
      <Animated.View style={[styles.titleContainer, textAnimatedStyle]}>
        <Text style={styles.title}>PaasWala</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[styles.taglineContainer, taglineStyle]}>
        <Text style={styles.tagline}>Apna mohalla, apni awaaz</Text>
      </Animated.View>

      {/* Bottom Loading Bar */}
      <View style={styles.progressContainer}>
        <Animated.View style={[styles.progressBar, progressStyle]}>
          <LinearGradient
            colors={[Colors.primary, Colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.progressGlow} />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
  },
  gridLine: {
    position: 'absolute',
  },
  gridH: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.primary,
    top: '50%',
  },
  gridV: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.primary,
    left: '50%',
  },
  orb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(45,106,79,0.3)',
    top: height * 0.25,
    overflow: 'hidden',
  },
  logoContainer: {
    alignItems: 'center',
    zIndex: 10,
    marginBottom: 24,
  },
  iconBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  logoAccentDot: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(10,15,10,0.9)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  taglineContainer: {
    marginTop: 4,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 60,
    width: 200,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressGlow: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});

export default SplashScreen;
