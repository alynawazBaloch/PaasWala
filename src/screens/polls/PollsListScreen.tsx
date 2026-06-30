import React, { useState, useEffect } from 'react';
import { getPolls, votePoll as dsVotePoll } from '../../services/dataService';
import type { Poll } from '../../services/dataService';
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

const MAX_BAR_WIDTH = SCREEN_WIDTH - 88;

const PollsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => { loadPolls(); }, []);
  const loadPolls = async () => {
    const all = await getPolls();
    all.sort((a, b) => (a.isPinned ? -1 : 1));
    setPolls(all);
  };

  const handleVote = async (pollId: string, optionId: string) => {
    await dsVotePoll(pollId, optionId);
    // Refresh polls to show updated state
    const all = await getPolls();
    all.sort((a, b) => (a.isPinned ? -1 : 1));
    setPolls(all);
  };

  const getExpiryLabel = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);
    if (days > 1) return `${days} days left`;
    if (days === 1) return '1 day left';
    if (hours > 1) return `${hours} hours left`;
    if (hours === 1) return '1 hour left';
    return 'Expiring soon';
  };

  const renderPollCard = ({ item }: { item: Poll }) => (
    <SpringCard onPress={() => Alert.alert('Vote', 'Voting on polls coming soon.')}>
      <GlassCard
        style={styles.pollCard}
        glowColor={item.isPinned ? 'rgba(45,106,79,0.25)' : undefined}
      >
        {/* Poll Header */}
        <View style={styles.pollHeader}>
          {item.isPinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="trophy" size={14} color={Colors.warning} />
              <Text style={styles.pinnedText}>Pinned</Text>
            </View>
          )}
          <Text style={styles.createdByText}>{item.createdBy}</Text>
        </View>

        {/* Question */}
        <Text style={styles.pollQuestion}>{item.question}</Text>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {item.options.map((option) => {
            const percentage = item.totalVotes > 0
              ? Math.round((option.votes / item.totalVotes) * 100)
              : 0;
            const isVoted = option.voted;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionRow,
                  isVoted && styles.optionRowVoted,
                ]}
                onPress={() => handleVote(item.id, option.id)}
                activeOpacity={0.7}
              >
                <View style={styles.optionTextRow}>
                  <Text
                    style={[
                      styles.optionText,
                      isVoted && { color: Colors.accent },
                    ]}
                  >
                    {option.text}
                  </Text>
                  <Text style={styles.optionPercentage}>
                    {percentage}%
                  </Text>
                </View>

                {/* Progress Bar Background */}
                <View style={styles.progressBarBg}>
                  {/* Colored Fill */}
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${percentage}%` as any,
                        backgroundColor: isVoted ? Colors.accent : Colors.primary,
                      },
                    ]}
                  />
                  {isVoted && (
                    <View style={styles.votedCheck}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.textPrimary} />
                    </View>
                  )}
                </View>

                {/* Vote Count */}
                <Text style={styles.voteCountText}>
                  {option.votes} vote{option.votes !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.pollFooter}>
          <View style={styles.expiryPill}>
            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.expiryText}>{getExpiryLabel(item.expiresAt)}</Text>
          </View>
          <Text style={styles.totalVotesText}>
            {item.totalVotes} total vote{item.totalVotes !== 1 ? 's' : ''}
          </Text>
        </View>
      </GlassCard>
    </SpringCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="bar-chart" size={24} color={Colors.accent} />
          <Text style={styles.headerTitle}>Polls</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={() => Alert.alert('Filter', 'Poll filtering coming soon.')}>
          <Ionicons name="funnel-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Polls List */}
      <FlatList
        data={polls}
        renderItem={renderPollCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState3D
            icon="bar-chart-outline"
            title="No active polls"
            subtitle="Polls from community members will appear here"
            actionTitle="Create Poll"
            onAction={() => navigation.navigate('CreatePoll')}
          />
        }
      />

      {/* FAB Create Poll */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => navigation.navigate('CreatePoll')}>
        <GlassCard
          glowColor="rgba(82,183,136,0.4)"
          style={styles.fabCard}
        >
          <Ionicons name="add" size={28} color={Colors.accent} />
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
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  pollCard: {
    marginBottom: 14,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
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
    fontFamily: 'Inter',
  },
  createdByText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter',
  },
  pollQuestion: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    lineHeight: 24,
    marginBottom: 14,
  },
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
    fontFamily: 'Inter',
    flex: 1,
  },
  optionPercentage: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginLeft: 8,
  },
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
    fontFamily: 'Inter',
    marginTop: 4,
  },
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
    fontFamily: 'Inter',
  },
  totalVotesText: {
    color: Colors.textMuted,
    fontSize: 11,
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

export default PollsListScreen;

