import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Colors from '../../utils/colors';
import GlassCard from '../../components/glass/GlassCard';
import { DARK_MAP_STYLE } from '../../services/maps';
import GlowButton from '../../components/glass/GlowButton';
import GlowInput from '../../components/glass/GlowInput';
import { isValidEmail, getPasswordStrength } from '../../utils/validators';
import { sendEmail } from '../../services/brevo';

const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('Ali Nawaz');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Avatar
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Error states
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Step 2 fields
  const [streetAddress, setStreetAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');

  // Map
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 31.481120,
    longitude: 74.314970,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [addressError, setAddressError] = useState('');
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[Register] Location permission not granted:', status);
          return;
        }
        // Use Balanced accuracy — works reliably on most devices
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setMapRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
        // Auto-fill address from current location
        try {
          const results = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (results.length > 0) {
            const addr = results[0];
            if (addr.street || addr.name) {
              setStreetAddress(
                [addr.street, addr.name].filter(Boolean).join(', ')
              );
            }
            if (addr.district || addr.subregion) {
              setArea(addr.district || addr.subregion || '');
            }
            if (addr.city) setCity(addr.city);
          }
        } catch (geoErr) {
          console.warn('[Register] Reverse geocode failed:', geoErr);
        }
      } catch (locErr) {
        console.warn('[Register] Location fetch failed:', locErr);
      }
    })();
  }, []);

  const passwordStrength = getPasswordStrength(password);

  const validateStep1 = (): boolean => {
    let valid = true;

    // Name
    if (!name.trim()) {
      setNameError('Name is required');
      valid = false;
    } else {
      setNameError('');
    }

    // Phone
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      valid = false;
    } else {
      setPhoneError('');
    }

    // Email
    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!isValidEmail(email.trim())) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }

    // Password
    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    } else {
      setPasswordError('');
    }

    // Confirm password
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      valid = false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match');
      valid = false;
    } else {
      setConfirmPasswordError('');
    }

    return valid;
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleGoogleRegister = async () => {
    setIsLoading(true);
    try {
      // Google Sign-In integration placeholder
      // Navigate to address step or main app after Google auth
      setTimeout(() => {
        setStep(2);
        setIsLoading(false);
      }, 1000);
    } catch (err: any) {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
    } else {
      handleCreateAccount();
    }
  };

  const handleCreateAccount = async () => {
    // Validate address fields
    let addressValid = true;
    if (!streetAddress.trim()) {
      setAddressError('Please enter your street address');
      addressValid = false;
    } else if (!area.trim()) {
      setAddressError('Please enter your area / sector');
      addressValid = false;
    } else if (!city.trim()) {
      setAddressError('Please enter your city');
      addressValid = false;
    } else if (!termsAccepted) {
      setAddressError('Please accept the terms of service');
      addressValid = false;
    }
    if (!addressValid) return;

    setIsLoading(true);
    setSendError('');
    try {
      // Generate OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      // Send OTP via Brevo Email
      const sent = await sendEmail({
        to: [{ email: email.trim(), name: name.trim() }],
        subject: 'Your PaasWala Verification Code',
        htmlContent: `<div style="font-family: Arial; background:#0A0F0A; padding:24px; border-radius:16px;">
          <h2 style="color:#52B788;">PaasWala</h2>
          <p style="color:#A8B8A8;">Hi <strong>${name.trim()}</strong>,</p>
          <p style="color:#A8B8A8;">Your verification code is:</p>
          <div style="background:#111811; padding:16px; border-radius:12px; text-align:center; margin:16px 0; border:1px solid rgba(82,183,136,0.3);">
            <span style="font-size:32px; letter-spacing:8px; color:#52B788; font-weight:bold;">${otpCode}</span>
          </div>
          <p style="color:#6B7B6B; font-size:12px;">This code expires in 10 minutes.</p>
          <p style="color:#6B7B6B; font-size:12px;">If you didn't request this, ignore this email.</p>
        </div>`,
      });
      if (!sent) {
        setSendError('Failed to send OTP email. Check that your Brevo sender email is verified in Brevo dashboard, or press "Send OTP" below to retry.');
      } else {
        // Only navigate on success
        navigation.replace('OTP', {
          email: email.trim(),
          expectedOtp: otpCode,
          formData: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            password: password,
            avatar: avatarUri || undefined,
          },
        });
      }
    } catch (err: any) {
      setSendError('Could not send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep(1);
    }
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
          {/* Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          {/* Heading */}
          <Text style={styles.heading}>
            {step === 1 ? 'Create\nAccount' : 'Your\nAddress'}
          </Text>

          {/* Step Indicator - 2 Steps */}
          <View style={styles.progressRow}>
            {/* Step 1 dot */}
            <View style={[styles.progressDot, styles.progressDotActive]}>
              <Text style={styles.progressDotText}>1</Text>
            </View>
            {/* Connecting line */}
            <View style={styles.progressLine}>
              <View
                style={[
                  styles.progressFill,
                  { width: step === 2 ? '100%' : '0%' },
                ]}
              />
            </View>
            {/* Step 2 dot */}
            <View style={[styles.progressDot, step === 2 && styles.progressDotActive]}>
              <Text style={[styles.progressDotText, step !== 2 && { color: Colors.textMuted }]}>2</Text>
            </View>
            {/* Labels */}
          </View>
          <View style={styles.stepLabelsRow}>
            <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>Account</Text>
            <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Address</Text>
          </View>

          {/* Step 1: Personal Info */}
          {step === 1 ? (
            <GlassCard style={styles.card}>
              {/* Profile Photo Upload */}
              <TouchableOpacity style={styles.photoUpload} onPress={handlePickImage} activeOpacity={0.7}>
                <View style={styles.photoCircle}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={28} color={Colors.accent} />
                      <Text style={styles.photoText}>Add Photo</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              {/* Continue with Google */}
              <GlowButton
                title="Continue with Google"
                onPress={handleGoogleRegister}
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

              {/* Name Input */}
              <GlowInput
                icon="person-outline"
                placeholder="Full Name"
                value={name}
                onChangeText={(t) => { setName(t); if (nameError) setNameError(''); }}
                success={!!name && !nameError}
                error={nameError}
                autoCapitalize="words"
              />

              {/* Phone Input */}
              <GlowInput
                icon="call-outline"
                placeholder="+92 300 1234567"
                value={phone}
                onChangeText={(t) => { setPhone(t); if (phoneError) setPhoneError(''); }}
                keyboardType="phone-pad"
                error={phoneError}
              />

              {/* Email Input */}
              <GlowInput
                icon="mail-outline"
                placeholder="Email Address"
                value={email}
                onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={emailError}
              />

              {/* Password Input */}
              <View style={styles.passwordSection}>
                <GlowInput
                  icon="lock-closed-outline"
                  placeholder="Password"
                  value={password}
                  onChangeText={(t) => { setPassword(t); if (passwordError) setPasswordError(''); }}
                  isPassword
                  autoCapitalize="none"
                  error={passwordError}
                />
                {/* Password Strength Bar - 4 segments */}
                {password.length > 0 && (
                  <View style={styles.strengthRow}>
                    {[1, 2, 3, 4].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              i <= passwordStrength.score
                                ? passwordStrength.color
                                : 'rgba(82,183,136,0.15)',
                          },
                        ]}
                      />
                    ))}
                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                      {passwordStrength.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm Password Input */}
              <GlowInput
                icon="shield-checkmark-outline"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); if (confirmPasswordError) setConfirmPasswordError(''); }}
                isPassword
                autoCapitalize="none"
                error={confirmPasswordError}
              />
            </GlassCard>
          ) : (
            /* Step 2: Address */
            <GlassCard style={styles.card}>
              {/* Google Maps Preview */}
              <View style={styles.mapPreview}>
                <MapView
                  style={StyleSheet.absoluteFill}
                  region={mapRegion}
                  onRegionChangeComplete={setMapRegion}
                  customMapStyle={DARK_MAP_STYLE}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: mapRegion.latitude,
                      longitude: mapRegion.longitude,
                    }}
                    draggable
                    onDragEnd={async (e) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      setMapRegion((prev) => ({ ...prev, latitude, longitude }));
                      // Reverse geocode to auto-fill address fields
                      try {
                        const results = await Location.reverseGeocodeAsync({
                          latitude,
                          longitude,
                        });
                        if (results.length > 0) {
                          const addr = results[0];
                          if (addr.street || addr.name) {
                            setStreetAddress(
                              [addr.street, addr.name].filter(Boolean).join(', ')
                            );
                          }
                          if (addr.district || addr.subregion) {
                            setArea(addr.district || addr.subregion || '');
                          }
                          if (addr.city) setCity(addr.city);
                          setAddressError('');
                        }
                      } catch (geoErr) { console.warn('[Register] Marker drag geocode failed:', geoErr); }
                    }}
                    pinColor={Colors.accent}
                  />
                </MapView>
              </View>

              {/* Address error */}
              {addressError ? (
                <Text style={styles.addressErrorText}>{addressError}</Text>
              ) : null}

              {/* Street Address */}
              <GlowInput
                icon="location-outline"
                placeholder="Street Address"
                value={streetAddress}
                onChangeText={setStreetAddress}
              />

              {/* Area / Sector */}
              <GlowInput
                icon="business-outline"
                placeholder="Area / Sector / Mohalla"
                value={area}
                onChangeText={setArea}
              />

              {/* City */}
              <GlowInput
                icon="location-outline"
                placeholder="City"
                value={city}
                onChangeText={setCity}
              />

              {/* Terms Checkbox */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
                  {termsAccepted && (
                    <Ionicons name="checkmark" size={14} color={Colors.accent} />
                  )}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
            </GlassCard>
          )}

          {/* Send OTP Error Display */}
          {sendError ? (
            <View style={styles.sendErrorContainer}>
              <Ionicons name="warning-outline" size={16} color="#FFC832" />
              <Text style={styles.sendErrorText}>{sendError}</Text>
            </View>
          ) : null}

          {/* Action Button */}
          <GlowButton
            title={step === 1 ? 'Next' : 'Create Account'}
            onPress={handleNext}
            loading={isLoading}
            disabled={isLoading || (step === 2 && !termsAccepted)}
            icon={
              <Ionicons
                name={step === 1 ? 'arrow-forward' : 'checkmark-circle'}
                size={20}
                color={Colors.textPrimary}
              />
            }
            iconPosition="right"
            style={{ marginTop: 8 }}
          />

          {/* Login Link (step 1 only) */}
          {step === 1 && (
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          )}
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
    marginBottom: 20,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    lineHeight: 40,
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  progressDotText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  progressLine: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  stepLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 24,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  stepLabelActive: {
    color: Colors.accent,
    fontWeight: '600',
  },
  card: {
    padding: 20,
  },
  photoUpload: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(82,183,136,0.05)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  photoText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
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
  passwordSection: {
    marginBottom: 8,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    marginTop: 6,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginLeft: 4,
    minWidth: 40,
  },
  mapPreview: {
    height: 160,
    borderRadius: 14,
    backgroundColor: '#050A05',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  addressErrorText: {
    color: Colors.error,
    fontSize: 12,
    fontFamily: 'Inter',
    marginBottom: 8,
    marginLeft: 4,
  },
  mapPinRow: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  mapSubtext: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter',
  },
  termsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.glassBg,
    marginTop: 2,
  },
  checkboxActive: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(82,183,136,0.1)',
  },
  termsText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.accent,
    fontWeight: '600',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  loginText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter',
  },
  loginLink: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  sendErrorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,200,50,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,200,50,0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
    gap: 8,
  },
  sendErrorText: {
    flex: 1,
    color: '#FFC832',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter',
    lineHeight: 18,
  },
});

export default RegisterScreen;
