import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../utils/colors';
import GlassCard from '../../components/glass/GlassCard';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

interface SettingsScreenProps {
  navigation: any;
}

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  isLast?: boolean;
  iconColor?: string;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  label,
  onPress,
  rightContent,
  isLast = false,
  iconColor = Colors.accent,
}) => (
  <TouchableOpacity
    style={[styles.settingRow, !isLast && styles.settingRowBorder]}
    onPress={onPress}
    activeOpacity={0.7}
    disabled={!onPress}
  >
    <View style={styles.settingRowLeft}>
      <View style={[styles.settingIcon, { borderColor: iconColor + '40' }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
    </View>
    {rightContent || (
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    )}
  </TouchableOpacity>
);

const CustomToggle: React.FC<{
  value: boolean;
  onValueChange: (v: boolean) => void;
}> = ({ value, onValueChange }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => onValueChange(!value)}
    style={[
      styles.customToggle,
      { backgroundColor: value ? Colors.accent : Colors.glassBorder },
    ]}
  >
    <View
      style={[
        styles.customToggleKnob,
        { alignSelf: value ? 'flex-end' : 'flex-start' },
      ]}
    />
  </TouchableOpacity>
);

const PillButton: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
}> = ({ label, selected, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    style={[
      styles.pillButton,
      selected
        ? styles.pillButtonSelected
        : styles.pillButtonUnselected,
    ]}
  >
    <Text
      style={[
        styles.pillButtonText,
        selected
          ? styles.pillButtonTextSelected
          : styles.pillButtonTextUnselected,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { user, updateUser } = useAuth();

  const [searchableByEmail, setSearchableByEmail] = useState(user?.searchableByEmail ?? true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(user?.showOnlineStatus ?? true);
  const [likesPrivacy, setLikesPrivacy] = useState<'public' | 'neighborhood' | 'private'>(user?.likesPrivacyDefault ?? 'neighborhood');
  const [pushNewPosts, setPushNewPosts] = useState(user?.notificationPreferences?.newPosts ?? true);
  const [pushMessages, setPushMessages] = useState(user?.notificationPreferences?.messages ?? true);
  const [pushEvents, setPushEvents] = useState(user?.notificationPreferences?.events ?? false);
  const [pushAlerts, setPushAlerts] = useState(user?.notificationPreferences?.alerts ?? true);

  // New privacy states
  const [whoCanMessage, setWhoCanMessage] = useState(user?.whoCanMessage ?? 'everyone');
  const [postVisibility, setPostVisibility] = useState(user?.postVisibility ?? 'neighborhood');
  const [showLocationOnMap, setShowLocationOnMap] = useState(user?.showLocationOnMap ?? true);

  const handleChangePassword = useCallback(() => {
    Alert.alert('Change Password', 'Password change functionality coming soon.');
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ]
    );
  }, []);

  const handleToggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'ur' : 'en');
  }, [language, setLanguage]);

  const toggleLikesPrivacy = useCallback(() => {
    const options: Array<'public' | 'neighborhood' | 'private'> = [
      'public',
      'neighborhood',
      'private',
    ];
    const currentIndex = options.indexOf(likesPrivacy);
    const next = options[(currentIndex + 1) % options.length];
    setLikesPrivacy(next);
  }, [likesPrivacy]);

  const handleToggleSearchableByEmail = useCallback((value: boolean) => {
    setSearchableByEmail(value);
    updateUser({ searchableByEmail: value });
  }, [updateUser]);

  const handleToggleOnlineStatus = useCallback((value: boolean) => {
    setShowOnlineStatus(value);
    updateUser({ showOnlineStatus: value });
  }, [updateUser]);

  const handleTogglePushNewPosts = useCallback((value: boolean) => {
    setPushNewPosts(value);
    updateUser({ notificationPreferences: { ...user?.notificationPreferences, newPosts: value } });
  }, [updateUser, user]);

  const handleTogglePushMessages = useCallback((value: boolean) => {
    setPushMessages(value);
    updateUser({ notificationPreferences: { ...user?.notificationPreferences, messages: value } });
  }, [updateUser, user]);

  const handleTogglePushEvents = useCallback((value: boolean) => {
    setPushEvents(value);
    updateUser({ notificationPreferences: { ...user?.notificationPreferences, events: value } });
  }, [updateUser, user]);

  const handleTogglePushAlerts = useCallback((value: boolean) => {
    setPushAlerts(value);
    updateUser({ notificationPreferences: { ...user?.notificationPreferences, alerts: value } });
  }, [updateUser, user]);

  // New privacy handlers
  const handleWhoCanMessage = useCallback((value: 'everyone' | 'friends' | 'nobody') => {
    setWhoCanMessage(value);
    updateUser({ whoCanMessage: value });
  }, [updateUser]);

  const handlePostVisibility = useCallback((value: 'neighborhood' | 'friends') => {
    setPostVisibility(value);
    updateUser({ postVisibility: value });
  }, [updateUser]);

  const handleToggleLocationOnMap = useCallback((value: boolean) => {
    setShowLocationOnMap(value);
    updateUser({ showLocationOnMap: value });
  }, [updateUser]);

  const getLikesPrivacyLabel = (privacy: 'public' | 'neighborhood' | 'private') => {
    switch (privacy) {
      case 'public':
        return 'Everyone';
      case 'neighborhood':
        return 'Neighborhood';
      case 'private':
        return 'Only Me';
    }
  };

  const aboutItems = [
    { label: 'Version', value: '1.0.0' },
    { label: 'Terms of Service', onPress: () => Alert.alert('Terms of Service', 'Terms of Service page coming soon.') },
    { label: 'Privacy Policy', onPress: () => Alert.alert('Privacy Policy', 'Privacy Policy page coming soon.') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <GlassCard noTouch style={styles.sectionCard}>
            <SettingRow
              icon="lock-closed-outline"
              label="Change Password"
              onPress={handleChangePassword}
            />
            <SettingRow
              icon="trash-outline"
              label="Delete Account"
              onPress={handleDeleteAccount}
              iconColor={Colors.error}
              isLast
            />
          </GlassCard>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <GlassCard noTouch style={styles.sectionCard}>
            {/* Who can message me */}
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIcon, { borderColor: Colors.accent + '40' }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.accent} />
                </View>
                <Text style={styles.settingLabel}>Who can message me</Text>
              </View>
            </View>
            <View style={[styles.pillRow, styles.settingRowBorder]}>
              <PillButton
                label="Everyone"
                selected={whoCanMessage === 'everyone'}
                onPress={() => handleWhoCanMessage('everyone')}
              />
              <PillButton
                label="Friends Only"
                selected={whoCanMessage === 'friends'}
                onPress={() => handleWhoCanMessage('friends')}
              />
              <PillButton
                label="Nobody"
                selected={whoCanMessage === 'nobody'}
                onPress={() => handleWhoCanMessage('nobody')}
              />
            </View>

            {/* Post visibility */}
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIcon, { borderColor: Colors.accent + '40' }]}>
                  <Ionicons name="eye-outline" size={20} color={Colors.accent} />
                </View>
                <Text style={styles.settingLabel}>Post visibility</Text>
              </View>
            </View>
            <View style={[styles.pillRow, styles.settingRowBorder]}>
              <PillButton
                label="Neighborhood"
                selected={postVisibility === 'neighborhood'}
                onPress={() => handlePostVisibility('neighborhood')}
              />
              <PillButton
                label="Friends Only"
                selected={postVisibility === 'friends'}
                onPress={() => handlePostVisibility('friends')}
              />
            </View>

            {/* Show my location on map */}
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIcon, { borderColor: Colors.accent + '40' }]}>
                  <Ionicons name="location-outline" size={20} color={Colors.accent} />
                </View>
                <Text style={styles.settingLabel}>Show my location on map</Text>
              </View>
              <CustomToggle
                value={showLocationOnMap}
                onValueChange={handleToggleLocationOnMap}
              />
            </View>

            {/* Show online status (existing) */}
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIcon, { borderColor: Colors.accent + '40' }]}>
                  <Ionicons name="globe-outline" size={20} color={Colors.accent} />
                </View>
                <Text style={styles.settingLabel}>Show Online Status</Text>
              </View>
              <CustomToggle
                value={showOnlineStatus}
                onValueChange={handleToggleOnlineStatus}
              />
            </View>

            {/* Searchable by email (existing) */}
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIcon, { borderColor: Colors.accent + '40' }]}>
                  <Ionicons name="search-outline" size={20} color={Colors.accent} />
                </View>
                <Text style={styles.settingLabel}>Allow others to find me by email</Text>
              </View>
              <CustomToggle
                value={searchableByEmail}
                onValueChange={handleToggleSearchableByEmail}
              />
            </View>

            {/* Likes Privacy (existing) */}
            <SettingRow
              icon="heart-outline"
              label="Likes Privacy"
              onPress={toggleLikesPrivacy}
              rightContent={
                <View style={styles.privacyBadge}>
                  <Text style={styles.privacyBadgeText}>
                    {getLikesPrivacyLabel(likesPrivacy)}
                  </Text>
                </View>
              }
              iconColor={Colors.accent}
              isLast
            />
          </GlassCard>
        </View>

        {/* Your Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Data</Text>
          <GlassCard noTouch style={styles.sectionCard}>
            <View style={styles.dataInfoContainer}>
              <View style={styles.dataInfoIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={32} color={Colors.accent} />
              </View>
              <Text style={styles.dataInfoTitle}>Your information is protected</Text>
              <View style={styles.dataInfoBullets}>
                <View style={styles.dataInfoBullet}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.dataInfoBulletText}>
                    Your full address is never shown publicly, only your street name
                  </Text>
                </View>
                <View style={styles.dataInfoBullet}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.dataInfoBulletText}>
                    Phone number is never shared publicly
                  </Text>
                </View>
                <View style={styles.dataInfoBullet}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.dataInfoBulletText}>
                    Email is only shared when you enable email search
                  </Text>
                </View>
                <View style={styles.dataInfoBullet}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.dataInfoBulletText}>
                    Blocked users have zero visibility into your content
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <GlassCard noTouch style={styles.sectionCard}>
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIcon, { borderColor: Colors.accent + '40' }]}>
                  <Ionicons name="newspaper-outline" size={20} color={Colors.accent} />
                </View>
                <Text style={styles.settingLabel}>New Posts</Text>
              </View>
              <Switch
                value={pushNewPosts}
                onValueChange={handleTogglePushNewPosts}
                trackColor={{ false: Colors.glassBorder, true: Colors.primary }}
                thumbColor={pushNewPosts ? Colors.accent : Colors.textMuted}
              />
            </View>
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIcon, { borderColor: Colors.accent + '40' }]}>
                  <Ionicons name="chatbubbles-outline" size={20} color={Colors.accent} />
                </View>
                <Text style={styles.settingLabel}>Messages</Text>
              </View>
              <Switch
                value={pushMessages}
                onValueChange={handleTogglePushMessages}
                trackColor={{ false: Colors.glassBorder, true: Colors.primary }}
                thumbColor={pushMessages ? Colors.accent : Colors.textMuted}
              />
            </View>
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIcon, { borderColor: Colors.accent + '40' }]}>
                  <Ionicons name="calendar-outline" size={20} color={Colors.accent} />
                </View>
                <Text style={styles.settingLabel}>Events</Text>
              </View>
              <Switch
                value={pushEvents}
                onValueChange={handleTogglePushEvents}
                trackColor={{ false: Colors.glassBorder, true: Colors.primary }}
                thumbColor={pushEvents ? Colors.accent : Colors.textMuted}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIcon, { borderColor: Colors.warning + '40' }]}>
                  <Ionicons name="alert-circle-outline" size={20} color={Colors.warning} />
                </View>
                <Text style={styles.settingLabel}>Alerts</Text>
              </View>
              <Switch
                value={pushAlerts}
                onValueChange={handleTogglePushAlerts}
                trackColor={{ false: Colors.glassBorder, true: Colors.primary }}
                thumbColor={pushAlerts ? Colors.accent : Colors.textMuted}
              />
            </View>
          </GlassCard>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <GlassCard noTouch style={styles.sectionCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIcon, { borderColor: Colors.accent + '40' }]}>
                  <Ionicons
                    name={isDark ? 'moon-outline' : 'sunny-outline'}
                    size={20}
                    color={Colors.accent}
                  />
                </View>
                <Text style={styles.settingLabel}>Dark Mode</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: Colors.glassBorder, true: Colors.primary }}
                thumbColor={isDark ? Colors.accent : Colors.textMuted}
              />
            </View>
          </GlassCard>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language</Text>
          <GlassCard noTouch style={styles.sectionCard}>
            <SettingRow
              icon="language-outline"
              label="App Language"
              onPress={handleToggleLanguage}
              rightContent={
                <View style={styles.langBadge}>
                  <Text style={styles.langBadgeText}>
                    {language === 'en' ? 'English' : 'اردو'}
                  </Text>
                </View>
              }
              isLast
            />
          </GlassCard>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <GlassCard noTouch style={styles.sectionCard}>
            {aboutItems.map((item, index) => (
              <SettingRow
                key={item.label}
                icon={
                  index === 0
                    ? 'information-circle-outline'
                    : index === 1
                    ? 'document-text-outline'
                    : 'shield-checkmark-outline'
                }
                label={item.label}
                onPress={item.onPress}
                rightContent={
                  index === 0 ? (
                    <Text style={styles.versionText}>{item.value}</Text>
                  ) : undefined
                }
                isLast={index === aboutItems.length - 1}
              />
            ))}
          </GlassCard>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 0,
    overflow: 'hidden',
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    flex: 1,
  },

  // Pill Button
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pillButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  pillButtonSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  pillButtonUnselected: {
    backgroundColor: 'transparent',
    borderColor: Colors.glassBorder,
  },
  pillButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  pillButtonTextSelected: {
    color: Colors.textPrimary,
  },
  pillButtonTextUnselected: {
    color: Colors.textMuted,
  },

  // Custom Toggle
  customToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  customToggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  // Badges
  privacyBadge: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  privacyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
  },
  langBadge: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  langBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
  },
  versionText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: 'Inter',
  },

  // Data Security
  dataInfoContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dataInfoIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dataInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 16,
    textAlign: 'center',
  },
  dataInfoBullets: {
    width: '100%',
    gap: 10,
  },
  dataInfoBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dataInfoBulletText: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    flex: 1,
    lineHeight: 18,
  },

  bottomSpacer: {
    height: 40,
  },
});

export default SettingsScreen;
