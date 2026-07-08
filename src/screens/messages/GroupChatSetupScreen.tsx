import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Colors from '../../utils/colors';
import AvatarBadge from '../../components/shared/AvatarBadge';
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../hooks/useFriends';
import { getUserById } from '../../services/dataService';
import { storage } from '../../services/firebase';

const GroupChatSetupScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuth();
  const { friends } = useFriends();

  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [groupPhoto, setGroupPhoto] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const handlePickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Gallery access is required to set a group photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setGroupPhoto(result.assets[0].uri);
    }
  }, []);

  const uploadPhoto = useCallback(async (): Promise<string | null> => {
    const uri = groupPhoto;
    if (!uri) return null;
    setPhotoUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const photoRef = ref(storage, `group_photos/${Date.now().toString(36)}.jpg`);
      await uploadBytes(photoRef, blob);
      const url = await getDownloadURL(photoRef);
      return url;
    } catch {
      return null;
    } finally {
      setPhotoUploading(false);
    }
  }, [groupPhoto]);

  const toggleMember = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (!groupName.trim()) {
      Alert.alert('Group name required', 'Please enter a group name.');
      return;
    }
    if (selectedIds.size < 1) {
      Alert.alert('Select members', 'Please select at least one member.');
      return;
    }
    setCreating(true);
    try {
      // Upload group photo if selected
      let groupPhotoUrl: string | null = null;
      if (groupPhoto) {
        const response = await fetch(groupPhoto);
        const blob = await response.blob();
        const photoRef = ref(storage, `group_photos/${Date.now().toString(36)}.jpg`);
        await uploadBytes(photoRef, blob);
        groupPhotoUrl = await getDownloadURL(photoRef);
      }

      const memberIds = Array.from(selectedIds);
      const allIds = [currentUser!.uid, ...memberIds];
      const names: Record<string, string> = { [currentUser!.uid]: currentUser!.name };
      const avatars: Record<string, string> = {};
      await Promise.all(
        memberIds.map(async (id: string) => {
          const u = await getUserById(id);
          if (u) {
            names[id] = u.name;
            if (u.avatar) avatars[id] = u.avatar;
          }
        })
      );
      const chatId = `group_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
      const { setDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../../services/firebase');
      await setDoc(doc(db, 'chats', chatId), {
        id: chatId,
        participants: allIds,
        participantNames: names,
        participantAvatars: avatars,
        type: 'group',
        groupName: groupName.trim(),
        groupPhoto: groupPhotoUrl,
        groupAdmin: currentUser!.uid,
        lastMessage: '',
        lastTimestamp: Date.now(),
        unreadCount: 0,
        online: {},
        disappearingMode: 'off',
        typing: {},
        muted: {},
        isMuted: false,
        pinned: false,
        createdAt: Date.now(),
      });
      navigation.replace('Conversation', { chatId, name: groupName.trim() });
    } catch (err) {
      Alert.alert('Error', 'Could not create group chat.');
    } finally {
      setCreating(false);
    }
  }, [groupName, selectedIds, groupPhoto, currentUser, navigation]);

  const friendUids = friends
    .map((c) => (c.fromUserId === currentUser?.uid ? c.toUserId : c.fromUserId))
    .filter((uid, i, arr) => arr.indexOf(uid) === i);

  const renderItem = ({ item: uid }: { item: string }) => {
    const isSelected = selectedIds.has(uid);
    return (
      <TouchableOpacity
        style={[styles.memberRow, isSelected && styles.memberRowSelected]}
        onPress={() => toggleMember(uid)}
        activeOpacity={0.7}
      >
        <AvatarBadge name="" size={40} role="resident" verified={false} />
        <Text style={styles.memberName} numberOfLines={1}>{uid}</Text>
        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
          {isSelected && <Ionicons name="checkmark" size={16} color={Colors.background} />}
        </View>
      </TouchableOpacity>
    );
  };

  const canCreate = groupName.trim().length > 0 && selectedIds.size >= 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Group</Text>
        <TouchableOpacity onPress={handleCreate} disabled={!canCreate || creating}>
          <Text style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}>
            {creating ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Group Photo Picker */}
      <TouchableOpacity style={styles.photoContainer} onPress={handlePickPhoto} activeOpacity={0.7}>
        {groupPhoto ? (
          <Image source={{ uri: groupPhoto }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera" size={28} color={Colors.accent} />
          </View>
        )}
        <Text style={styles.photoLabel}>{groupPhoto ? 'Change Photo' : 'Add Group Photo'}</Text>
      </TouchableOpacity>

      <View style={styles.nameInputContainer}>
        <TextInput
          style={styles.nameInput}
          placeholder="Group name"
          placeholderTextColor={Colors.textMuted}
          value={groupName}
          onChangeText={setGroupName}
          maxLength={50}
        />
      </View>

      <Text style={styles.sectionTitle}>
        Add members ({selectedIds.size} selected)
      </Text>

      <FlatList
        data={friendUids}
        keyExtractor={(item) => item}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No friends to add. Make some friends first!</Text>
          </View>
        }
      />

      {creating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Inter' },
  createBtn: { fontSize: 16, fontWeight: '700', color: Colors.accent, fontFamily: 'Inter' },
  createBtnDisabled: { opacity: 0.4 },
  nameInputContainer: {
    marginHorizontal: 16, marginBottom: 16, backgroundColor: Colors.glassBg,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.glassBorder, paddingHorizontal: 14, height: 48,
    justifyContent: 'center',
  },
  nameInput: { fontSize: 16, color: Colors.textPrimary, fontFamily: 'Inter' },
  photoContainer: {
    alignItems: 'center', marginBottom: 16, gap: 8,
  },
  photoPreview: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: Colors.accent,
  },
  photoPlaceholder: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.glassBg,
    borderWidth: 2, borderColor: Colors.glassBorder, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  photoLabel: { fontSize: 13, fontWeight: '600', color: Colors.accent, fontFamily: 'Inter' },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.textMuted, fontFamily: 'Inter',
    textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, marginBottom: 8,
  },
  listContent: { padding: 16, gap: 4 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12,
    backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder, gap: 12,
  },
  memberRowSelected: { borderColor: Colors.accent, backgroundColor: Colors.primary + '20' },
  memberName: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.textPrimary, fontFamily: 'Inter' },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: Colors.textMuted, fontFamily: 'Inter', textAlign: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
});

export default GroupChatSetupScreen;
