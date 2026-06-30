import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../utils/colors';

interface BounceButtonProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  style?: ViewStyle;
  size?: number;
  color?: string;
  disabled?: boolean;
}

const BounceButton: React.FC<BounceButtonProps> = ({
  onPress,
  icon,
  title,
  style,
  size = 24,
  color = Colors.accent,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.container, style]}
    >
      {icon && <Ionicons name={icon} size={size} color={disabled ? Colors.textMuted : color} />}
      {title && (
        <Text style={[styles.text, disabled && { color: Colors.textMuted }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  text: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});

export default BounceButton;
