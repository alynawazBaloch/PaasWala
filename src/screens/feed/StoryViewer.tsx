import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated as RNAnimated,
  PanResponder,
  StatusBar,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AvatarBadge from '../../components/shared/AvatarBadge';
import Colors from '../../utils/colors';
import { viewStory, listenStoryViews, sendMessage as dsSendMessage } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import type { Story as StoryType, StoryView as StoryViewType } from '../../services/dataService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000;

const StoryViewer: React.FC<{ navigation?: any; route?: any }> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const stories: StoryType[] = route?.params?.stories || [];
  const startIndex = route?.params?.initialIndex ?? 0;
  const [currentIndex, setCurrentIndex] = useState(Math.min(startIndex, stories.length - 1));
  const progressAnim = useRef(new RNAnimated.Value(0)).current;
  const progressValue = useRef(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [viewers, setViewers] = useState<StoryViewType[]>([]);
  const [showViewers, setShowViewers] = useState(false);

  const currentStory = stories[currentIndex];
  const isOwnStory = currentStory?.authorId === currentUser?.uid;

  // Track view when story changes
  useEffect(() => {
    if (currentStory && currentUser && !isOwnStory) {
      viewStory(currentStory.id, currentUser.uid, currentUser.name || 'User', currentUser.avatar).catch(() => {});
    }
  }, [currentIndex]);

  // Load viewers for own stories
  useEffect(() => {
    if (!isOwnStory || !currentStory) return;
    const unsub = listenStoryViews(currentStory.id, setViewers);
    return unsub;
  }, [currentIndex, isOwnStory]);

  // Swipe to close
  const swipeAnim = useRef(new RNAnimated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 20 && Math.abs(g.dx) < 20,
      onPanResponderMove: (_, g) => { if (g.dy > 0) swipeAnim.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) handleClose();
        else RNAnimated.spring(swipeAnim, { toValue: 0, useNativeDriver: true, stiffness: 200, damping: 20 }).start();
      },
    })
  ).current;

  const startProgress = useCallback(() => {
    progressAnim.setValue(0);
    progressValue.current = 0;
    progressTimer.current = setInterval(() => {
      progressValue.current += 100 / (STORY_DURATION / 100);
      if (progressValue.current >= 100) {
        progressAnim.setValue(100);
        goToNext();
      } else {
        progressAnim.setValue(progressValue.current);
      }
    }, 100);
  }, [currentIndex]);

  const pauseProgress = useCallback(() => {
    if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null; }
  }, []);

  useEffect(() => {
    if (!isPaused) startProgress();
    return () => pauseProgress();
  }, [currentIndex, isPaused]);

  const goToNext = useCallback(() => {
    pauseProgress();
    if (currentIndex < stories.length - 1) setCurrentIndex((p) => p + 1);
    else handleClose();
  }, [currentIndex, stories.length]);

  const goToPrev = useCallback(() => {
    pauseProgress();
    if (currentIndex > 0) setCurrentIndex((p) => p - 1);
  }, [currentIndex]);

  const handleClose = useCallback(() => {
    pauseProgress();
    navigation?.goBack();
  }, [navigation]);

  const handleTap = useCallback((evt: { nativeEvent: { locationX: number } }) => {
    const tapX = evt.nativeEvent.locationX;
    const third = SCREEN_WIDTH / 3;
    if (tapX < third) goToPrev();
    else if (tapX > third * 2) goToNext();
    else setShowUI((p) => !p);
  }, [goToNext, goToPrev]);

  const handleLongPress = useCallback(() => { setIsPaused(true); pauseProgress(); }, []);
  const handleLongPressRelease = useCallback(() => { setIsPaused(false); }, []);

  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || !currentUser || !currentStory) return;
    // Send reply as a direct message to the story author
    const { findExistingChat, createChat } = await import('../../services/dataService');
    const existingChat = await findExistingChat(currentUser.uid, currentStory.authorId);
    if (existingChat) {
      await dsSendMessage({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
        chatId: existingChat.id,
        senderId: currentUser.uid,
        type: 'text',
        content: replyText.trim(),
        status: 'sending',
        createdAt: Date.now(),
        sharedPostId: currentStory.id,
        sharedPostPreview: `Re: ${currentStory.authorName}'s story`,
      });
    } else {
      const newChat = await createChat(currentUser.uid, currentStory.authorId, currentUser.name || 'User', currentStory.authorName);
      await dsSendMessage({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
        chatId: newChat.id,
        senderId: currentUser.uid,
        type: 'text',
        content: replyText.trim(),
        status: 'sending',
        createdAt: Date.now(),
        sharedPostId: currentStory.id,
        sharedPostPreview: `Re: ${currentStory.authorName}'s story`,
      });
    }
    setReplyText('');
    Alert.alert('Sent', 'Your reply has been sent.');
  }, [replyText, currentUser, currentStory]);

  if (!currentStory) return null;

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <RNAnimated.View
        style={[styles.background, {
          transform: [{ translateY: swipeAnim.interpolate({ inputRange: [0, SCREEN_HEIGHT], outputRange: [0, SCREEN_HEIGHT], extrapolate: 'clamp' }) }],
          opacity: swipeAnim.interpolate({ inputRange: [0, SCREEN_HEIGHT / 2], outputRange: [1, 0], extrapolate: 'clamp' }),
        }]}
        {...panResponder.panHandlers}
      >
        {/* Story Content */}
        <TouchableWithoutFeedback onPress={handleTap} onLongPress={handleLongPress} onPressOut={handleLongPressRelease}>
          <View style={styles.storyMedia}>
            {currentStory.type === 'text' ? (
              <LinearGradient
                colors={[currentStory.backgroundColor || '#1a2a1a', '#000']}
                style={StyleSheet.absoluteFill}
              />
            ) : currentStory.mediaUrl ? (
              <Image source={{ uri: currentStory.mediaUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : null}

            {currentStory.type === 'text' ? (
              <Text style={styles.storyText}>{currentStory.text}</Text>
            ) : (
              currentStory.text ? <Text style={styles.storyOverlayText}>{currentStory.text}</Text> : null
            )}

            {/* Tap zones */}
            <View style={styles.tapZones}>
              <View style={styles.tapZone} />
              <View style={styles.tapZone} />
              <View style={styles.tapZone} />
            </View>
          </View>
        </TouchableWithoutFeedback>

        {/* Progress bars */}
        {showUI && (
          <View style={[styles.progressContainer, { paddingTop: insets.top + 8 }]}>
            <View style={styles.progressRow}>
              {stories.map((_, idx) => (
                <View key={idx} style={styles.progressSegment}>
                  <View style={styles.progressBg}>
                    <RNAnimated.View style={[styles.progressFill, {
                      width: idx < currentIndex ? '100%' : idx > currentIndex ? '0%' : progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                      backgroundColor: idx <= currentIndex ? Colors.textPrimary : Colors.textMuted,
                    }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* User info */}
        {showUI && (
          <View style={[styles.userInfo, { paddingTop: insets.top + 34 }]}>
            <View style={styles.userInfoLeft}>
              <AvatarBadge name={currentStory.authorName} avatar={currentStory.authorAvatar} size={36} role={currentStory.authorRole as any} verified={false} />
              <View>
                <Text style={styles.userName}>{currentStory.authorName}</Text>
                <Text style={styles.storyTime}>{Math.floor((Date.now() - currentStory.createdAt) / 3600000)}h ago</Text>
              </View>
            </View>
            {isOwnStory && (
              <TouchableOpacity style={styles.viewersBtn} onPress={() => setShowViewers(!showViewers)}>
                <Ionicons name="eye-outline" size={20} color={Colors.accent} />
                <Text style={styles.viewersCount}>{viewers.length}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={26} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Viewers list (own stories) */}
        {showViewers && isOwnStory && (
          <View style={styles.viewersPanel}>
            <Text style={styles.viewersTitle}>Views ({viewers.length})</Text>
            <FlatList
              data={viewers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.viewerRow}>
                  <AvatarBadge name={item.viewerName} avatar={item.viewerAvatar} size={32} role="resident" verified={false} />
                  <Text style={styles.viewerName}>{item.viewerName}</Text>
                </View>
              )}
              style={styles.viewersList}
            />
          </View>
        )}

        {/* Reply input */}
        {showUI && !isOwnStory && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.bottom + 20}>
            <View style={[styles.replyBar, { paddingBottom: insets.bottom + 12 }]}>
              <TextInput
                style={styles.replyInput}
                placeholder={`Reply to ${currentStory.authorName}...`}
                placeholderTextColor={Colors.textMuted}
                value={replyText}
                onChangeText={setReplyText}
                maxLength={200}
              />
              <TouchableOpacity style={[styles.replySend, !replyText.trim() && { opacity: 0.4 }]} onPress={handleSendReply} disabled={!replyText.trim()}>
                <Ionicons name="send" size={18} color={Colors.accent} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* Bottom hint */}
        {showUI && !isOwnStory && (
          <View style={styles.bottomHint}>
            <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            <Text style={styles.bottomHintText}>Swipe down to close</Text>
          </View>
        )}

        {/* Paused indicator */}
        {isPaused && (
          <View style={styles.pausedOverlay}>
            <View style={styles.pausedIcon}>
              <Ionicons name="pause" size={32} color={Colors.textPrimary} />
            </View>
          </View>
        )}
      </RNAnimated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  background: { flex: 1, backgroundColor: '#000' },
  progressContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, paddingHorizontal: 8 },
  progressRow: { flexDirection: 'row', gap: 4 },
  progressSegment: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressBg: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  userInfo: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.3)',
  },
  userInfoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userName: { fontSize: 15, fontWeight: '700', color: '#FFF', fontFamily: 'Inter' },
  storyTime: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter', marginTop: 1 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  viewersBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(82,183,136,0.15)' },
  viewersCount: { fontSize: 12, fontWeight: '600', color: Colors.accent, fontFamily: 'Inter' },
  storyMedia: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  storyText: { fontSize: 32, fontWeight: '800', color: '#FFF', textAlign: 'center', paddingHorizontal: 40, fontFamily: 'Inter' },
  storyOverlayText: {
    position: 'absolute', bottom: 80, fontSize: 18, fontWeight: '600', color: '#FFF',
    textAlign: 'center', paddingHorizontal: 24, fontFamily: 'Inter',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  tapZones: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', zIndex: 10 },
  tapZone: { flex: 1 },
  bottomHint: { position: 'absolute', bottom: 80, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 30 },
  bottomHintText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter' },
  pausedOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', zIndex: 40,
  },
  pausedIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  replyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  replyInput: {
    flex: 1, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16, fontSize: 14, color: '#FFF', fontFamily: 'Inter',
  },
  replySend: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  viewersPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 35, maxHeight: 200,
    backgroundColor: 'rgba(0,0,0,0.85)', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 16,
  },
  viewersTitle: { fontSize: 14, fontWeight: '700', color: '#FFF', fontFamily: 'Inter', marginBottom: 8 },
  viewersList: { maxHeight: 140 },
  viewerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  viewerName: { fontSize: 13, fontWeight: '500', color: '#FFF', fontFamily: 'Inter' },
});

export default StoryViewer;
