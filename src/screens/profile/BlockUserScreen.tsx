import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import AvatarBadge from '../../components/shared/AvatarBadge';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import { blockUser } from '../../services/dataService';
import type { UserData } from '../../context/AuthContext';

type BlockUserRouteParams = {
  BlockUser: { user: UserData };
};

type BlockUserRouteProp = RouteProp<BlockUserRouteParams, 'BlockUser'>;

const warningItems = [
  'Hide their posts and comments from you',
  'Remove friend and follow connections',
  'Remove from search results',
  'Remove from nearby neighbors',
  'They won\'t be notified',
];

const BlockUserScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<BlockUserRouteProp>();
  const { user: targetUser } = route.params;
  const { user: currentUser } = useAuth();

  const [blocking, setBlocking] = useState(false);

  const handleBlock = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to block a user.');
      return;
    }

    Alert.alert(
      'Block User',
      `Are you sure you want to block ${targetUser.name}? This action can be undone later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setBlocking(true);
            try {
              await blockUser(currentUser.uid, targetUser.uid);
              Alert.alert('User Blocked', `${targetUser.name} has been blocked.`, [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch {
              Alert.alert('Error', 'Failed to block user. Please try again.');
            } finally {
              setBlocking(false);
            }
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Block User</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User preview */}
        <GlassCard style={styles.userCard} noTouch>
          <View style={styles.userRow}>
            <AvatarBadge
              name={targetUser.name}
              avatar={targetUser.avatar}
              size={52}
              role={targetUser.role}
              verified={targetUser.verified}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{targetUser.name}</Text>
              <Text style={styles.userRole}>
                {targetUser.role === 'admin'
                  ? 'Neighborhood Admin'
                  : targetUser.role === 'superAdmin'
                  ? 'Super Admin'
                  : targetUser.role === 'business'
                  ? 'Business Owner'
                  : 'Resident'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Warning card */}
        <GlassCard style={styles.warningCard} noTouch>
          <View style={styles.warningHeader}>
            <Ionicons name="shield-outline" size={24} color={Colors.error} />
            <Text style={styles.warningTitle}>Blocking {targetUser.name} will:</Text>
          </View>
          <View style={styles.warningList}>
            {warningItems.map((item, index) => (
              <View key={index} style={styles.warningItem}>
                <Ionicons name="remove" size={16} color={Colors.error} />
                <Text style={styles.warningItemText}>{item}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.warningNote}>
            You can unblock this user later from your settings if needed.
          </Text>
        </GlassCard>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <GlowButton
            title="Block User"
            onPress={handleBlock}
            variant="danger"
            loading={blocking}
            disabled={blocking}
            style={styles.blockBtn}
            size="lg"
          />
          <GlowButton
            title="Cancel"
            onPress={handleCancel}
            variant="outline"
            disabled={blocking}
            style={styles.cancelBtn}
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
    backgroundColor: Colors.secondaryBg,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // User preview
  userCard: {
    marginBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  userRole: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginTop: 2,
  },

  // Warning
  warningCard: {
    marginBottom: 28,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    flex: 1,
  },
  warningList: {
    gap: 12,
    marginBottom: 16,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningItemText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    flex: 1,
    lineHeight: 20,
  },
  warningNote: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Actions
  actionRow: {
    gap: 12,
  },
  blockBtn: {
    width: '100%',
  },
  cancelBtn: {
    width: '100%',
  },
});

export default BlockUserScreen;
