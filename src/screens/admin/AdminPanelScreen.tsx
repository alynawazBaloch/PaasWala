import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import AvatarBadge from '../../components/shared/AvatarBadge';
import EmptyState3D from '../../components/shared/EmptyState3D';
import Colors from '../../utils/colors';
import {
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  listenPostReports,
  resolvePostReport,
  listenUserReports,
  resolveUserReport,
  getBusinesses,
  approveBusiness,
  rejectBusiness,
  banUser,
  getNeighborhoodStats,
  getPlatformStats,
} from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import type { VerificationRequest } from '../../services/dataService';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TabDef {
  key: string;
  label: string;
  icon: string;
}

interface StatItem {
  label: string;
  value: number | string;
  icon: string;
  color: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AdminPanelScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  /* ---- State ---- */
  const [pendingRequests, setPendingRequests] = useState<VerificationRequest[]>([]);
  const [postReports, setPostReports] = useState<any[]>([]);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [neighborhoodStats, setNeighborhoodStats] = useState<any>(null);
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('approvals');
  const [loading, setLoading] = useState(true);
  const [banUid, setBanUid] = useState('');
  const [banning, setBanning] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* ---- Tab definitions ---- */
  const normalTabs: TabDef[] = [
    { key: 'approvals', label: 'Approvals', icon: 'person-add' },
    { key: 'postReports', label: 'Post Reports', icon: 'flag' },
    { key: 'userReports', label: 'User Reports', icon: 'people' },
    { key: 'businessApprovals', label: 'Business', icon: 'business' },
    { key: 'neighborhoodStats', label: 'Stats', icon: 'stats-chart' },
  ];

  const superAdminTabs: TabDef[] = [
    { key: 'platformStats', label: 'Platform', icon: 'globe' },
    { key: 'banUser', label: 'Ban User', icon: 'hand-left' },
  ];

  const canAccess =
    user?.role === 'admin' ||
    user?.role === 'superAdmin';

  const allTabs: TabDef[] = canAccess
    ? user?.role === 'superAdmin'
      ? [...normalTabs, ...superAdminTabs]
      : normalTabs
    : [];

  /* ---- Effects ---- */

