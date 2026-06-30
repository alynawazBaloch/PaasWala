import React, { useState, useCallback, forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../utils/colors';

interface GlowInputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  error?: string;
  success?: boolean;
  isPassword?: boolean;
  rightIcon?: React.ReactNode;
  containerStyle?: object;
}

const GlowInput = forwardRef<TextInput, GlowInputProps>(
  (
    {
      label,
      icon,
      iconColor = Colors.primary,
      error,
      success = false,
      isPassword = false,
      rightIcon,
      containerStyle,
      ...textInputProps
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const borderGlow = useSharedValue(0);
    const shakeAnim = useSharedValue(0);

    const handleFocus = useCallback(() => {
      setIsFocused(true);
      borderGlow.value = withTiming(1, { duration: 200 });
    }, []);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      borderGlow.value = withTiming(0, { duration: 200 });
    }, []);

    const borderStyle = useAnimatedStyle(() => ({
      borderColor: error
        ? Colors.error
        : success
        ? Colors.success
        : isFocused
        ? Colors.accent
        : Colors.glassBorder,
      borderWidth: error ? 1.5 : isFocused ? 1.5 : 1,
      shadowColor: error
        ? Colors.error
        : success
        ? Colors.success
        : isFocused
        ? Colors.accent
        : 'transparent',
      shadowOpacity: borderGlow.value * 0.4,
      shadowRadius: borderGlow.value * 12,
      elevation: borderGlow.value * 8,
      transform: [
        {
          translateX: shakeAnim.value,
        },
      ],
    }));

    const iconColorResolved = error
      ? Colors.error
      : success
      ? Colors.success
      : isFocused
      ? Colors.accent
      : iconColor;

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <Animated.View style={[styles.container, borderStyle]}>
          {icon && (
            <View style={styles.iconContainer}>
              <Ionicons
                name={icon}
                size={20}
                color={iconColorResolved}
              />
            </View>
          )}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              icon ? { paddingLeft: 44 } : {},
              rightIcon || isPassword ? { paddingRight: 44 } : {},
            ]}
            placeholderTextColor={Colors.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={isPassword && !showPassword}
            {...textInputProps}
          />
          {success && !isPassword && (
            <View style={styles.rightIcon}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            </View>
          )}
          {isPassword && (
            <TouchableOpacity
              style={styles.rightIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          )}
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </Animated.View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
  },
  iconContainer: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  rightIcon: {
    position: 'absolute',
    right: 14,
    zIndex: 1,
  },
  error: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontFamily: 'Inter',
  },
});

GlowInput.displayName = 'GlowInput';
export default GlowInput;
