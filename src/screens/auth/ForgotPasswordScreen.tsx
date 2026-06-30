import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { sendPasswordResetEmail } from 'firebase/auth';
import Colors from '../../utils/colors';
import { auth } from '../../services/firebase';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import GlowInput from '../../components/glass/GlowInput';
import { isValidEmail } from '../../utils/validators';

type Step = 'email' | 'done';

const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!isValidEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setStep('done');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Please create a new account.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please try again later.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
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
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons
              name={step === 'done' ? 'checkmark-circle' : 'mail-outline'}
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

          {step === 'email' && (
            <>
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a password reset link.
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
                title="Send Reset Link"
                onPress={handleSendReset}
                loading={isLoading}
                disabled={isLoading}
                style={{ marginTop: 16 }}
              />
            </>
          )}

          {step === 'done' && (
            <>
              <Text style={[styles.title, { color: Colors.success }]}>Email Sent!</Text>
              <Text style={styles.subtitle}>
                A password reset link has been sent to{'\n'}
                <Text style={styles.emailText}>{email}</Text>{'\n\n'}
                Please check your email and follow the instructions to reset your password.
              </Text>
              <GlowButton
                title="Back to Login"
                onPress={() => navigation.replace('Login')}
                gradientColors={[Colors.success, Colors.accent]}
                style={{ marginTop: 16 }}
              />
            </>
          )}
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
  emailText: {
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
});

export default ForgotPasswordScreen;
