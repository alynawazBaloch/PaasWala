import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../utils/colors';
import { ROLE_BADGES } from '../../utils/constants';

interface AvatarBadgeProps {
  name: string;
  avatar?: string;
  size?: number;
  role?: keyof typeof ROLE_BADGES;
  verified?: boolean;
  showOnline?: boolean;
  online?: boolean;
}

const AvatarBadge: React.FC<AvatarBadgeProps> = ({
  name,
  avatar,
  size = 44,
  role = 'resident',
  verified = true,
  showOnline = false,
  online = false,
}) => {
  const badge = ROLE_BADGES[role] || ROLE_BADGES.resident;
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.container}>
      <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 2 }]}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />
        ) : (
          <View
            style={[
              styles.fallback,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: Colors.glassBg,
              },
            ]}
          >
            <Text
              style={[
                styles.initials,
                { fontSize: size * 0.4 },
              ]}
            >
              {initials}
            </Text>
          </View>
        )}
        {showOnline && (
          <View
            style={[
              styles.onlineDot,
              {
                backgroundColor: online ? Colors.success : Colors.textMuted,
                width: size * 0.28,
                height: size * 0.28,
                borderRadius: (size * 0.28) / 2,
                right: -2,
                top: size * 0.03,
              },
            ]}
          />
        )}
      </View>
      {verified && role !== 'resident' && (
        <View style={[styles.badge, { backgroundColor: badge.color }]}>
          <Ionicons name={badge.icon as any} size={12} color="#fff" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
  },
  avatarContainer: {
    borderWidth: 2,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  avatar: {
    resizeMode: 'cover',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  initials: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  onlineDot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.background,
    borderRadius: 10,
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
});

export default AvatarBadge;
