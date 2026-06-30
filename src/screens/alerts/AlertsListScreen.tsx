import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import EmptyState3D from '../../components/shared/EmptyState3D';
import Colors from '../../utils/colors';
import { formatTimestamp } from '../../utils/helpers';
import { getAlerts, resolveAlert as dsResolveAlert } from '../../services/dataService';
import type { Alert as PSAlert } from '../../services/dataService';

const ALERT_TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  emergency: { icon: 'alert-circle', color: Colors.alertRed },
  security: { icon: 'shield', color: Colors.alertOrange },
  weather: { icon: 'thunderstorm', color: '#4A90D9' },
  utility: { icon: 'flash', color: Colors.alertYellow },
  traffic: { icon: 'compass', color: '#9B59B6' },
  lost_pet: { icon: 'heart', color: '#E91E63' },
  other: { icon: 'notifications', color: Colors.textSecondary },
};


const AlertsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [activeAlerts, setActiveAlerts] = useState<PSAlert[]>([]);
  const [resolvedAlerts, setResolvedAlerts] = useState<PSAlert[]>([]);

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = async () => {
    const all = await getAlerts();
    setActiveAlerts(all.filter(a => !a.resolved));
    setResolvedAlerts(all.filter(a => a.resolved));
  };

  const handleResolve = async (id: string) => {
    await dsResolveAlert(id);
    setActiveAlerts(prev => prev.filter(a => a.id !== id));
    const all = await getAlerts();
    setResolvedAlerts(all.filter(a => a.resolved));
  };

  const currentAlerts = activeTab === 'active' ? activeAlerts : resolvedAlerts;

  const renderAlertCard = ({ item }: { item: PSAlert }) => {
    const config = ALERT_TYPE_CONFIG[item.type] || ALERT_TYPE_CONFIG.other;
    const isActive = !item.resolved;

    return (
      <GlassCard
        style={[
          styles.alertCard,
          isActive && { borderColor: Colors.alertRed, shadowColor: Colors.alertRed },
          !isActive && { borderColor: Colors.glassBorder, opacity: 0.7 },
        ]}
        glowColor={isActive ? 'rgba(255,68,68,0.25)' : undefined}
      >
        <View style={styles.alertHeader}>
          <View
            style={[
              styles.alertTypeIcon,
              { backgroundColor: config.color + '20', borderColor: config.color + '40' },
            ]}
          >
            <Ionicons name={config.icon} size={22} color={config.color} />
          </View>
          <View style={styles.alertHeaderText}>
            <Text style={[styles.alertTitle, !isActive && { color: Colors.textMuted }]}>
              {item.title}
            </Text>
            <View style={styles.alertMetaRow}>
              <View style={styles.locationChip}>
                <Ionicons name="location" size={12} color={Colors.textMuted} />
                <Text style={styles.locationText}>{item.location}</Text>
              </View>
            </View>
          </View>
        </View>

        <Text
          style={[styles.alertDescription, !isActive && { color: Colors.textMuted }]}
          numberOfLines={3}
        >
          {item.description}
        </Text>

        <View style={styles.alertFooter}>
          <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
          {isActive && (
            <GlowButton
              title="Mark Resolved"
              onPress={() => handleResolve(item.id)}
              size="sm"
              variant="ghost"
              textStyle={{ color: Colors.textMuted, fontSize: 12 }}
            />
          )}
          {!isActive && (
            <View style={styles.resolvedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.resolvedText}>Resolved</Text>
            </View>
          )}
        </View>
      </GlassCard>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="notifications" size={24} color={Colors.accent} />
          <Text style={styles.headerTitle}>Alerts</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{activeAlerts.length}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active
          </Text>
          {activeAlerts.length > 0 && (
            <View style={styles.tabCount}>
              <Text style={styles.tabCountText}>{activeAlerts.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alerts List */}
      <FlatList
        data={currentAlerts}
        renderItem={renderAlertCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState3D
            icon="checkmark-done"
            title="All Clear"
            subtitle={activeTab === 'active' ? 'No active alerts in your neighborhood' : 'No resolved alerts'}
          />
        }
      />

      {/* FAB Create Alert */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => navigation.navigate('CreateAlert')}>
        <GlassCard
          glowColor="rgba(255,68,68,0.4)"
          style={styles.fabCard}
        >
          <Ionicons name="add" size={28} color={Colors.error} />
        </GlassCard>
      </TouchableOpacity>
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  headerBadge: {
    backgroundColor: Colors.alertRed,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerBadgeText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  tabTextActive: {
    color: Colors.textPrimary,
  },
  tabCount: {
    backgroundColor: Colors.alertRed,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabCountText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },
  alertCard: {
    marginBottom: 12,
    borderColor: Colors.alertRed,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  alertMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  locationText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter',
  },
  alertDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Inter',
    lineHeight: 19,
    marginTop: 10,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  timestamp: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter',
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resolvedText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 30,
  },
  fabCard: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
});

export default AlertsListScreen;

