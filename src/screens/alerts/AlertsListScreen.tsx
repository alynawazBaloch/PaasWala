import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import GlassModal from '../../components/glass/GlassModal';
import EmptyState3D from '../../components/shared/EmptyState3D';
import Colors from '../../utils/colors';
import { formatTimestamp } from '../../utils/helpers';
import {
  listenAlerts,
  resolveAlert as dsResolveAlert,
} from '../../services/dataService';
import type { Alert as PSAlert } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';

const ALERT_TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  crime: { icon: 'shield', color: Colors.alertRed },
  fire: { icon: 'flame', color: '#FF6B35' },
  flood: { icon: 'water', color: '#4A90D9' },
  medical: { icon: 'medkit', color: '#E91E63' },
  power_outage: { icon: 'flash', color: Colors.alertYellow },
  road_block: { icon: 'compass', color: '#9B59B6' },
  other: { icon: 'notifications', color: Colors.textSecondary },
};

const DANGER_TYPES = ['crime', 'fire', 'flood', 'medical'];

const AlertsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [allAlerts, setAllAlerts] = useState<PSAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<PSAlert | null>(null);

  useEffect(() => {
    const unsub = listenAlerts((alerts) => {
      setAllAlerts(alerts);
    });
    return unsub;
  }, []);

  const activeAlerts = allAlerts.filter((a) => !a.resolved);
  const resolvedAlerts = allAlerts.filter((a) => a.resolved);
  const currentAlerts = activeTab === 'active' ? activeAlerts : resolvedAlerts;

  const handleResolve = useCallback(
    async (id: string) => {
      Alert.alert('Resolve Alert', 'Mark this alert as resolved?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          style: 'destructive',
          onPress: async () => {
            await dsResolveAlert(id, user?.name || 'Admin');
            setSelectedAlert(null);
          },
        },
      ]);
    },
    [user?.name]
  );

  const handleAlertPress = useCallback((item: PSAlert) => {
    setSelectedAlert(item);
  }, []);

  const renderAlertCard = ({ item }: { item: PSAlert }) => {
    const config = ALERT_TYPE_CONFIG[item.type] || ALERT_TYPE_CONFIG.other;
    const isActive = !item.resolved;
    const isDanger = DANGER_TYPES.includes(item.type);

    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => handleAlertPress(item)}>
        <GlassCard
          style={[
            styles.alertCard,
            isActive && isDanger && {
              borderColor: Colors.alertRed,
              shadowColor: Colors.alertRed,
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 12,
            },
            isActive && !isDanger && {
              borderColor: config.color + '80',
              shadowColor: config.color,
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 8,
            },
            !isActive && { borderColor: Colors.glassBorder, opacity: 0.7 },
          ]}
          glowColor={
            isActive && isDanger
              ? 'rgba(255,68,68,0.35)'
              : isActive
              ? config.color + '30'
              : undefined
          }
        >
          {/* Red glow pulse bar for active danger alerts */}
          {isActive && isDanger && <View style={styles.dangerGlowBar} />}

          <View style={styles.alertHeader}>
            <View
              style={[
                styles.alertTypeIcon,
                {
                  backgroundColor: config.color + '20',
                  borderColor: config.color + '40',
                },
              ]}
            >
              <Ionicons name={config.icon} size={22} color={config.color} />
            </View>
            <View style={styles.alertHeaderText}>
              <Text
                style={[styles.alertTitle, !isActive && { color: Colors.textMuted }]}
              >
                {item.title}
              </Text>
              <View style={styles.alertMetaRow}>
                <View style={styles.locationChip}>
                  <Ionicons name="location" size={12} color={Colors.textMuted} />
                  <Text style={styles.locationText}>{item.location}</Text>
                </View>
                {item.reportedByName && (
                  <Text style={styles.reportedByText}>
                    by {item.reportedByName}
                  </Text>
                )}
              </View>
            </View>
            {isActive && isDanger && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
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
                title="Resolve"
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
      </TouchableOpacity>
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
            subtitle={
              activeTab === 'active'
                ? 'No active alerts in your neighborhood'
                : 'No resolved alerts'
            }
          />
        }
      />

      {/* FAB Create Alert */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CreateAlert')}
      >
        <GlassCard glowColor="rgba(255,68,68,0.4)" style={styles.fabCard}>
          <Ionicons name="add" size={28} color={Colors.error} />
        </GlassCard>
      </TouchableOpacity>

      {/* Alert Detail Modal */}
      <GlassModal
        visible={selectedAlert !== null}
        onClose={() => setSelectedAlert(null)}
        slideFrom="bottom"
      >
        {selectedAlert && (
          <View style={styles.detailContainer}>
            <View
              style={[
                styles.detailIconWrap,
                {
                  backgroundColor:
                    (ALERT_TYPE_CONFIG[selectedAlert.type] || ALERT_TYPE_CONFIG.other).color +
                    '20',
                },
              ]}
            >
              <Ionicons
                name={
                  (ALERT_TYPE_CONFIG[selectedAlert.type] || ALERT_TYPE_CONFIG.other).icon
                }
                size={36}
                color={
                  (ALERT_TYPE_CONFIG[selectedAlert.type] || ALERT_TYPE_CONFIG.other).color
                }
              />
            </View>
            <Text style={styles.detailTitle}>{selectedAlert.title}</Text>
            <View style={styles.detailStatusRow}>
              {!selectedAlert.resolved ? (
                <View style={styles.detailLiveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.detailLiveText}>Active</Text>
                </View>
              ) : (
                <View style={styles.detailResolvedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                  <Text style={styles.detailResolvedText}>Resolved</Text>
                </View>
              )}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{selectedAlert.description}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Location</Text>
              <View style={styles.detailLocationRow}>
                <Ionicons name="location" size={16} color={Colors.accent} />
                <Text style={styles.detailValue}>{selectedAlert.location}</Text>
              </View>
              {selectedAlert.latitude && selectedAlert.longitude && (
                <Text style={styles.detailCoords}>
                  {selectedAlert.latitude.toFixed(4)}, {selectedAlert.longitude.toFixed(4)}
                </Text>
              )}
            </View>

            <View style={styles.detailInfoGrid}>
              <View style={styles.detailInfoItem}>
                <Text style={styles.detailInfoLabel}>Reported by</Text>
                <Text style={styles.detailInfoValue}>
                  {selectedAlert.reportedByName || 'Anonymous'}
                </Text>
              </View>
              <View style={styles.detailInfoItem}>
                <Text style={styles.detailInfoLabel}>Time</Text>
                <Text style={styles.detailInfoValue}>
                  {formatTimestamp(selectedAlert.timestamp)}
                </Text>
              </View>
              {selectedAlert.resolvedAt && (
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoLabel}>Resolved at</Text>
                  <Text style={styles.detailInfoValue}>
                    {formatTimestamp(selectedAlert.resolvedAt)}
                  </Text>
                </View>
              )}
            </View>

            {!selectedAlert.resolved && (
              <GlowButton
                title="Mark as Resolved"
                onPress={() => handleResolve(selectedAlert.id)}
                variant="danger"
                size="lg"
                style={styles.resolveButton}
              />
            )}
          </View>
        )}
      </GlassModal>
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
    overflow: 'hidden',
    position: 'relative',
  },
  dangerGlowBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.alertRed,
    opacity: 0.8,
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
    gap: 8,
    flexWrap: 'wrap',
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
  reportedByText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.alertRed + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
    marginLeft: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.alertRed,
  },
  liveText: {
    color: Colors.alertRed,
    fontSize: 10,
    fontWeight: '700',
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

  // Detail Modal
  detailContainer: {
    alignItems: 'center',
    padding: 8,
  },
  detailIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  detailStatusRow: {
    marginTop: 8,
    marginBottom: 16,
  },
  detailLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.alertRed + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  detailLiveText: {
    color: Colors.alertRed,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  detailResolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailResolvedText: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  detailSection: {
    width: '100%',
    marginBottom: 14,
  },
  detailLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  detailLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailCoords: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter',
    marginTop: 4,
    marginLeft: 22,
  },
  detailInfoGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.glassBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  detailInfoItem: {
    width: '45%',
  },
  detailInfoLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  detailInfoValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  resolveButton: {
    width: '100%',
  },
});

export default AlertsListScreen;