  // Load initial data
  useEffect(() => {
    if (!canAccess) return;

    const loadInitial = async () => {
      setLoading(true);
      try {
        const [verifications, biz] = await Promise.all([
          getPendingVerifications(),
          getBusinesses(),
        ]);

        setPendingRequests(verifications || []);
        setBusinesses((biz || []).filter((b: any) => !b.verified));

        if (user?.neighborhoodId) {
          const stats = await getNeighborhoodStats(user.neighborhoodId);
          setNeighborhoodStats(stats);
        }

        if (user?.role === 'superAdmin') {
          const pStats = await getPlatformStats();
          setPlatformStats(pStats);
        }
      } catch (err) {
        console.error('Failed to load admin data', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, [user?.uid, user?.neighborhoodId, user?.role]);

  // Real-time listeners for reports
  useEffect(() => {
    if (!canAccess) return;

    const unsubPost = listenPostReports((reports: any[]) => {
      setPostReports(reports || []);
    });

    const unsubUser = listenUserReports((reports: any[]) => {
      setUserReports(reports || []);
    });

    return () => {
      try {
        if (typeof unsubPost === 'function') unsubPost();
      } catch (_) {}
      try {
        if (typeof unsubUser === 'function') unsubUser();
      } catch (_) {}
    };
  }, [user?.uid, user?.role]);

  /* ---- Handlers ---- */

  const handleApproveVerification = async (requestId: string, userId: string) => {
    if (!user?.uid) return;
    setActionLoading(`approve-${requestId}`);
    try {
      const ok = await approveVerification(requestId, user.uid);
      if (ok) {
        setPendingRequests((prev) => prev.filter((p) => p.id !== requestId));
      }
    } catch (err) {
      console.error('Approve failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectVerification = async (requestId: string) => {
    if (!user?.uid) return;
    setActionLoading(`reject-${requestId}`);
    try {
      const ok = await rejectVerification(requestId, user.uid);
      if (ok) {
        setPendingRequests((prev) => prev.filter((p) => p.id !== requestId));
      }
    } catch (err) {
      console.error('Reject failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolvePostReport = async (
    reportId: string,
    postId: string,
    action: 'removed' | 'restored',
  ) => {
    setActionLoading(`post-${reportId}`);
    try {
      await resolvePostReport(reportId, postId, action);
      setPostReports((prev) => prev.filter((r: any) => r.id !== reportId));
    } catch (err) {
      console.error('Resolve post report failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveUserReport = async (reportId: string, action: 'warned' | 'suspended' | 'banned' | 'cleared') => {
    setActionLoading(`user-${reportId}`);
    try {
      await resolveUserReport(reportId, action);
      setUserReports((prev) => prev.filter((r: any) => r.id !== reportId));
    } catch (err) {
      console.error('Resolve user report failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveBusiness = async (id: string) => {
    setActionLoading(`bizApprove-${id}`);
    try {
      await approveBusiness(id);
      setBusinesses((prev) => prev.filter((b: any) => b.id !== id));
    } catch (err) {
      console.error('Approve business failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectBusiness = async (id: string) => {
    setActionLoading(`bizReject-${id}`);
    try {
      await rejectBusiness(id);
      setBusinesses((prev) => prev.filter((b: any) => b.id !== id));
    } catch (err) {
      console.error('Reject business failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanUser = async () => {
    const trimmed = banUid.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter a user UID');
      return;
    }

    Alert.alert(
      'Confirm Ban',
      `Are you sure you want to permanently ban user "${trimmed}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban User',
          style: 'destructive',
          onPress: async () => {
            setBanning(true);
            try {
              await banUser(trimmed);
              Alert.alert('Success', `User ${trimmed} has been banned.`);
              setBanUid('');
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.message || 'Failed to ban user. Please check the UID and try again.',
              );
            } finally {
              setBanning(false);
            }
          },
        },
      ],
    );
  };

  const handleViewDetail = (requestId: string) => {
    navigation.navigate('VerificationDetail', { requestId });
  };

  /* ---- Access denied ---- */

  if (!canAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <EmptyState3D
            icon="shield"
            title="Access Denied"
            subtitle="You do not have permission to view this page."
          />
        </View>
      </SafeAreaView>
    );
  }

  /* ---- Render helpers ---- */

  const renderTabBar = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabScroll}
      contentContainerStyle={styles.tabScrollContent}
    >
      {allTabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={isActive ? Colors.accent : Colors.textMuted}
            />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderActionButton = (
    label: string,
    isLoading: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        isLoading && styles.actionButtonDisabled,
      ]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={Colors.textPrimary} />
      ) : (
        <Text style={styles.actionButtonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );

  const isActionLoading = (key: string) => actionLoading === key;

  /* ---- Section renderers ---- */

  const renderApprovalsSection = () => {
    if (loading) {
      return (
        <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
      );
    }

    if (pendingRequests.length === 0) {
      return (
        <EmptyState3D
          icon="checkmark-done"
          title="All Caught Up"
          subtitle="No pending verification requests"
        />
      );
    }

    return (
      <>
        <Text style={styles.sectionTitle}>
          Pending Verifications ({pendingRequests.length})
        </Text>
        {pendingRequests.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            onPress={() => handleViewDetail(item.id)}
          >
            <GlassCard style={styles.approvalCard} glowColor="transparent">
              <View style={styles.approvalRow}>
                <AvatarBadge
                  name={item.userName}
                  size={44}
                  avatar={item.userAvatar}
                />
                <View style={styles.approvalInfo}>
                  <Text style={styles.approvalName}>{item.userName}</Text>
                  <View style={styles.approvalDetail}>
                    <Ionicons name="location" size={12} color={Colors.textMuted} />
                    <Text style={styles.approvalDetailText} numberOfLines={1}>
                      {item.streetAddress}, {item.area}
                    </Text>
                  </View>
                  <View style={styles.approvalDetail}>
                    <Ionicons name="call" size={12} color={Colors.textMuted} />
                    <Text style={styles.approvalDetailText}>{item.userPhone}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </View>
              <View style={styles.cardActions}>
                <GlowButton
                  title={
                    isActionLoading(`approve-${item.id}`)
                      ? '...'
                      : 'Approve'
                  }
                  onPress={() => handleApproveVerification(item.id, item.userId)}
                  size="sm"
                  disabled={isActionLoading(`approve-${item.id}`)}
                  icon={
                    <Ionicons name="checkmark" size={14} color={Colors.textPrimary} />
                  }
                  style={{ flex: 1 }}
                />
                <View style={{ width: 10 }} />
                <GlowButton
                  title={
                    isActionLoading(`reject-${item.id}`)
                      ? '...'
                      : 'Reject'
                  }
                  onPress={() => handleRejectVerification(item.id)}
                  variant="danger"
                  size="sm"
                  disabled={isActionLoading(`reject-${item.id}`)}
                  style={{ flex: 1 }}
                />
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}
      </>
    );
  };

  const renderPostReportsSection = () => {
    if (postReports.length === 0) {
      return (
        <EmptyState3D
          icon="shield-checkmark"
          title="No Post Reports"
          subtitle="All posts are clean"
        />
      );
    }

    return (
      <>
        <Text style={styles.sectionTitle}>
          Post Reports ({postReports.length})
        </Text>
        {postReports.map((item: any) => (
          <GlassCard key={item.id} style={styles.reportCard} glowColor="transparent">
            <View style={styles.reportHeader}>
              <View style={styles.reportIcon}>
                <Ionicons name="flag" size={18} color={Colors.alertRed} />
              </View>
              <View style={styles.reportHeaderInfo}>
                <Text style={styles.reportAuthor}>
                  Post ID: {item.postId?.slice(0, 12)}...
                </Text>
                <Text style={styles.reportReason}>{item.reason}</Text>
              </View>
            </View>

            <View style={styles.reportMeta}>
              <Ionicons name="person-circle" size={14} color={Colors.textMuted} />
              <Text style={styles.reportMetaText}>
                Reported by: {item.reportedByName || 'Unknown'}
              </Text>
            </View>

            <View style={styles.cardActions}>
              <GlowButton
                title={
                  isActionLoading(`post-${item.id}`) && actionLoading === `post-${item.id}`
                    ? '...'
                    : 'Remove Post'
                }
                onPress={() => handleResolvePostReport(item.id, item.postId, 'removed')}
                variant="danger"
                size="sm"
                disabled={isActionLoading(`post-${item.id}`)}
                style={{ flex: 1 }}
              />
              <View style={{ width: 10 }} />
              <GlowButton
                title="Dismiss"
                onPress={() => handleResolvePostReport(item.id, item.postId, 'restored')}
                variant="ghost"
                size="sm"
                disabled={isActionLoading(`post-${item.id}`)}
                style={{ flex: 1 }}
              />
            </View>
          </GlassCard>
        ))}
      </>
    );
  };

  const renderUserReportsSection = () => {
    if (userReports.length === 0) {
      return (
        <EmptyState3D
          icon="people"
          title="No User Reports"
          subtitle="Community is getting along"
        />
      );
    }

    return (
      <>
        <Text style={styles.sectionTitle}>
          User Reports ({userReports.length})
        </Text>
        {userReports.map((item: any) => (
          <GlassCard key={item.id} style={styles.reportCard} glowColor="transparent">
            <View style={styles.reportHeader}>
              <View
                style={[
                  styles.reportIcon,
                  { backgroundColor: 'rgba(255,193,7,0.15)' },
                ]}
              >
                <Ionicons name="warning" size={18} color="#FFC107" />
              </View>
              <View style={styles.reportHeaderInfo}>
                <Text style={styles.reportAuthor}>
                  User ID: {item.reportedUserId?.slice(0, 12)}...
                </Text>
                <Text style={styles.reportReason}>{item.reason}</Text>
              </View>
            </View>

            <View style={styles.reportMeta}>
              <Ionicons name="person-circle" size={14} color={Colors.textMuted} />
              <Text style={styles.reportMetaText}>
                Reported by: {item.reportedByName || 'Unknown'}
              </Text>
            </View>

            <View style={styles.userReportActions}>
              <GlowButton
                title="Warn"
                onPress={() => handleResolveUserReport(item.id, 'warned')}
                size="sm"
                disabled={isActionLoading(`user-${item.id}`)}
                style={styles.warnButton}
              />
              <View style={{ width: 6 }} />
              <GlowButton
                title="Suspend"
                onPress={() => handleResolveUserReport(item.id, 'suspended')}
                variant="danger"
                size="sm"
                disabled={isActionLoading(`user-${item.id}`)}
                style={styles.suspendButton}
              />
              <View style={{ width: 6 }} />
              <GlowButton
                title="Ban"
                onPress={() => handleResolveUserReport(item.id, 'banned')}
                variant="danger"
                size="sm"
                disabled={isActionLoading(`user-${item.id}`)}
                style={styles.banButton}
              />
              <View style={{ width: 6 }} />
              <GlowButton
                title="Dismiss"
                onPress={() => handleResolveUserReport(item.id, 'cleared')}
                variant="ghost"
                size="sm"
                disabled={isActionLoading(`user-${item.id}`)}
                style={styles.dismissButton}
              />
            </View>
          </GlassCard>
        ))}
      </>
    );
  };

  const renderBusinessApprovalsSection = () => {
    if (loading) {
      return (
        <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
      );
    }

    if (businesses.length === 0) {
      return (
        <EmptyState3D
          icon="business"
          title="All Verified"
          subtitle="No pending business approvals"
        />
      );
    }

    return (
      <>
        <Text style={styles.sectionTitle}>
          Business Approvals ({businesses.length})
        </Text>
        {businesses.map((biz: any) => (
          <GlassCard key={biz.id} style={styles.bizCard} glowColor="transparent">
            <View style={styles.bizHeader}>
              <View style={styles.bizIcon}>
                <Ionicons name="business" size={22} color={Colors.accent} />
              </View>
              <View style={styles.bizInfo}>
                <Text style={styles.bizName}>{biz.name || 'Unnamed Business'}</Text>
                <View style={styles.bizCategoryRow}>
                  <Ionicons name="pricetag" size={12} color={Colors.textMuted} />
                  <Text style={styles.bizCategory}>
                    {biz.category || 'General'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.bizOwner}>
              <Ionicons name="person" size={14} color={Colors.textMuted} />
              <Text style={styles.bizOwnerText}>
                Owner:{' '}
                {biz.ownerName ||
                  biz.ownerId?.slice(0, 12) ||
                  'Unknown'}
              </Text>
            </View>

            {biz.description ? (
              <Text style={styles.bizDescription} numberOfLines={2}>
                {biz.description}
              </Text>
            ) : null}

            <View style={styles.cardActions}>
              <GlowButton
                title={
                  isActionLoading(`bizApprove-${biz.id}`)
                    ? '...'
                    : 'Approve'
                }
                onPress={() => handleApproveBusiness(biz.id)}
                size="sm"
                disabled={isActionLoading(`bizApprove-${biz.id}`)}
                icon={
                  <Ionicons name="checkmark" size={14} color={Colors.textPrimary} />
                }
                style={{ flex: 1 }}
              />
              <View style={{ width: 10 }} />
              <GlowButton
                title={
                  isActionLoading(`bizReject-${biz.id}`)
                    ? '...'
                    : 'Reject'
                }
                onPress={() => handleRejectBusiness(biz.id)}
                variant="danger"
                size="sm"
                disabled={isActionLoading(`bizReject-${biz.id}`)}
                style={{ flex: 1 }}
              />
            </View>
          </GlassCard>
        ))}
      </>
    );
  };

  const renderNeighborhoodStatsSection = () => {
    if (loading) {
      return (
        <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
      );
    }

    if (!neighborhoodStats) {
      return (
        <EmptyState3D
          icon="stats-chart"
          title="No Stats Available"
          subtitle="Could not load neighborhood statistics"
        />
      );
    }

    const statItems: StatItem[] = [
      {
        label: 'Total Members',
        value: neighborhoodStats.totalMembers ?? '--',
        icon: 'people',
        color: Colors.accent,
      },
      {
        label: 'Posts Today',
        value: neighborhoodStats.postsToday ?? '--',
        icon: 'chatbubbles',
        color: '#4FC3F7',
      },
      {
        label: 'Active Alerts',
        value: neighborhoodStats.activeAlerts ?? '--',
        icon: 'warning',
        color: Colors.alertRed ?? '#FF5252',
      },
    ];

    return (
      <>
        <Text style={styles.sectionTitle}>Neighborhood Overview</Text>
        <View style={styles.statsGrid}>
          {statItems.map((stat) => (
            <GlassCard
              key={stat.label}
              style={styles.statCard}
              glowColor="transparent"
              noTouch
            >
              <View
                style={[
                  styles.statIconWrap,
                  { backgroundColor: stat.color + '20' },
                ]}
              >
                <Ionicons name={stat.icon as any} size={24} color={stat.color} />
              </View>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </GlassCard>
          ))}
        </View>

        {neighborhoodStats.lastUpdated && (
          <Text style={styles.statsFooter}>
            Last updated:{' '}
            {new Date(
              neighborhoodStats.lastUpdated?.toDate?.() ||
                neighborhoodStats.lastUpdated,
            ).toLocaleDateString()}
          </Text>
        )}
      </>
    );
  };

  const renderPlatformStatsSection = () => {
    if (!platformStats) {
      return (
        <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
      );
    }

    const statItems: StatItem[] = [
      {
        label: 'Total Users',
        value: platformStats.totalUsers ?? '--',
        icon: 'people',
        color: Colors.accent,
      },
      {
        label: 'Neighborhoods',
        value: platformStats.totalNeighborhoods ?? '--',
        icon: 'business',
        color: '#4FC3F7',
      },
      {
        label: 'Total Posts',
        value: platformStats.totalPosts ?? '--',
        icon: 'chatbubbles',
        color: '#AB47BC',
      },
    ];

    return (
      <>
        <Text style={styles.sectionTitle}>Platform Statistics</Text>
        <View style={styles.statsGrid}>
          {statItems.map((stat) => (
            <GlassCard
              key={stat.label}
              style={styles.statCard}
              glowColor="transparent"
              noTouch
            >
              <View
                style={[
                  styles.statIconWrap,
                  { backgroundColor: stat.color + '20' },
                ]}
              >
                <Ionicons name={stat.icon as any} size={24} color={stat.color} />
              </View>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </GlassCard>
          ))}
        </View>

        {platformStats.lastUpdated && (
          <Text style={styles.statsFooter}>
            Last updated:{' '}
            {new Date(
              platformStats.lastUpdated?.toDate?.() ||
                platformStats.lastUpdated,
            ).toLocaleDateString()}
          </Text>
        )}
      </>
    );
  };

  const renderBanUserSection = () => (
    <>
      <Text style={styles.sectionTitle}>Ban a User</Text>
      <GlassCard style={styles.banCard} glowColor="transparent">
        <View style={styles.banIconWrap}>
          <Ionicons name="hand-left" size={32} color={Colors.alertRed} />
        </View>
        <Text style={styles.banDescription}>
          Enter the UID of the user you want to permanently ban from the
          platform. This action cannot be undone.
        </Text>
        <View style={styles.banInputRow}>
          <Ionicons
            name="search"
            size={18}
            color={Colors.textMuted}
            style={styles.banInputIcon}
          />
          <TextInput
            style={styles.banInput}
            placeholder="Enter user UID..."
            placeholderTextColor={Colors.textMuted}
            value={banUid}
            onChangeText={setBanUid}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <GlowButton
          title={banning ? 'Banning...' : 'Ban User'}
          onPress={handleBanUser}
          variant="danger"
          size="md"
          disabled={banning}
          icon={<Ionicons name="hand-left" size={18} color={Colors.textPrimary} />}
        />
      </GlassCard>
    </>
  );

  const renderSendPlatformAlertSection = () => (
    <>
      <Text style={styles.sectionTitle}>Send Platform Alert</Text>
      <GlassCard style={styles.alertCard} glowColor="transparent">
        <View style={styles.alertCardContent}>
          <View style={styles.alertIconWrap}>
            <Ionicons name="warning" size={36} color={Colors.alertRed} />
          </View>
          <Text style={styles.alertTitle}>Platform-Wide Alert</Text>
          <Text style={styles.alertDescription}>
            Create a platform-wide alert that will be visible to all users
            across all neighborhoods. Use this for critical announcements,
            maintenance notices, or emergency communications.
          </Text>
          <GlowButton
            title="Create Platform Alert"
            onPress={() => navigation.navigate('CreateAlert')}
            variant="danger"
            size="md"
            icon={
              <Ionicons name="add-circle" size={18} color={Colors.textPrimary} />
            }
          />
        </View>
      </GlassCard>
    </>
  );

  /* ---- Main render ---- */

  return (
    <SafeAreaView style={styles.container}>
      {/* Background glow orbs */}
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ---- Header ---- */}
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <View>
            <Text style={styles.greeting}>Admin Panel</Text>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.adminBadge,
                  user?.role === 'superAdmin' && styles.superAdminBadge,
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={14}
                  color={
                    user?.role === 'superAdmin' ? '#FFD700' : Colors.accent
                  }
                />
                <Text
                  style={[
                    styles.adminBadgeText,
                    user?.role === 'superAdmin' && styles.superAdminBadgeText,
                  ]}
                >
                  {user?.role === 'superAdmin' ? 'Super Admin' : 'Admin'}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[
              styles.headerIcon,
              user?.role === 'superAdmin' && styles.superAdminHeaderIcon,
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={28}
              color={
                user?.role === 'superAdmin' ? '#FFD700' : Colors.accent
              }
            />
          </View>
        </View>

        {/* ---- Top action buttons ---- */}
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
            icon={
              <Ionicons name="stats-chart" size={16} color={Colors.textPrimary} />
            }
            style={{ flex: 1 }}
          />
        </View>

        {/* ---- Tab bar ---- */}
        {renderTabBar()}

        {/* ---- Tab content ---- */}

        {activeTab === 'approvals' && renderApprovalsSection()}

        {activeTab === 'postReports' && renderPostReportsSection()}

        {activeTab === 'userReports' && renderUserReportsSection()}

        {activeTab === 'businessApprovals' && renderBusinessApprovalsSection()}

        {activeTab === 'neighborhoodStats' && renderNeighborhoodStatsSection()}

        {activeTab === 'platformStats' &&
          user?.role === 'superAdmin' &&
          renderPlatformStatsSection()}

        {activeTab === 'banUser' &&
          user?.role === 'superAdmin' &&
          renderBanUserSection()}

        {/* ---- Super Admin extra tools ---- */}
        {user?.role === 'superAdmin' && (
          <View style={styles.superAdminSection}>
            <View style={styles.superAdminDivider}>
              <Ionicons name="flash" size={16} color="#FFD700" />
              <Text style={styles.superAdminDividerText}>
                Super Admin Tools
              </Text>
              <Ionicons name="flash" size={16} color="#FFD700" />
            </View>
            {renderSendPlatformAlertSection()}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  /* ---- Container ---- */
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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

  /* ---- Header ---- */
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
  superAdminBadge: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderColor: 'rgba(255,215,0,0.4)',
  },
  superAdminBadgeText: {
    color: '#FFD700',
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
  superAdminHeaderIcon: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderColor: 'rgba(255,215,0,0.4)',
  },

  /* ---- Action buttons ---- */
  actionsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  /* ---- Section title ---- */
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 12,
    marginTop: 4,
  },

  /* ---- Tab bar ---- */
  tabScroll: {
    marginBottom: 16,
  },
  tabScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(45,106,79,0.25)',
    borderColor: 'rgba(82,183,136,0.5)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  tabTextActive: {
    color: Colors.accent,
  },

  /* ---- Stats grid ---- */
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginTop: 2,
    textAlign: 'center',
  },
  statsFooter: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.6,
  },

  /* ---- Loader ---- */
  loader: {
    marginTop: 40,
  },

  /* ---- Approval cards ---- */
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
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },

  /* ---- Action button ---- */
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(82,183,136,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(82,183,136,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },

  /* ---- Report cards (shared) ---- */
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
    marginLeft: 10,
  },
  reportAuthor: {
    fontSize: 14,
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
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  reportMetaText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },

  /* ---- User report actions ---- */
  userReportActions: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  warnButton: {
    flex: 1,
  },
  suspendButton: {
    flex: 1,
  },
  banButton: {
    flex: 1,
  },
  dismissButton: {
    flex: 1,
  },

  /* ---- Business cards ---- */
  bizCard: {
    marginBottom: 12,
  },
  bizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bizIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(82,183,136,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bizInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bizName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  bizCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  bizCategory: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  bizOwner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  bizOwnerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  bizDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginTop: 6,
    lineHeight: 18,
  },

  /* ---- Ban user ---- */
  banCard: {
    marginBottom: 12,
    padding: 4,
  },
  banIconWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  banDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  banInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  banInputIcon: {
    marginRight: 8,
  },
  banInput: {
    flex: 1,
    height: 46,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Inter',
  },

  /* ---- Alert card ---- */
  alertCard: {
    marginBottom: 12,
    borderColor: 'rgba(255,68,68,0.3)',
  },
  alertCardContent: {
    alignItems: 'center',
    padding: 8,
  },
  alertIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  /* ---- Super Admin section ---- */
  superAdminSection: {
    marginTop: 12,
  },
  superAdminDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 8,
  },
  superAdminDividerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
    fontFamily: 'Inter',
    letterSpacing: 1,
  },
});

export default AdminPanelScreen;
