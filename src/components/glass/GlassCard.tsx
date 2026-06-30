import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Colors from '../../utils/colors';

interface GlassCardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  blurType?: 'dark' | 'light' | 'default' | 'extraLight' | 'regular' | 'prominent';
  glowColor?: string;
  noTouch?: boolean;
  noPadding?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 40,
  blurType = 'dark',
  glowColor = Colors.glassBorder,
  noTouch = false,
  noPadding = false,
  ...touchProps
}) => {
  const cardContent = (
    <View
      style={[
        styles.container,
        noPadding && { padding: 0 },
        glowColor && { borderColor: glowColor },
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={blurType}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, noPadding && { padding: 0 }]}>
        {children}
      </View>
    </View>
  );

  if (noTouch) return cardContent;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      {...touchProps}
    >
      {cardContent}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  content: {
    padding: 16,
  },
});

export default GlassCard;
