import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../utils/colors';
import GlassCard from '../../components/glass/GlassCard';
import {
  getNotifications,
  markNotificationRead,
  clearAllNotifications,
} from '../../services/dataService';
import type { NotificationItem } from '../../services/dataService';

interface NotificationGroup {
  date: string;
  items: NotificationItem[];
}

const NOTIFICATION_ICONS: Record<
  NotificationItem['type'],
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  like: { icon: 'heart', color: '#FF4444' },
  comment: { icon: 'chatbubble', color: Colors.accent },
  alert: { icon: 'alert', color: Colors.warning },
  follow: { icon: 'person', color: '#4A90D9' },
};

const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const all = await getNotifications();
      setNotifications(all);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  const notificationGroups = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    notifications.forEach((item) => {
      const group = map.get(item.date) || [];
      group.push(item);
      map.set(item.date, group);
    });
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [notifications]);

  const hasUnread = notifications.some((item) => item.isUnread);

  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = notifications
      .filter((item) => item.isUnread)
      .map((item) => item.id);
    try {
      await Promise.all(unreadIds.map((id) => markNotificationRead(id)));
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isUnread: false }))
      );
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  }, [notifications]);

  const handleNotificationPress = useCallback(async (item: NotificationItem) => {
    if (item.isUnread) {
      try {
        await markNotificationRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isUnread: false } : n))
        );
      } catch (err) {
        console.error('Failed to mark notification read', err);
      }
    }
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert('Clear All', 'Clear all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearAllNotifications();
            setNotifications([]);
          } catch (err) {
            console.error('Failed to clear notifications', err);
          }
        },
      },
    ]);
  }, []);

  const renderNotificationItem = (item: NotificationItem) => {
    const iconConfig = NOTIFICATION_ICONS[item.type];

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.7}
        onPress={() => handleNotificationPress(item)}
        style={styles.notifItem}
      >
        {item.isUnread && <View style={styles.unreadIndicator} />}
        <View
          style={[
            styles.notifIconCircle,
            { backgroundColor: iconConfig.color + '20' },
          ]}
        >
          <Ionicons name={iconConfig.icon} size={20} color={iconConfig.color} />
        </View>
        <View style={styles.notifContent}>
          <Text style={[styles.notifTitle, item.isUnread && styles.notifTitleUnread]}>
            {item.title}
          </Text>
          {item.body ? (
            <Text style={styles.notifBody} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
          <Text style={styles.notifTimestamp}>{item.timestamp}</Text>
        </View>
        <TouchableOpacity style={styles.notifMore} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-horizontal" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderGroup = (group: NotificationGroup) => (
    <View key={group.date} style={styles.groupContainer}>
      <Text style={styles.groupDate}>{group.date}</Text>
      <GlassCard noTouch style={styles.groupCard}>
        {group.items.map((item, index) => (
          <React.Fragment key={item.id}>
            {renderNotificationItem(item)}
            {index < group.items.length - 1 && <View style={styles.notifDivider} />}
          </React.Fragment>
        ))}
      </GlassCard>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {hasUnread && (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={handleMarkAllRead}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done" size={18} color={Colors.accent} />
              <Text style={styles.markAllText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearAll}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {notificationGroups.length > 0 ? (
          notificationGroups.map(renderGroup)
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="notifications-off-outline" size={56} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>
              No new notifications to show.
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Groups
  groupContainer: {
    marginBottom: 20,
  },
  groupDate: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  groupCard: {
    borderRadius: 16,
    padding: 0,
    overflow: 'hidden',
  },

  // Notification Item
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    position: 'relative',
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    backgroundColor: Colors.accent,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  notifIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
    marginRight: 8,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    lineHeight: 18,
  },
  notifTitleUnread: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  notifBody: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginTop: 2,
    lineHeight: 17,
  },
  notifTimestamp: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginTop: 4,
  },
  notifMore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDivider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginHorizontal: 16,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default NotificationsScreen;
