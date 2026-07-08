import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AvatarBadge from './AvatarBadge';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';

interface TappableAuthorProps {
  userId: string;
  name: string;
  avatar?: string;
  role: 'resident' | 'admin' | 'superAdmin' | 'business';
  verified: boolean;
  size?: number;
  showStreet?: boolean;
  street?: string;
  showTimestamp?: boolean;
  timestamp?: number;
}

const TappableAuthor: React.FC<TappableAuthorProps> = ({
  userId,
  name,
  avatar,
  role,
  verified,
  size = 36,
  showStreet,
  street,
  showTimestamp,
  timestamp,
}) => {
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuth();

  const handlePress = () => {
    const nav = navigation as any;
    if (userId === currentUser?.uid) {
      nav.navigate('MainTabs', { screen: 'Profile' });
    } else {
      nav.navigate('AuthorProfile', { userId });
    }
  };

  const formatTimestamp = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <AvatarBadge
        name={name}
        avatar={avatar ?? ''}
        size={size}
        role={role}
        verified={verified}
      />
      <View style={styles.textContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {verified && (
            <Ionicons
              name="checkmark-circle"
              size={14}
              color={Colors.accent}
            />
          )}
        </View>
        {showStreet && street ? (
          <Text style={styles.street} numberOfLines={1}>
            {street}
          </Text>
        ) : (
          <Text style={styles.role}>
            {role === 'admin'
              ? 'Admin'
              : role === 'superAdmin'
              ? 'Super Admin'
              : role === 'business'
              ? 'Business'
              : 'Resident'}
          </Text>
        )}
        {showTimestamp && timestamp && (
          <Text style={styles.timestamp}>{formatTimestamp(timestamp)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  textContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  role: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '500',
    fontFamily: 'Inter',
    marginTop: 1,
  },
  street: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '400',
    fontFamily: 'Inter',
    marginTop: 1,
  },
  timestamp: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginTop: 1,
  },
});

export default TappableAuthor;
