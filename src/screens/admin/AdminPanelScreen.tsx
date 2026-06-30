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
import BounceButton from '../../components/animated/BounceButton';
import AvatarBadge from '../../components/shared/AvatarBadge';
import EmptyState3D from '../../components/shared/EmptyState3D';
import Colors from '../../utils/colors';
import { getAdminPending, approvePending, rejectPending, getAdminReports, dismissReport } from '../../services/dataService';
import type { AdminPending, AdminReport } from '../../services/dataService';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AdminPanelScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState<AdminPending[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [activeTab, setActiveTab] = useState<'approvals' | 'reports'>('approvals');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [p, r] = await Promise.all([getAdminPending(), getAdminReports()]);
    setPending(p);
    setReports(r);
  };

  const handleApprove = async (id: string) => {
    await approvePending(id);
    setPending((prev) => prev.filter((p) => p.id !== id));
  };

  const handleReject = async (id: string) => {
    await rejectPending(id);
    setPending((prev) => prev.filter((p) => p.id !== id));
  };

  const handleRemovePost = (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDismissReport = async (id: string) => {
    await dismissReport(id);
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  /* ---- top action buttons ---- */
  const ActionButtons = () => (
    <View style={styles.actionsRow}>
      <GlowButton
        title="Send Alert"
        onPress={() => navigation.navigate('CreateAlert')}
        variant="danger"
        size="sm"
        icon={<Ionicons name="warning" size={16} color={Colors.textPrimary} />}
        style={{ flex: 1 }}
      />
      <View style={{ width: 12 }} />
      <GlowButton
        title="Create Poll"
        onPress={() => navigation.navigate('CreatePoll')}
        size="sm"
        icon={<Ionicons name="stats-chart" size={16} color={Colors.textPrimary} />}
        style={{ flex: 1 }}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Background glow orbs */}
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Header ---- */}
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <View>
            <Text style={styles.greeting}>Admin Panel</Text>
            <View style={styles.badgeRow}>
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={14} color={Colors.accent} />
                <Text style={styles.adminBadgeText}>Super Admin</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={28} color={Colors.accent} />
          </View>
        </View>

        {/* ---- Top action buttons ---- */}
        <ActionButtons />

        {/* ---- Stats row ---- */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard} glowColor="transparent" noTouch>
            <Text style={styles.statNumber}>{pending.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </GlassCard>
          <GlassCard style={styles.statCard} glowColor="transparent" noTouch>
            <Text style={[styles.statNumber, { color: Colors.alertRed }]}>
              {reports.length}
            </Text>
            <Text style={styles.statLabel}>Reports</Text>
          </GlassCard>
          <GlassCard style={styles.statCard} glowColor="transparent" noTouch>
            <Text style={[styles.statNumber, { color: Colors.accent }]}>247</Text>
            <Text style={styles.statLabel}>Members</Text>
          </GlassCard>
        </View>

        {/* ---- Tab toggle ---- */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'approvals' && styles.tabActive]}
            onPress={() => setActiveTab('approvals')}
          >
            <Ionicons
              name="person-add"
              size={16}
              color={activeTab === 'approvals' ? Colors.accent : Colors.textMuted}
            />
            <Text
              style={[styles.tabText, activeTab === 'approvals' && styles.tabTextActive]}
            >
              Approvals
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reports' && styles.tabActive]}
            onPress={() => setActiveTab('reports')}
          >
            <Ionicons
              name="flag"
              size={16}
              color={activeTab === 'reports' ? Colors.accent : Colors.textMuted}
            />
            <Text
              style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}
            >
              Reports
            </Text>
          </TouchableOpacity>
        </View>

        {/* ---- Approvals list ---- */}
        {activeTab === 'approvals' && (
          <>
            {pending.length === 0 ? (
              <EmptyState3D
                icon="checkmark-done"
                title="All Caught Up"
                subtitle="No pending approvals"
              />
            ) : (
              pending.map((item) => (
                <GlassCard key={item.id} style={styles.approvalCard} glowColor="transparent">
                  <View style={styles.approvalRow}>
                    <AvatarBadge name={item.name} size={44} />
                    <View style={styles.approvalInfo}>
                      <Text style={styles.approvalName}>{item.name}</Text>
                      <View style={styles.approvalDetail}>
                        <Ionicons name="location" size={12} color={Colors.textMuted} />
                        <Text style={styles.approvalDetailText}>{item.address}</Text>
                      </View>
                      <View style={styles.approvalDetail}>
                        <Ionicons name="call" size={12} color={Colors.textMuted} />
                        <Text style={styles.approvalDetailText}>{item.phone}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.approvalActions}>
                    <GlowButton
                      title="Approve"
                      onPress={() => handleApprove(item.id)}
                      size="sm"
                      icon={<Ionicons name="checkmark" size={14} color={Colors.textPrimary} />}
                      style={{ flex: 1 }}
                    />
                    <View style={{ width: 10 }} />
                    <GlowButton
                      title="Reject"
                      onPress={() => handleReject(item.id)}
                      variant="danger"
                      size="sm"
                      style={{ flex: 1 }}
                    />
                  </View>
                </GlassCard>
              ))
            )}
          </>
        )}

        {/* ---- Reports list ---- */}
        {activeTab === 'reports' && (
          <>
            {reports.length === 0 ? (
              <EmptyState3D
                icon="shield-checkmark"
                title="No Reports"
                subtitle="Your neighborhood is looking good"
              />
            ) : (
              reports.map((item) => (
                <GlassCard key={item.id} style={styles.reportCard} glowColor="transparent">
                  <View style={styles.reportHeader}>
                    <View style={styles.reportIcon}>
                      <Ionicons name="flag" size={18} color={Colors.alertRed} />
                    </View>
                    <View style={styles.reportHeaderInfo}>
                      <Text style={styles.reportAuthor}>{item.author}</Text>
                      <Text style={styles.reportReason}>{item.reason}</Text>
                    </View>
                    <View style={styles.reportCountBadge}>
                      <Text style={styles.reportCountText}>{item.reportedBy}</Text>
                    </View>
                  </View>
                  <Text style={styles.reportPreview} numberOfLines={2}>
                    {item.preview}
                  </Text>
                  <View style={styles.reportActions}>
                    <GlowButton
                      title="Remove Post"
                      onPress={() => handleRemovePost(item.id)}
                      variant="danger"
                      size="sm"
                      style={{ flex: 1 }}
                    />
                    <View style={{ width: 10 }} />
                    <GlowButton
                      title="Dismiss"
                      onPress={() => handleDismissReport(item.id)}
                      variant="ghost"
                      size="sm"
                      style={{ flex: 1 }}
                    />
                  </View>
                </GlassCard>
              ))
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  orbTop: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(45,106,79,0.12)',
  },
  orbBottom: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(82,183,136,0.08)',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(82,183,136,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.3)',
  },
  adminBadgeText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(82,183,136,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Action buttons */
  actionsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 4,
    marginBottom: 16,
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
    backgroundColor: 'rgba(45,106,79,0.2)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  tabTextActive: {
    color: Colors.accent,
  },
  /* Approval cards */
  approvalCard: {
    marginBottom: 12,
  },
  approvalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  approvalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  approvalName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  approvalDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  approvalDetailText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  approvalActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  /* Report cards */
  reportCard: {
    marginBottom: 12,
    borderColor: 'rgba(255,68,68,0.3)',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reportAuthor: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  reportReason: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    marginTop: 1,
  },
  reportCountBadge: {
    backgroundColor: Colors.alertRed,
    borderRadius: 10,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  reportCountText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  reportPreview: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Inter',
    marginTop: 10,
    lineHeight: 18,
  },
  reportActions: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
});

export default AdminPanelScreen;

