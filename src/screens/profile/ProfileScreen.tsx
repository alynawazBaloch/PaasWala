import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../utils/colors';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import AvatarBadge from '../../components/shared/AvatarBadge';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { getPosts, getUsers, getEvents } from '../../services/dataService';
import type { Post } from '../../services/dataService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 200;

type ContentTab = 'posts' | 'saved' | 'listings';

const ProfileScreen: React.FC = () => {
  const [activeContentTab, setActiveContentTab] = useState<ContentTab>('posts');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [neighborCount, setNeighborCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const repAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();

  useEffect(() => { loadStats(); }, []);
  const loadStats = async () => {
    if (!user) return;
    const allPosts = await getPosts();
    const myPosts = allPosts.filter(p => p.authorId === user.uid);
    setUserPosts(myPosts);
    setPostCount(myPosts.length);

    const allUsers = await getUsers();
    setNeighborCount(allUsers.filter(u =>
      u.neighborhoodName && user.neighborhoodName &&
      u.neighborhoodName === user.neighborhoodName
    ).length);

    const allEvents = await getEvents();
    setEventCount(allEvents.length);
  };

  useEffect(() => {
    const rotation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotation.start();

    Animated.timing(repAnim, {
      toValue: 1,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => rotation.stop();
  }, []);

  const rotateInterpolation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const repScore = user?.reputationScore ?? 125;
  const maxRep = 300;
  const repPercent = Math.min(repScore / maxRep, 1);
  const animatedRepWidth = repAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${repPercent * 100}%`],
  });

  const getRepTier = () => {
    if (repScore >= 200) return { label: 'Gold', color: '#FFD700', glow: 'rgba(255,215,0,0.4)' };
    if (repScore >= 50) return { label: 'Silver', color: '#C0C0C0', glow: 'rgba(192,192,192,0.4)' };
    return { label: 'Bronze', color: '#CD7F32', glow: 'rgba(205,127,50,0.4)' };
  };

  const repTier = getRepTier();

  const repBarWidth = repAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${(repScore / maxRep) * 100}%`],
  });

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('[Profile] Logout failed:', err);
    }
  };

  const contentTabs: { key: ContentTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'posts', label: 'Posts', icon: 'grid-outline' },
    { key: 'saved', label: 'Saved', icon: 'bookmark-outline' },
    { key: 'listings', label: 'Listings', icon: 'pricetag-outline' },
  ];

  const renderCover = () => (
    <View style={styles.coverContainer}>
      <LinearGradient
        colors={['rgba(45,106,79,0.6)', Colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.coverGradient}
      >
        <View style={styles.coverPattern}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.coverPatternCircle,
                {
                  left: 20 + i * 45,
                  top: 10 + (i % 3) * 40,
                  width: 60 + (i % 2) * 30,
                  height: 60 + (i % 2) * 30,
                  borderRadius: (60 + (i % 2) * 30) / 2,
                  opacity: 0.08,
                },
              ]}
            />
          ))}
        </View>
      </LinearGradient>

      {/* Rotating Emerald Ring */}
      <Animated.View
        style={[
          styles.avatarRing,
          { transform: [{ rotate: rotateInterpolation }] },
        ]}
      >
        <LinearGradient
          colors={[Colors.accent, Colors.primary, Colors.glow, Colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ringGradient}
        />
      </Animated.View>

      <View style={styles.avatarPosition}>
        <AvatarBadge
          name={user?.name || 'Neighbor'}
          avatar={user?.avatar}
          size={80}
          role={user?.role || 'resident'}
          verified={user?.verified ?? true}
        />
      </View>
    </View>
  );

  const renderProfileInfo = () => (
    <View style={styles.profileInfo}>
      <Text style={styles.profileName}>{user?.name || 'Neighbor'}</Text>
      <View style={styles.streetRow}>
        <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
        <Text style={styles.streetText}>
          {user?.streetName || 'Street Name'}, {user?.neighborhoodName || 'Neighborhood'}
        </Text>
      </View>
      <Text style={styles.neighborSince}>
        Neighbor since{' '}
        {user?.createdAt
          ? new Date(user.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })
          : 'June 2025'}
      </Text>
    </View>
  );

  const renderReputationBar = () => (
    <View style={styles.repSection}>
      <View style={styles.repHeader}>
        <Text style={styles.repTitle}>Reputation</Text>
        <View style={[styles.tierBadge, { backgroundColor: repTier.color + '30', borderColor: repTier.color }]}>
          <LinearGradient
            colors={['transparent', repTier.glow]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={[styles.tierText, { color: repTier.color }]}>{repTier.label}</Text>
        </View>
      </View>
      <View style={styles.repBarBg}>
        <Animated.View style={[styles.repBarFill, { width: repBarWidth }]}>
          <LinearGradient
            colors={[Colors.primary, Colors.accent, Colors.glow]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <View style={styles.repScoreRow}>
        <Text style={styles.repScoreValue}>{repScore} pts</Text>
        <Text style={styles.repScoreMax}>/ {maxRep}</Text>
      </View>
    </View>
  );

  const renderStatsRow = () => (
    <View style={styles.statsRow}>
      <GlassCard style={styles.statCard} noTouch>
        <Text style={styles.statNumber}>{postCount}</Text>
        <Text style={styles.statLabel}>Posts</Text>
      </GlassCard>
      <GlassCard style={styles.statCard} noTouch>
        <Text style={styles.statNumber}>{neighborCount}</Text>
        <Text style={styles.statLabel}>Neighbors</Text>
      </GlassCard>
      <GlassCard style={styles.statCard} noTouch>
        <Text style={styles.statNumber}>{eventCount}</Text>
        <Text style={styles.statLabel}>Events</Text>
      </GlassCard>
    </View>
  );

  const renderContentTabs = () => (
    <View style={styles.contentTabRow}>
      {contentTabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.contentTab,
            activeContentTab === tab.key && styles.contentTabActive,
          ]}
          onPress={() => setActiveContentTab(tab.key)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={tab.icon}
            size={16}
            color={
              activeContentTab === tab.key
                ? Colors.accent
                : Colors.textMuted
            }
          />
          <Text
            style={[
              styles.contentTabLabel,
              activeContentTab === tab.key && styles.contentTabLabelActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPostGrid = () => (
    <View style={styles.postGrid}>
      {userPosts.map((post) => (
        <TouchableOpacity key={post.id} style={styles.postThumb} activeOpacity={0.8}>
          <LinearGradient
            colors={[Colors.glassBg, Colors.secondaryBg]}
            style={styles.postThumbInner}
          >
            <Ionicons name="image-outline" size={24} color={Colors.textMuted} />
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSavedTab = () => (
    <View style={styles.emptyTab}>
      <Ionicons name="bookmark-outline" size={48} color={Colors.textMuted} />
      <Text style={styles.emptyTabText}>No saved items yet</Text>
    </View>
  );

  const renderListingsTab = () => (
    <View style={styles.emptyTab}>
      <Ionicons name="pricetag-outline" size={48} color={Colors.textMuted} />
      <Text style={styles.emptyTabText}>No listings yet</Text>
    </View>
  );

  const renderSettingsLinks = () => {
    const links = [
      { icon: 'settings-outline' as const, label: 'Settings', onPress: () => navigation.navigate('Settings') },
      { icon: 'notifications-outline' as const, label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
      { icon: 'help-circle-outline' as const, label: 'Help & Support', onPress: () => Alert.alert('Help', 'Help & Support coming soon.') },
      { icon: 'information-circle-outline' as const, label: 'About', onPress: () => Alert.alert('About', 'About page coming soon.') },
    ];

    return (
      <View style={styles.settingsSection}>
        {links.map((link, index) => (
          <TouchableOpacity
            key={link.label}
            style={[
              styles.settingsLink,
              index < links.length - 1 && styles.settingsLinkBorder,
            ]}
            activeOpacity={0.7}
            onPress={link.onPress}
          >
            <View style={styles.settingsLinkLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name={link.icon} size={20} color={Colors.accent} />
              </View>
              <Text style={styles.settingsLinkLabel}>{link.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.headerEditBtn} onPress={() => navigation.navigate('EditProfile')}>
          <Ionicons name="create-outline" size={20} color={Colors.accent} />
          <Text style={styles.headerEditText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderCover()}
        {renderProfileInfo()}
        {renderReputationBar()}
        {renderStatsRow()}
        {renderContentTabs()}

        <View style={styles.contentSection}>
          {activeContentTab === 'posts' && renderPostGrid()}
          {activeContentTab === 'saved' && renderSavedTab()}
          {activeContentTab === 'listings' && renderListingsTab()}
        </View>

        {renderSettingsLinks()}

        <View style={styles.logoutSection}>
          <GlowButton
            title="Logout"
            onPress={handleLogout}
            variant="danger"
            size="lg"
            style={styles.logoutBtn}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  headerEditText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Cover
  coverContainer: {
    height: COVER_HEIGHT,
    position: 'relative',
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'visible',
    marginBottom: 50,
  },
  coverGradient: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  coverPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  coverPatternCircle: {
    position: 'absolute',
    backgroundColor: Colors.accent,
  },
  avatarRing: {
    position: 'absolute',
    bottom: -44,
    left: SCREEN_WIDTH / 2 - 124,
    width: 90,
    height: 90,
    borderRadius: 45,
    zIndex: 10,
    alignSelf: 'center',
  },
  ringGradient: {
    flex: 1,
    borderRadius: 45,
  },
  avatarPosition: {
    position: 'absolute',
    bottom: -40,
    left: SCREEN_WIDTH / 2 - 120,
    zIndex: 11,
    alignSelf: 'center',
  },

  // Profile Info
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  streetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  streetText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
  },
  neighborSince: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },

  // Reputation
  repSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.glassBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 16,
  },
  repHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  repTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  tierBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  repBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.glassBg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  repBarFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  repScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  repScoreValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
    fontFamily: 'Inter',
  },
  repScoreMax: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    marginLeft: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    marginTop: 2,
  },

  // Content Tabs
  contentTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  contentTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 6,
  },
  contentTabActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.glassBg,
  },
  contentTabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },
  contentTabLabelActive: {
    color: Colors.accent,
  },

  // Content Section
  contentSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },

  // Post Grid
  postGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  postThumb: {
    width: (SCREEN_WIDTH - 40 - 12) / 3,
    height: (SCREEN_WIDTH - 40 - 12) / 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  postThumbInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 12,
  },

  // Empty Tab
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyTabText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },

  // Settings Links
  settingsSection: {
    marginHorizontal: 20,
    backgroundColor: Colors.glassBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
    marginBottom: 24,
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingsLinkBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  settingsLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLinkLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },

  // Logout
  logoutSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  logoutBtn: {
    borderRadius: 24,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default ProfileScreen;
