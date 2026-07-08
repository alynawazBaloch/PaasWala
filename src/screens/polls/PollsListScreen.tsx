import React, { useState, useEffect, useMemo } from 'react';
import { listenPolls, votePoll as dsVotePoll } from '../../services/dataService';
import type { Poll } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassCard from '../../components/glass/GlassCard';
import SpringCard from '../../components/animated/SpringCard';
import EmptyState3D from '../../components/shared/EmptyState3D';
import Colors from '../../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'active' | 'past';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const getExpiryLabel = (expiresAt: number): string => {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 1) return `${days} days left`;
  if (days === 1) return '1 day left';
  if (hours > 1) return `${hours} hours left`;
  if (hours === 1) return '1 hour left';
  return 'Expiring soon';
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const PollsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('active');

  /* Real-time listener ------------------------------------------------- */
  useEffect(() => {
    const unsub = listenPolls((allPolls) => {
      setPolls(allPolls);
    });
    return unsub;
  }, []);

  /* Derived lists ------------------------------------------------------ */
  const now = Date.now();

  const activePolls = useMemo(
    () =>
      polls
        .filter((p) => p.expiresAt > now)
        .sort((a, b) => {
          // Pinned polls always at the top; secondary sort by createdAt desc
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.createdAt - a.createdAt;
        }),
    [polls, now],
  );

  const pastPolls = useMemo(
    () =>
      polls
        .filter((p) => p.expiresAt <= now)
        .sort((a, b) => b.createdAt - a.createdAt),
    [polls, now],
  );

  const displayedPolls = activeTab === 'active' ? activePolls : pastPolls;
  const isEmpty = displayedPolls.length === 0;

  /* Voting ------------------------------------------------------------- */
  const handleVote = async (pollId: string, optionId: string) => {
    try {
      await dsVotePoll(pollId, optionId);
    } catch (err) {
      console.warn('[PollsListScreen] votePoll failed:', err);
    }
  };

  /** Returns the option id the current user voted for (if any). */
  const getVotedOptionId = (poll: Poll): string | null => {
    if (!user?.uid) return null;
    return poll.voters?.[user.uid] ?? null;
  };

  /* Render helpers ----------------------------------------------------- */

  const renderOptionProgressBar = (percentage: number, isVoted: boolean) => (
    <View style={styles.progressBarBg}>
      <View
        style={[
          styles.progressBarFill,
          {
            width: `${Math.min(percentage, 100)}%` as any,
            backgroundColor: isVoted ? Colors.accent : Colors.primary,
          },
        ]}
      />
      {isVoted && (
        <View style={styles.votedCheck}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.accent} />
        </View>
      )}
    </View>
  );

  const renderPollCard = ({ item }: { item: Poll }) => {
    const isPast = item.expiresAt <= now;
    const votedOptionIdFromVoters = getVotedOptionId(item);
    // Fall back to per-option voted field when voters map isn't populated
    const hasVoted = votedOptionIdFromVoters !== null;
    const isVotingDisabled = isPast || hasVoted;

    return (
      <SpringCard onPress={undefined}>
        <GlassCard
          style={[styles.pollCard, isPast && styles.pollCardPast]}
          glowColor={
            item.isPinned && !isPast ? 'rgba(45,106,79,0.25)' : undefined
          }
        >
          {/* --- Header --- */}
          <View style={styles.pollHeader}>
            <View style={styles.pollHeaderLeft}>
              {item.isPinned && !isPast && (
                <View style={styles.pinnedBadge}>
                  <Ionicons name="trophy" size={14} color={Colors.warning} />
                  <Text style={styles.pinnedText}>Pinned</Text>
                </View>
              )}
              {isPast && (
                <View style={styles.expiredBadge}>
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.expiredBadgeText}>Expired</Text>
                </View>
              )}
            </View>
            {/* Anonymous polls don't show the creator */}
            {!item.anonymous && (
              <Text style={[styles.createdByText, isPast && styles.textMutedPast]}>
                {item.createdBy}
              </Text>
            )}
          </View>

          {/* --- Question --- */}
          <Text style={[styles.pollQuestion, isPast && styles.textMutedPast]}>
            {item.question}
          </Text>

          {/* --- Options --- */}
          <View style={styles.optionsContainer}>
            {item.options.map((option) => {
              const percentage =
                item.totalVotes > 0
                  ? Math.round((option.votes / item.totalVotes) * 100)
                  : 0;
              const isVoted =
                votedOptionIdFromVoters !== null
                  ? option.id === votedOptionIdFromVoters
                  : option.voted;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionRow,
                    isVoted && styles.optionRowVoted,
                    isPast && styles.optionRowPast,
                  ]}
                  onPress={() => {
                    if (!isVotingDisabled) {
                      handleVote(item.id, option.id);
                    }
                  }}
                  activeOpacity={isVotingDisabled ? 1 : 0.7}
                  disabled={isVotingDisabled}
                >
                  <View style={styles.optionTextRow}>
                    <Text
                      style={[
                        styles.optionText,
                        isVoted && { color: Colors.accent },
                        isPast && styles.textMutedPast,
                      ]}
                      numberOfLines={2}
                    >
                      {option.text}
                    </Text>
                    <Text
                      style={[
                        styles.optionPercentage,
                        isPast && styles.textMutedPast,
                      ]}
                    >
                      {percentage}%
                    </Text>
                  </View>

                  {/* Progress bar */}
                  {renderOptionProgressBar(percentage, isVoted)}

                  {/* Vote count */}
                  <Text
                    style={[
                      styles.voteCountText,
                      isPast && styles.textMutedPast,
                    ]}
                  >
                    {option.votes} vote{option.votes !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* --- Footer --- */}
          <View style={styles.pollFooter}>
            <View style={styles.expiryPill}>
              <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.expiryText}>
                {isPast ? 'Expired' : getExpiryLabel(item.expiresAt)}
              </Text>
            </View>
            <Text style={[styles.totalVotesText, isPast && styles.textMutedPast]}>
              {item.totalVotes} total vote
              {item.totalVotes !== 1 ? 's' : ''}
            </Text>
          </View>
        </GlassCard>
      </SpringCard>
    );
  };

  /* --- Main render ---------------------------------------------------- */

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="bar-chart" size={24} color={Colors.accent} />
          <Text style={styles.headerTitle}>Polls</Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => Alert.alert('Filter', 'Poll filtering coming soon.')}
        >
          <Ionicons name="funnel-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'active' ? 'checkbox' : 'checkbox-outline'}
            size={16}
            color={activeTab === 'active' ? Colors.accent : Colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.tabTextActive,
            ]}
          >
            Active
          </Text>
          {activePolls.length > 0 && (
            <View style={styles.tabCount}>
              <Text style={styles.tabCountText}>{activePolls.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'past' ? 'time' : 'time-outline'}
            size={16}
            color={activeTab === 'past' ? Colors.accent : Colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'past' && styles.tabTextActive,
            ]}
          >
            Past
          </Text>
          {pastPolls.length > 0 && (
            <View style={styles.tabCount}>
              <Text style={styles.tabCountText}>{pastPolls.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Poll list */}
      <FlatList
        data={displayedPolls}
        renderItem={renderPollCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState3D
            icon="bar-chart-outline"
            title={
              activeTab === 'active' ? 'No active polls' : 'No past polls'
            }
            subtitle={
              activeTab === 'active'
                ? 'Polls from community members will appear here'
                : 'Expired polls will appear here'
            }
            actionTitle={activeTab === 'active' ? 'Create Poll' : undefined}
            onAction={
              activeTab === 'active'
                ? () => navigation.navigate('CreatePoll')
                : undefined
            }
          />
        }
      />

      {/* FAB — only on active tab */}
      {activeTab === 'active' && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CreatePoll')}
        >
          <GlassCard glowColor="rgba(82,183,136,0.4)" style={styles.fabCard}>
            <Ionicons name="add" size={28} color={Colors.accent} />
          </GlassCard>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

/* -------------------------------------------------------------------- */
/*  Styles                                                               */
/* -------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* Header */
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
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Tabs */
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: Colors.glassBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(82,183,136,0.15)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.accent,
  },
  tabCount: {
    backgroundColor: 'rgba(82,183,136,0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
  },

  /* List */
  listContent: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 100,
  },

  /* Poll card */
  pollCard: {
    marginBottom: 14,
  },
  pollCardPast: {
    opacity: 0.5,
  },

  /* Header area inside card */
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pollHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  pinnedText: {
    color: Colors.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(160,160,160,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(160,160,160,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  expiredBadgeText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  createdByText: {
    color: Colors.textMuted,
    fontSize: 11,
  },

  /* Question */
  pollQuestion: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: 14,
  },

  /* Options */
  optionsContainer: {
    gap: 8,
  },
  optionRow: {
    backgroundColor: Colors.glassBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 12,
    overflow: 'hidden',
  },
  optionRowVoted: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(82,183,136,0.08)',
  },
  optionRowPast: {
    opacity: 0.6,
  },
  optionTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  optionPercentage: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },

  /* Progress bar */
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondaryBg,
    position: 'relative',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  votedCheck: {
    position: 'absolute',
    right: 4,
    top: -5,
  },
  voteCountText: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },

  /* Footer */
  pollFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  expiryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  expiryText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  totalVotesText: {
    color: Colors.textMuted,
    fontSize: 11,
  },

  /* Muted past text */
  textMutedPast: {
    color: Colors.textMuted,
  },

  /* FAB */
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

export default PollsListScreen;
