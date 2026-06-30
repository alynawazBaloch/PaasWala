import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ImpactFeedbackStyle } from 'expo-haptics';
import Colors from '../../utils/colors';

interface GlowButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loading?: boolean;
  disabled?: boolean;
  gradientColors?: [string, string];
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'danger' | 'outline' | 'ghost';
  hapticFeedback?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const GlowButton: React.FC<GlowButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  loading = false,
  disabled = false,
  gradientColors = [Colors.primary, Colors.accent],
  icon,
  iconPosition = 'left',
  size = 'md',
  variant = 'primary',
  hapticFeedback = true,
}) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { stiffness: 300, damping: 10 });
    glowOpacity.value = withTiming(0.8, { duration: 150 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { stiffness: 200, damping: 15 });
    glowOpacity.value = withTiming(0.4, { duration: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const sizes: Record<string, { height: number; paddingHorizontal: number; fontSize: number }> = {
    sm: { height: 36, paddingHorizontal: 16, fontSize: 14 },
    md: { height: 48, paddingHorizontal: 24, fontSize: 16 },
    lg: { height: 56, paddingHorizontal: 32, fontSize: 18 },
  };

  const sizeConfig = sizes[size];

  const renderContent = () => (
    <Animated.View style={[StyleSheet.absoluteFill, styles.glowOverlay, glowStyle]}>
      <View style={[StyleSheet.absoluteFill, { opacity: 0.3 }]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </Animated.View>
  );

  if (variant === 'outline') {
    return (
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        style={[
          styles.outlineButton,
          {
            height: sizeConfig.height,
            paddingHorizontal: sizeConfig.paddingHorizontal,
            borderRadius: 24,
            borderColor: disabled ? Colors.textMuted : Colors.accent,
          },
          animatedStyle,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.accent} />
        ) : (
          <>
            {icon && iconPosition === 'left' && <>{icon}</>}
            <Text
              style={[
                styles.outlineText,
                { fontSize: sizeConfig.fontSize },
                disabled && { opacity: 0.5 },
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && <>{icon}</>}
          </>
        )}
      </AnimatedTouchable>
    );
  }

  if (variant === 'ghost') {
    return (
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        style={[
          styles.ghostButton,
          {
            height: sizeConfig.height,
            paddingHorizontal: sizeConfig.paddingHorizontal,
          },
          animatedStyle,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.accent} />
        ) : (
          <>
            {icon && iconPosition === 'left' && <>{icon}</>}
            <Text
              style={[
                styles.ghostText,
                { fontSize: sizeConfig.fontSize },
                disabled && { opacity: 0.5 },
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && <>{icon}</>}
          </>
        )}
      </AnimatedTouchable>
    );
  }

  const isDanger = variant === 'danger';

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
      style={[
        styles.button,
        {
          height: sizeConfig.height,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          borderRadius: 24,
        },
        isDanger && { shadowColor: Colors.error },
        disabled && { opacity: 0.5 },
        animatedStyle,
        style,
      ]}
    >
      <LinearGradient
        colors={isDanger ? [Colors.error, Colors.errorLight] : gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          StyleSheet.absoluteFill,
          styles.gradient,
          { borderRadius: 24 },
        ]}
      />
      {renderContent()}
      {loading ? (
        <ActivityIndicator color={Colors.textPrimary} />
      ) : (
        <Animated.View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <>{icon}</>}
          <Text
            style={[
              styles.text,
              { fontSize: sizeConfig.fontSize },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && <>{icon}</>}
        </Animated.View>
      )}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowOverlay: {
    borderRadius: 24,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  text: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  outlineText: {
    color: Colors.accent,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});

export default GlowButton;
