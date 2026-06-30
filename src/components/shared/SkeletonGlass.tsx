import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Colors from '../../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonGlassProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

const SkeletonGlass: React.FC<SkeletonGlassProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 12,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const shimmerStyle = {
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    }),
  };

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
        },
        shimmerStyle,
        style,
      ]}
    />
  );
};

interface SkeletonCardProps {
  lines?: number;
  style?: object;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3, style }) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <SkeletonGlass width={44} height={44} borderRadius={22} />
        <View style={styles.cardHeaderText}>
          <SkeletonGlass width={120} height={14} />
          <SkeletonGlass width={80} height={10} style={{ marginTop: 6 }} />
        </View>
      </View>
      <SkeletonGlass width="100%" height={200} borderRadius={16} style={{ marginTop: 12 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonGlass
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height={12}
          style={{ marginTop: 8 }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  card: {
    backgroundColor: Colors.glassBg,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
});

export default SkeletonGlass;
