import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import Colors from '../../utils/colors';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import { sendEmail } from '../../services/brevo';
import { formatPhoneNumber } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

const OTPScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const email = route?.params?.email || '';
  const expectedOtp = route?.params?.expectedOtp || '';
  const formData = route?.params?.formData || {};
  const { register } = useAuth();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentOtp = useRef(expectedOtp);

  // On mount, send OTP via email if we don't already have one
  useEffect(() => {
    if (!expectedOtp) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      currentOtp.current = code;
      sendEmail({
        to: [{ email }],
        subject: 'Your PaasWala Verification Code',
        htmlContent: `<div style="font-family: Arial; background:#0A0F0A; padding:24px; border-radius:16px;">
          <h2 style="color:#52B788;">PaasWala</h2>
          <p style="color:#A8B8A8;">Your verification code is:</p>
          <div style="background:#111811; padding:16px; border-radius:12px; text-align:center; margin:16px 0; border:1px solid rgba(82,183,136,0.3);">
            <span style="font-size:32px; letter-spacing:8px; color:#52B788; font-weight:bold;">${code}</span>
          </div>
          <p style="color:#6B7B6B; font-size:12px;">This code expires in 10 minutes.</p>
        </div>`,
      }).then((ok) => {
        if (!ok) setSendError('Failed to send OTP email. Check your Brevo sender configuration.');
      }).catch((err) => console.error('[OTP] Email send failed:', err));
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    startCountdown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN);
    setCanResend(false);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleOtpChange = (text: string, index: number) => {
    if (error) setError('');

    // Allow only single digit
    const digit = text.replace(/[^0-9]/g, '').slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setActiveIndex(index);

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }

    // Auto-submit when all 6 digits filled
    if (digit && index === OTP_LENGTH - 1) {
      const otpString = newOtp.join('');
      if (otpString.length === OTP_LENGTH) {
        handleVerify(otpString);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
      setActiveIndex(index - 1);
    }
  };

  const handlePaste = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH).split('');
    const newOtp = Array(OTP_LENGTH).fill('');
    digits.forEach((d, i) => {
      newOtp[i] = d;
    });
    setOtp(newOtp);
    const focusIndex = Math.min(digits.length, OTP_LENGTH - 1);
    setActiveIndex(focusIndex);
    inputRefs.current[focusIndex]?.focus();

    // Auto-submit if all 6 filled
    if (digits.length === OTP_LENGTH) {
      handleVerify(newOtp.join(''));
    }
  };

  const doSendOTPEmail = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    currentOtp.current = code;
    setSendError('');
    sendEmail({
      to: [{ email }],
      subject: 'Your PaasWala Verification Code',
      htmlContent: `<div style="font-family: Arial; background:#0A0F0A; padding:24px; border-radius:16px;">
        <h2 style="color:#52B788;">PaasWala</h2>
        <p style="color:#A8B8A8;">Your verification code is:</p>
        <div style="background:#111811; padding:16px; border-radius:12px; text-align:center; margin:16px 0; border:1px solid rgba(82,183,136,0.3);">
          <span style="font-size:32px; letter-spacing:8px; color:#52B788; font-weight:bold;">${code}</span>
        </div>
        <p style="color:#6B7B6B; font-size:12px;">This code expires in 10 minutes.</p>
      </div>`,
    }).then((ok) => {
      if (!ok) setSendError('Failed to send OTP. Please check your email address and try again.');
    }).catch((err) => console.error('[OTP] Resend email failed:', err));
  };

  const handleVerify = async (code?: string) => {
    const otpString = code || otp.join('');
    if (otpString.length !== OTP_LENGTH) {
      setError('Please enter all 6 digits');
      triggerShake();
      return;
    }

    setIsVerifying(true);
    setError('');

    // Client-side OTP verification
    if (currentOtp.current && otpString !== currentOtp.current) {
      setTimeout(() => {
        setError('Invalid OTP. Please try again.');
        triggerShake();
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        setActiveIndex(0);
        setIsVerifying(false);
      }, 500);
      return;
    }

    try {
      // Create Firebase Auth account + Firestore profile
      await register(formData);
      // AppNavigator will automatically show AddressVerification
      // since user is not verified yet
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
      triggerShake();
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      setActiveIndex(0);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    doSendOTPEmail();
    setOtp(Array(OTP_LENGTH).fill(''));
    setError('');
    setActiveIndex(0);
    inputRefs.current[0]?.focus();
    startCountdown();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <GlassCard style={styles.card}>
          {/* Email Icon Container */}
          <View style={styles.phoneIconContainer}>
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons name="mail-outline" size={40} color={Colors.accent} />
          </View>

          {/* Headline */}
          <Text style={styles.headline}>Enter OTP</Text>
          <Text style={styles.subtext}>
            Enter the verification code sent to{'\n'}
            <Text style={styles.phoneNumber}>{email}</Text>
          </Text>

          {/* Send Error Display (shown when email fails to send) */}
          {sendError ? (
            <View style={[styles.errorContainer, { backgroundColor: 'rgba(255,200,50,0.1)', borderColor: 'rgba(255,200,50,0.3)' }]}>
              <Ionicons name="warning-outline" size={16} color="#FFC832" />
              <Text style={[styles.errorText, { color: '#FFC832' }]}>{sendError}</Text>
            </View>
          ) : null}

          {/* Verification Error Display */}
          {error ? (
            <Animated.View style={[styles.errorContainer, { transform: [{ translateX: shakeAnim }] }]}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          {/* OTP Input Boxes */}
          <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
            {otp.map((digit, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() => {
                  inputRefs.current[index]?.focus();
                  setActiveIndex(index);
                }}
                style={[
                  styles.otpBox,
                  activeIndex === index && styles.otpBoxActive,
                  error && styles.otpBoxError,
                  digit ? styles.otpBoxFilled : null,
                ]}
              >
                <Text style={styles.otpDigit}>{digit}</Text>
                <TextInput
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={styles.otpHiddenInput}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(t) => handleOtpChange(t, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  onFocus={() => setActiveIndex(index)}
                  selectionColor={Colors.accent}
                  autoComplete="one-time-code"
                />
              </TouchableOpacity>
            ))}
          </Animated.View>

          {/* Resend Section */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                <Text style={styles.resendLink}>Resend</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimer}>
                Resend in <Text style={styles.resendTimerBold}>{countdown}s</Text>
              </Text>
            )}
          </View>

          {/* Verify Button */}
          <GlowButton
            title="Verify OTP"
            onPress={() => handleVerify()}
            loading={isVerifying}
            disabled={isVerifying || otp.join('').length !== OTP_LENGTH}
            style={{ marginTop: 8 }}
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  card: {
    padding: 28,
    alignItems: 'center',
  },
  phoneIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter',
    lineHeight: 20,
    marginBottom: 28,
  },
  phoneNumber: {
    color: Colors.accent,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    gap: 8,
    width: '100%',
  },
  errorText: {
    flex: 1,
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 24,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  otpBoxActive: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  otpBoxFilled: {
    backgroundColor: 'rgba(82,183,136,0.1)',
    borderColor: 'rgba(82,183,136,0.4)',
  },
  otpBoxError: {
    borderColor: Colors.error,
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  otpHiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resendText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter',
  },
  resendLink: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  resendTimer: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: 'Inter',
  },
  resendTimerBold: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});

export default OTPScreen;
