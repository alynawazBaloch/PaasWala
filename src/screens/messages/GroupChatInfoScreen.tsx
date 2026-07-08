import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import Colors from '../../utils/colors';
import AvatarBadge from '../../components/shared/AvatarBadge';
import GlassCard from '../../components/glass/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { leaveGroup, removeGroupMember, getUserById } from '../../services/dataService';
import type { Chat } from '../../services/dataService';

const GroupChatInfoScreen: React.FC<{ route: any }> = ({ route }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuth();
  const chatId = route?.params?.chatId || '';

  const [chat, setChat] = useState<Chat | null>(null);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'chats', chatId));
        if (snap.exists()) {
          const data = snap.data() as Chat;
          setChat(data);
          // Load member names
          const names: Record<string, string> = { ...data.participantNames };
          const missing = data.participants.filter((id) => !names[id]);
          await Promise.all(
            missing.map(async (id) => {
              const u = await getUserById(id);
              if (u) names[id] = u.name;
            })
          );
          setMemberNames(names);
        }
      } catch {}
      setLoading(false);
    })();
  }, [chatId]);

  const isAdmin = chat?.groupAdmin === currentUser?.uid;

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      if (!chat) return;
      Alert.alert('Remove Member', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeGroupMember(chatId, memberId);
            setChat((prev) =>
              prev ? { ...prev, participants: prev.participants.filter((p) => p !== memberId) } : prev
            );
          },
        },
      ]);
    },
    [chat, chatId]
  );

  const handleLeave = useCallback(async () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveGroup(chatId, currentUser!.uid);
          navigation.goBack();
        },
      },
    ]);
  }, [chatId, currentUser, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!chat) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Chat not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const members = chat.participants;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Info</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Group Info Card */}
      <GlassCard style={styles.groupInfoCard}>
        <View style={styles.groupAvatar}>
          <Ionicons name="people" size={40} color={Colors.accent} />
        </View>
        <Text style={styles.groupName}>{chat.groupName || 'Group'}</Text>
        <Text style={styles.memberCount}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
        {isAdmin && <Text style={styles.adminBadge}>Admin</Text>}
      </GlassCard>

      {/* Members */}
      <Text style={styles.sectionTitle}>Members</Text>
      <FlatList
        data={members}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: uid }) => {
          const isMe = uid === currentUser?.uid;
          const name = memberNames[uid] || uid;
          return (
            <View style={styles.memberRow}>
              <AvatarBadge name={name} size={40} role="resident" verified={false} />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
                {isMe && <Text style={styles.youLabel}>You</Text>}
                {chat.groupAdmin === uid && !isMe && <Text style={styles.adminLabel}>Admin</Text>}
              </View>
              {isAdmin && !isMe && (
                <TouchableOpacity onPress={() => handleRemoveMember(uid)} style={styles.removeBtn}>
                  <Ionicons name="remove-circle-outline" size={22} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      {/* Leave Group */}
      <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave} activeOpacity={0.7}>
        <Ionicons name="exit-outline" size={20} color={Colors.error} />
        <Text style={styles.leaveText}>Leave Group</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Inter' },
  groupInfoCard: {
    marginHorizontal: 20, marginBottom: 24, padding: 20, borderRadius: 16,
    alignItems: 'center', gap: 6,
  },
  groupAvatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.glassBg,
    borderWidth: 2, borderColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  groupName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Inter' },
  memberCount: { fontSize: 14, color: Colors.textMuted, fontFamily: 'Inter' },
  adminBadge: {
    fontSize: 11, fontWeight: '600', color: Colors.accent, fontFamily: 'Inter',
    backgroundColor: Colors.accent + '20', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 8, overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.textMuted, fontFamily: 'Inter',
    textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, marginBottom: 8,
  },
  listContent: { padding: 16, gap: 4 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12, backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
    gap: 12,
  },
  memberInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary, fontFamily: 'Inter' },
  youLabel: { fontSize: 11, fontWeight: '600', color: Colors.accent, fontFamily: 'Inter' },
  adminLabel: { fontSize: 11, fontWeight: '600', color: Colors.warning, fontFamily: 'Inter' },
  removeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, marginVertical: 20, paddingVertical: 14, gap: 8,
    borderRadius: 14, backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.error + '40',
  },
  leaveText: { fontSize: 16, fontWeight: '600', color: Colors.error, fontFamily: 'Inter' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: Colors.textMuted, fontFamily: 'Inter' },
});

export default GroupChatInfoScreen;
