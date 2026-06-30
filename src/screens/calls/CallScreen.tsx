import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Colors from '../../utils/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type CallMode = 'voice' | 'video';

interface CallScreenProps {
  navigation?: any;
  route?: any;
}

const CallScreen: React.FC<CallScreenProps> = ({ navigation, route }) => {
  const initialMode: CallMode = route?.params?.mode || 'voice';
  const [mode, setMode] = useState<CallMode>(initialMode);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- Call timer ---- */
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    navigation?.goBack();
  };

  /* ---- Orb animations for voice mode ---- */
  const orb1Scale = useSharedValue(1);
  const orb2Scale = useSharedValue(1);
  const orb3Scale = useSharedValue(1);

  useEffect(() => {
    if (mode === 'voice') {
      orb1Scale.value = withRepeat(
        withTiming(1.25, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      orb2Scale.value = withRepeat(
        withTiming(1.15, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      orb3Scale.value = withRepeat(
        withTiming(1.3, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [mode]);

  const orb1Style = useAnimatedStyle(() => ({ transform: [{ scale: orb1Scale.value }] }));
  const orb2Style = useAnimatedStyle(() => ({ transform: [{ scale: orb2Scale.value }] }));
  const orb3Style = useAnimatedStyle(() => ({ transform: [{ scale: orb3Scale.value }] }));

  const ControlButton: React.FC<{
    icon: string;
    color?: string;
    bgColor?: string;
    onPress: () => void;
    active?: boolean;
  }> = ({ icon, color = Colors.textPrimary, bgColor = 'rgba(255,255,255,0.1)', onPress, active }) => (
    <TouchableOpacity
      style={[
        styles.controlBtn,
        { backgroundColor: active ? 'rgba(82,183,136,0.2)' : bgColor },
        active && { borderColor: Colors.accent },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={24} color={active ? Colors.accent : color} />
    </TouchableOpacity>
  );

  /* ---- VOICE CALL ---- */
  if (mode === 'voice') {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        {/* Background gradient */}
        <LinearGradient
          colors={['#0A0F0A', '#0D1B0D', '#0A0F0A']}
          style={StyleSheet.absoluteFill}
        />

        {/* Floating glowing orbs */}
        <Animated.View style={[styles.orb, styles.orb1, orb1Style]}>
          <View style={[styles.orbInner, { backgroundColor: 'rgba(45,106,79,0.15)' }]} />
        </Animated.View>
        <Animated.View style={[styles.orb, styles.orb2, orb2Style]}>
          <View style={[styles.orbInner, { backgroundColor: 'rgba(82,183,136,0.12)' }]} />
        </Animated.View>
        <Animated.View style={[styles.orb, styles.orb3, orb3Style]}>
          <View style={[styles.orbInner, { backgroundColor: 'rgba(116,198,157,0.08)' }]} />
        </Animated.View>

        {/* Content */}
        <View style={styles.voiceContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
              <LinearGradient
                colors={[Colors.primary, Colors.accent, Colors.glow]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </View>
            <View style={styles.avatarInner}>
              <Ionicons name="person" size={56} color={Colors.textPrimary} />
            </View>
          </View>

          {/* Name & status */}
          <Text style={styles.callerName}>Fatima Zahra</Text>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.accent} />
            <Text style={styles.verifiedText}>Verified Resident</Text>
          </View>
          <Text style={styles.callStatus}>Connected · {formatDuration(callDuration)}</Text>

          {/* Sound waves visualizer */}
          <View style={styles.waveformRow}>
            {[0.4, 0.7, 0.5, 0.9, 0.6, 1.0, 0.55, 0.85, 0.45].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  { height: 16 + h * 20, opacity: 0.4 + h * 0.6 },
                ]}
              />
            ))}
          </View>

          {/* Call controls */}
          <View style={styles.controlsRow}>
            <ControlButton icon="mic-off-outline" onPress={() => setIsMuted(!isMuted)} active={isMuted} />
            <ControlButton
              icon="volume-high-outline"
              onPress={() => setIsSpeaker(!isSpeaker)}
              active={isSpeaker}
            />
            <ControlButton icon="keypad-outline" onPress={() => Alert.alert('Keypad', 'Dial pad coming soon.')} />
            <ControlButton
              icon="videocam-outline"
              onPress={() => setMode('video')}
              color={Colors.accent}
              bgColor="rgba(82,183,136,0.15)"
            />
          </View>

          {/* End call */}
          <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall} activeOpacity={0.8}>
            <Ionicons name="call" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ---- VIDEO CALL ---- */
  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Remote video placeholder */}
      <LinearGradient
        colors={['#0D1B0D', '#0A0F0A', '#111811']}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating orbs */}
      <Animated.View style={[styles.orb, styles.orb1, orb1Style]}>
        <View style={[styles.orbInner, { backgroundColor: 'rgba(45,106,79,0.12)' }]} />
      </Animated.View>
      <Animated.View style={[styles.orb, styles.orb3, orb3Style]}>
        <View style={[styles.orbInner, { backgroundColor: 'rgba(82,183,136,0.08)' }]} />
      </Animated.View>

      {/* Top overlay */}
      <View style={styles.videoTopBar}>
        <TouchableOpacity style={styles.videoBackBtn} onPress={handleEndCall}>
          <Ionicons name="chevron-down" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.videoTopInfo}>
          <Text style={styles.videoCallerName}>Fatima Zahra</Text>
          <View style={styles.hdBadge}>
            <Text style={styles.hdBadgeText}>HD</Text>
          </View>
        </View>
        <Text style={styles.videoDuration}>{formatDuration(callDuration)}</Text>
      </View>

      {/* Own camera preview (picture-in-picture) */}
      <View style={styles.ownCamera}>
        <LinearGradient
          colors={['#1A2A1A', '#0A1A0A']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.ownCameraPlaceholder}>
          <Ionicons name="camera" size={24} color={Colors.textMuted} />
        </View>
        <View style={styles.ownCameraBorder} />
      </View>

      {/* Bottom controls */}
      <BlurView intensity={40} tint="dark" style={styles.videoControlsBg}>
        <View style={styles.videoControls}>
          <ControlButton
            icon="mic-off-outline"
            onPress={() => setIsMuted(!isMuted)}
            active={isMuted}
          />
          <ControlButton
            icon="videocam-off-outline"
            onPress={() => setIsCameraOn(!isCameraOn)}
            active={!isCameraOn}
          />
          <TouchableOpacity style={styles.endCallBtnSmall} onPress={handleEndCall} activeOpacity={0.8}>
            <Ionicons name="call" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <ControlButton
            icon="camera-reverse-outline"
            onPress={() => setIsFrontCamera(!isFrontCamera)}
          />
          <ControlButton
            icon="volume-high-outline"
            onPress={() => setIsSpeaker(!isSpeaker)}
            active={isSpeaker}
          />
        </View>
      </BlurView>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  /* Orbs */
  orb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbInner: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  orb1: { top: '15%', left: -40 },
  orb2: { top: '40%', right: -60 },
  orb3: { bottom: '25%', left: '20%' },

  /* ---- Voice Call ---- */
  voiceContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  avatarRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    padding: 3,
  },
  avatarInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(10,15,10,0.9)',
    borderWidth: 2,
    borderColor: 'rgba(82,183,136,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callerName: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  verifiedText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  callStatus: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    marginTop: 8,
  },
  /* Waveform */
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 30,
    marginBottom: 40,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  /* Controls */
  controlsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.alertRed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.alertRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    transform: [{ rotate: '135deg' }],
  },

  /* ---- Video Call ---- */
  videoTopBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    zIndex: 10,
  },
  videoBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTopInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoCallerName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  hdBadge: {
    backgroundColor: 'rgba(82,183,136,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.3)',
  },
  hdBadgeText: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  videoDuration: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  /* Own camera PIP */
  ownCamera: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 120,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.3)',
    zIndex: 10,
  },
  ownCameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownCameraBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  /* Video controls */
  videoControlsBg: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  videoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  endCallBtnSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.alertRed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.alertRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ rotate: '135deg' }],
  },
});

export default CallScreen;
