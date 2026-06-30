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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AvatarBadge from '../../components/shared/AvatarBadge';
import Colors from '../../utils/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

interface Story {
  id: string;
  userName: string;
  userAvatar?: string;
  userRole: string;
  mediaUrl?: string;
  timestamp: number;
}

const MOCK_STORIES: Story[] = [
  {
    id: 's1',
    userName: 'Aisha Khan',
    userAvatar: '',
    userRole: 'resident',
    timestamp: Date.now() - 1800000,
  },
  {
    id: 's2',
    userName: 'Imran Ali',
    userAvatar: '',
    userRole: 'admin',
    timestamp: Date.now() - 3600000,
  },
  {
    id: 's3',
    userName: 'Fatima Hassan',
    userAvatar: '',
    userRole: 'resident',
    timestamp: Date.now() - 7200000,
  },
];

const StoryViewer: React.FC<{ navigation?: any; route?: any }> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const startIndex = route?.params?.initialIndex ?? 0;
  const stories = route?.params?.stories || MOCK_STORIES;
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(startIndex, stories.length - 1)
  );
  const progressAnim = useRef(new RNAnimated.Value(0)).current;
  const progressValue = useRef(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showUI, setShowUI] = useState(true);

  // Swipe to close
  const swipeAnim = useRef(new RNAnimated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 20 && Math.abs(gestureState.dx) < 20;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          swipeAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120) {
          handleClose();
        } else {
          RNAnimated.spring(swipeAnim, {
            toValue: 0,
            useNativeDriver: true,
            stiffness: 200,
            damping: 20,
          }).start();
        }
      },
    })
  ).current;

  const currentStory = stories[currentIndex];

  // Start/resume progress animation
  const startProgress = useCallback(() => {
    progressAnim.setValue(0);
    progressValue.current = 0;
    progressTimer.current = setInterval(() => {
      progressValue.current += 100 / (STORY_DURATION / 100);
      if (progressValue.current >= 100) {
        progressAnim.setValue(100);
        goToNext();
        progressValue.current = 0;
        progressAnim.setValue(0);
      } else {
        progressAnim.setValue(progressValue.current);
      }
    }, 100);
  }, [currentIndex]);

  const pauseProgress = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }, []);

  // Load and start progress for current story
  useEffect(() => {
    if (!isPaused) {
      startProgress();
    }
    return () => pauseProgress();
  }, [currentIndex, isPaused]);

  const goToNext = useCallback(() => {
    pauseProgress();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  }, [currentIndex]);

  const goToPrev = useCallback(() => {
    pauseProgress();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleClose = useCallback(() => {
    pauseProgress();
    navigation?.goBack();
  }, [navigation]);

  const handleTap = useCallback(
    (evt: { nativeEvent: { locationX: number } }) => {
      const tapX = evt.nativeEvent.locationX;
      const thirdWidth = SCREEN_WIDTH / 3;

      if (tapX < thirdWidth) {
        goToPrev();
      } else if (tapX > thirdWidth * 2) {
        goToNext();
      } else {
        // Middle tap to toggle UI
        setShowUI((prev) => !prev);
      }
    },
    [goToNext, goToPrev]
  );

  const handleLongPress = useCallback(() => {
    setIsPaused(true);
    pauseProgress();
  }, []);

  const handleLongPressRelease = useCallback(() => {
    setIsPaused(false);
  }, []);

  const renderProgressBars = () => (
    <View style={[styles.progressContainer, { paddingTop: insets.top + 8 }]}>
      <View style={styles.progressRow}>
        {stories.map((_, index) => (
          <View key={index} style={styles.progressSegment}>
            <View style={styles.progressBg}>
              <RNAnimated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      index < currentIndex
                        ? '100%'
                        : index > currentIndex
                        ? '0%'
                        : progressAnim.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                            extrapolate: 'clamp',
                          }),
                  },
                  index < currentIndex && { backgroundColor: Colors.textPrimary },
                  index === currentIndex && { backgroundColor: Colors.textPrimary },
                  index > currentIndex && { backgroundColor: Colors.textMuted },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderUserInfo = () => (
    <View style={[styles.userInfo, { paddingTop: insets.top + 34 }]}>
      <View style={styles.userInfoLeft}>
        <AvatarBadge
          name={currentStory.userName}
          avatar={currentStory.userAvatar || undefined}
          size={36}
          role={currentStory.userRole as any}
          verified={currentStory.userRole !== 'resident'}
        />
        <View>
          <Text style={styles.userName}>{currentStory.userName}</Text>
          <Text style={styles.storyTime}>
            {Math.floor((Date.now() - currentStory.timestamp) / 3600000)}h ago
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleClose}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={26} color={Colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  const renderStoryContent = () => {
    // Gradient background for visual placeholder stories
    const gradientPairs: [string, string][] = [
      ['#1a2a1a', '#2D6A4F'],
      ['#1a1a2a', '#2D4A6F'],
      ['#2a1a1a', '#6F2D2D'],
    ];

    const colors = gradientPairs[currentIndex % gradientPairs.length];

    return (
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={styles.storyMedia}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.storyContentOverlay}>
            <View style={styles.storyIconContainer}>
              <Ionicons name="images-outline" size={48} color={Colors.textSecondary} />
            </View>
            <Text style={styles.storyHintText}>
              Story by {currentStory.userName}
            </Text>
          </View>

          {/* Tap zone indicators */}
          <View style={styles.tapZones}>
            <View style={styles.tapZone} />
            <View style={styles.tapZone} />
            <View style={styles.tapZone} />
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Background */}
      <RNAnimated.View
        style={[
          styles.background,
          {
            transform: [
              {
                translateY: swipeAnim.interpolate({
                  inputRange: [0, SCREEN_HEIGHT],
                  outputRange: [0, SCREEN_HEIGHT],
                  extrapolate: 'clamp',
                }),
              },
            ],
            opacity: swipeAnim.interpolate({
              inputRange: [0, SCREEN_HEIGHT / 2],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Story Media */}
        {renderStoryContent()}

        {/* Progress Bars */}
        {showUI && renderProgressBars()}

        {/* User Info */}
        {showUI && renderUserInfo()}

        {/* Bottom hint */}
        {showUI && (
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
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Progress Bars
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 8,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBg: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // User Info
  userInfo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  storyTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    marginTop: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Story Media
  storyMedia: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyContentOverlay: {
    alignItems: 'center',
    gap: 12,
    zIndex: 5,
  },
  storyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyHintText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Inter',
  },

  // Tap Zones
  tapZones: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 10,
  },
  tapZone: {
    flex: 1,
  },

  // Bottom
  bottomHint: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 30,
  },
  bottomHintText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },

  // Paused overlay
  pausedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  pausedIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default StoryViewer;
