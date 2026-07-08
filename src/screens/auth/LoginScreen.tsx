import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../utils/colors';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import GlowInput from '../../components/glass/GlowInput';
import { isValidEmail } from '../../utils/validators';

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const { language, setLanguage, t } = useLanguage();
  const { setUser, login, loginWithGoogle } = useAuth();
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    let hasError = false;
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!isValidEmail(email.trim())) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasError = true;
    }

    if (hasError) {
      triggerShake();
      return;
    }

    setIsLoading(true);
    setGeneralError('');
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setGeneralError(err.message || 'Invalid email or password. Please try again.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setGeneralError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setGeneralError(err.message || 'Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ur' : 'en');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'android' ? 'height' : 'padding'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Language Toggle Pill - Top Right */}
          <TouchableOpacity
            style={styles.langToggle}
            onPress={toggleLanguage}
            activeOpacity={0.7}
          >
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <Text style={styles.langText}>
              {language === 'en' ? 'EN' : 'اردو'}
            </Text>
            <Ionicons name="swap-horizontal" size={12} color={Colors.textSecondary} />
            <Text style={[styles.langText, { color: Colors.textSecondary, fontWeight: '400' }]}>
              {language === 'en' ? 'اردو' : 'EN'}
            </Text>
          </TouchableOpacity>

          {/* Login Card */}
          <GlassCard style={styles.card}>
            {/* Logo Icon Box */}
            <View style={styles.logoBox}>
              <Ionicons name="home-outline" size={28} color={Colors.accent} />
              <View style={styles.logoAccentDot}>
                <Ionicons name="sunny" size={10} color={Colors.glow} />
              </View>
            </View>

            <Text style={styles.heading}>{t('welcome.back')}</Text>
            <Text style={styles.subtext}>
              {t('sign.in')}
            </Text>

            {/* General Error */}
            {generalError ? (
              <Animated.View style={[styles.errorBanner, { transform: [{ translateX: shakeAnim }] }]}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorBannerText}>{generalError}</Text>
              </Animated.View>
            ) : null}

            {/* Google Sign-In */}
            <GlowButton
              title={t('continue.google')}
              onPress={handleGoogleLogin}
              variant="outline"
              icon={<Ionicons name="logo-google" size={18} color={Colors.accent} />}
              iconPosition="left"
              disabled={isLoading}
              style={{ marginBottom: 20 }}
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Input */}
            <GlowInput
              icon="mail-outline"
              placeholder="Email Address"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailError) setEmailError('');
                if (generalError) setGeneralError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={emailError}
            />

            {/* Password Input */}
            <GlowInput
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (passwordError) setPasswordError('');
                if (generalError) setGeneralError('');
              }}
              autoCapitalize="none"
              isPassword
              error={passwordError}
            />

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <GlowButton
              title="Login"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={{ marginTop: 4 }}
            />

            {/* Register Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Register</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  langToggle: {
    position: 'absolute',
    top: 16,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
    gap: 4,
    zIndex: 10,
  },
  langText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  card: {
    padding: 28,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(82,183,136,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  logoAccentDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(10,15,10,0.9)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    fontFamily: 'Inter',
    marginBottom: 6,
  },
  subtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter',
    marginBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Inter',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 16,
  },
  forgotText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter',
  },
  registerLink: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
});

export default LoginScreen;
