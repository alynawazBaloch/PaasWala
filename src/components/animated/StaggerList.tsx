import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import GlassCard from '../glass/GlassCard';
import Colors from '../../utils/colors';

interface StaggerListProps {
  items: Array<{
    id: string;
    content: React.ReactNode;
  }>;
  itemStyle?: ViewStyle;
  containerStyle?: ViewStyle;
  delay?: number;
  staggerMs?: number;
}

const StaggerList: React.FC<StaggerListProps> = ({
  items,
  itemStyle,
  containerStyle,
  delay = 0,
  staggerMs = 50,
}) => {
  return (
    <View style={containerStyle}>
      {items.map((item, index) => (
        <StaggerItem
          key={item.id}
          index={index}
          delay={delay}
          staggerMs={staggerMs}
          style={itemStyle}
        >
          {item.content}
        </StaggerItem>
      ))}
    </View>
  );
};

interface StaggerItemProps {
  children: React.ReactNode;
  index: number;
  delay: number;
  staggerMs: number;
  style?: ViewStyle;
}

const StaggerItem: React.FC<StaggerItemProps> = ({
  children,
  index,
  delay,
  staggerMs,
  style,
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withDelay(
      delay + index * staggerMs,
      withSpring(1, { stiffness: 100, damping: 15 })
    ),
    transform: [
      {
        translateY: withDelay(
          delay + index * staggerMs,
          withSpring(0, { stiffness: 100, damping: 15 })
        ),
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          opacity: 0,
          transform: [{ translateY: 30 }],
        },
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default StaggerList;
