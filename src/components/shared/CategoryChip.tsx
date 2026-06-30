import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../../utils/colors';

interface CategoryChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
  icon?: React.ReactNode;
}

const CategoryChip: React.FC<CategoryChipProps> = ({
  label,
  active = false,
  onPress,
  color = Colors.accent,
  icon,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        active
          ? { backgroundColor: color, borderColor: color }
          : { backgroundColor: Colors.glassBg, borderColor: Colors.glassBorder },
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text
        style={[
          styles.label,
          active ? { color: Colors.textPrimary } : { color: Colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  icon: {
    marginRight: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});

export default CategoryChip;
