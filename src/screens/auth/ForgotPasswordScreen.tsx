import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Crypto from 'expo-crypto';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { auth } from '../../services/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import Colors from '../../utils/colors';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import GlowInput from '../../components/glass/GlowInput';
import { isValidEmail } from '../../utils/validators';
import { sendEmail } from '../../services/brevo';

type Step = 'email' | 'otp' | 'password' | 'done';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/** Generate a random 6-digit OTP string */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Hash the OTP with a salt using SHA-256 */
async function hashOTP(otp: string, email: string): Promise<string> {
  const salt = email.toLowerCase().trim();
  const combined = otp + '|' + salt;
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined,
  );
}

const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // OTP input refs
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // ====== STEP 1: Send OTP ======
  const handleSendOTP = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      triggerShake();
      return;
    }
    if (!isValidEmail(email.trim())) {
      setError('Please enter a valid email address');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const otp = generateOTP();
      const otpHash = await hashOTP(otp, cleanEmail);
      const expiresAt = Date.now() + OTP_EXPIRY_MS;

      // Store OTP hash in Firestore
      const resetRef = doc(db, 'passwordResets', cleanEmail.replace(/\./g, '_dot_'));
      await setDoc(resetRef, {
        email: cleanEmail,
        otpHash,
        expiresAt,
        createdAt: serverTimestamp(),
        verified: false,
      });

      // Send OTP via Brevo email
      const sent = await sendEmail({
        to: [{ email: cleanEmail, name: '' }],
        subject: 'Your PaasWala Password Reset Code',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; background: #0A0F0A; padding: 32px;">
            <div style="max-width: 480px; margin: 0 auto; background: #111811; border-radius: 16px; padding: 32px; border: 1px solid rgba(45,106,79,0.3);">
              <h1 style="color: #52B788; font-size: 24px; text-align: center;">PaasWala</h1>
              <p style="color: #A8B8A8; text-align: center;">Password Reset Code</p>
              <div style="background: #0A0F0A; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
                <span style="font-size: 36px; font-weight: 800; color: #52B788; letter-spacing: 8px; font-family: monospace;">${otp}</span>
              </div>
              <p style="color: #A8B8A8; font-size: 13px; text-align: center;">
                Valid for 5 minutes.
              </p>
            </div>
          </div>
        `,
      });

      if (!sent) {
        await deleteDoc(resetRef).catch(() => {});
        setError('Failed to send OTP email. Please check your email or try again.');
        triggerShake();
        setIsLoading(false);
        return;
      }

      setStep('otp');

      // Start countdown for resend (60s)
      setCountdown(60);
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error('[ForgotPassword] Send OTP error:', err);
      setError('Something went wrong. Please try again.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  // ====== STEP 2: Verify OTP ======
  const handleVerifyOTP = async () => {
    const otp = otpDigits.join('');
    if (otp.length !== OTP_LENGTH) {
      setError('Please enter the full 6-digit code');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const resetRef = doc(db, 'passwordResets', cleanEmail.replace(/\./g, '_dot_'));
      const snap = await getDoc(resetRef);

      if (!snap.exists()) {
        setError('No OTP was sent to this email. Please request a new one.');
        triggerShake();
        setIsLoading(false);
        return;
      }

      const data = snap.data();

      // Check expiry
      if (data.expiresAt && data.expiresAt < Date.now()) {
        setError('OTP has expired. Please request a new one.');
        triggerShake();
        setIsLoading(false);
        return;
      }

      // Verify OTP hash
      const enteredHash = await hashOTP(otp, cleanEmail);
      if (enteredHash !== data.otpHash) {
        setError('Invalid code. Please check and try again.');
        triggerShake();
        setIsLoading(false);
        return;
      }

      // Mark as verified in Firestore
      await setDoc(resetRef, { verified: true }, { merge: true });

      setStep('password');
    } catch (err: any) {
      console.error('[ForgotPassword] Verify OTP error:', err);
      setError('Something went wrong. Please try again.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  // ====== STEP 3: Send Reset Email ======
  const handleResetPassword = async () => {
    setIsLoading(true);
    setError('');

    const cleanEmail = email.trim().toLowerCase();

    try {
      await sendPasswordResetEmail(auth, cleanEmail);

      // Brevo courtesy notification
      await sendEmail({
        to: [{ email: cleanEmail }],
        subject: 'PaasWala Password Reset',
        htmlContent: `...OTP Verified. A Firebase password reset link is on its way. Check spam.`,
      }).catch(() => {});

      // Clean up
      const r = doc(db, 'passwordResets', cleanEmail.replace(/\./g, '_dot_'));
      await deleteDoc(r).catch(() => {});

      setStep('done');
    } catch (err: any) {
      console.error('[ForgotPassword] Reset password error:', err);
      setError(err.message || 'Failed to send reset email. Please try again.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  // ====== OTP Input Handlers ======
  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    if (error) setError('');

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }

    if (digit && index === OTP_LENGTH - 1) {
      const fullOtp = newDigits.join('');
      if (fullOtp.length === OTP_LENGTH) {
        setTimeout(() => handleVerifyOTP(), 300);
      }
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOTP = () => {
    if (countdown > 0) return;
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    handleSendOTP();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (step === 'otp') {
              setStep('email');
              setOtpDigits(Array(OTP_LENGTH).fill(''));
              setError('');
              return;
            }
            if (step === 'password') {
              setStep('otp');
              setOtpDigits(Array(OTP_LENGTH).fill(''));
              setError('');
              return;
            }
            navigation.goBack();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <GlassCard style={styles.card}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons
                name={
                  step === 'done'
                    ? 'checkmark-circle'
                    : step === 'otp'
                      ? 'keypad-outline'
                      : step === 'password'
                        ? 'lock-closed-outline'
                        : 'mail-outline'
                }
                size={40}
                color={Colors.accent}
              />
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ============ STEP 1: EMAIL ============ */}
            {step === 'email' && (
              <>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  Enter your email address and we'll send you a 6-digit code to reset your password.
                </Text>
                <GlowInput
                  icon="mail-outline"
                  placeholder="Email Address"
                  value={email}
                  onChangeText={(t) => { setEmail(t); if (error) setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <GlowButton
                  title="Send OTP Code"
                  onPress={handleSendOTP}
                  loading={isLoading}
                  disabled={isLoading}
                  style={{ marginTop: 16 }}
                />
              </>
            )}

            {/* ============ STEP 2: OTP ============ */}
            {step === 'otp' && (
              <>
                <Text style={styles.title}>Enter OTP Code</Text>
                <Text style={styles.subtitle}>
                  A 6-digit code was sent to{'\n'}
                  <Text style={{ color: Colors.accent, fontWeight: '600' }}>{email}</Text>
                </Text>

                <View style={styles.otpRow}>
                  {otpDigits.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={(ref) => { otpRefs.current[i] = ref; }}
                      style={[
                        styles.otpBox,
                        digit ? styles.otpBoxFilled : null,
                      ]}
                      value={digit}
                      onChangeText={(t) => handleOtpChange(t, i)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={countdown > 0}
                  style={{ marginTop: 16, marginBottom: 16 }}
                >
                  <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                    {countdown > 0
                      ? `Resend code in ${countdown}s`
                      : "Didn't receive the code? Resend"}
                  </Text>
                </TouchableOpacity>

                <GlowButton
                  title="Verify Code"
                  onPress={handleVerifyOTP}
                  loading={isLoading}
                  disabled={isLoading || otpDigits.join('').length !== OTP_LENGTH}
                />
              </>
            )}

            {/* ============ STEP 3: SEND RESET ============ */}
            {step === 'password' && (
              <>
                <Text style={[styles.title, { color: Colors.success }]}>OTP Verified!</Text>
                <Text style={styles.subtitle}>
                  Sending a password reset link to{'\n'}
                  <Text style={{ color: Colors.accent, fontWeight: '600' }}>{email}</Text>
                  {'\n\n'}Check your inbox (and spam) — you'll need to click the link to set a new password.
                </Text>
                <View style={styles.successIconLarge}>
                  <Ionicons name="mail-outline" size={72} color={Colors.accent} />
                </View>
                <GlowButton
                  title="Send Reset Link"
                  onPress={handleResetPassword}
                  loading={isLoading}
                  disabled={isLoading}
                  gradientColors={[Colors.accent, Colors.primary]}
                  style={{ marginTop: 16 }}
                />
                <TouchableOpacity
                  onPress={() => {
                    setStep('otp');
                    setOtpDigits(Array(OTP_LENGTH).fill(''));
                    setError('');
                  }}
                  style={{ marginTop: 12 }}
                >
                  <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>Wrong email? Go back</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ============ STEP 4: DONE ============ */}
            {step === 'done' && (
              <>
                <Text style={[styles.title, { color: Colors.success }]}>Reset Email Sent!</Text>
                <Text style={styles.subtitle}>
                  Your OTP was verified successfully.{'\n\n'}
                  Check your inbox (and spam) for a{' '}
                  <Text style={{ color: Colors.accent, fontWeight: '600' }}>password reset link</Text>
                  {' from Firebase Auth.\n\n'}
                  Click the link to set your new password, then log in.
                </Text>
                <View style={styles.successIconLarge}>
                  <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
                </View>
                <GlowButton
                  title="Go to Login"
                  onPress={() => navigation.replace('Login')}
                  gradientColors={[Colors.success, Colors.accent]}
                  style={{ marginTop: 16 }}
                />
              </>
            )}
          </GlassCard>
        </Animated.View>
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
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter',
    lineHeight: 20,
    marginBottom: 24,
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
  // OTP Input
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 4,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  otpBoxFilled: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(82,183,136,0.1)',
  },
  resendText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  resendTextDisabled: {
    color: Colors.textMuted,
  },
  // Success
  successIconLarge: {
    alignItems: 'center',
    marginBottom: 8,
  },
});

export default ForgotPasswordScreen;
