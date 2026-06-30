import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

export const useFadeIn = (duration = 300) => {
  const opacity = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    }).start();
  }, [duration]);

  return { opacity, fadeIn };
};

export const useSlideUp = (duration = 300) => {
  const translateY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const slideUp = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [duration]);

  return { translateY, opacity, slideUp };
};

export const useScaleIn = (duration = 300) => {
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const scaleIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: 200,
        damping: 15,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration * 0.7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [duration]);

  return { scale, opacity, scaleIn };
};

export const usePulse = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const stopPulse = useCallback(() => {
    pulseAnim.setValue(1);
  }, []);

  return { pulseAnim, startPulse, stopPulse };
};

export default { useFadeIn, useSlideUp, useScaleIn, usePulse };
