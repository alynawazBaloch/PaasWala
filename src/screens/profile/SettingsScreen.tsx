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

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [likesPrivacy, setLikesPrivacy] = useState<'public' | 'neighborhood' | 'private'>('neighborhood');
  const [pushNewPosts, setPushNewPosts] = useState(true);
  const [pushMessages, setPushMessages] = useState(true);
  const [pushEvents, setPushEvents] = useState(false);
  const [pushAlerts, setPushAlerts] = useState(true);

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
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingRowLeft}>
                <View style={[styles.settingIcon, { borderColor: Colors.accent + '40' }]}>
                  <Ionicons name="eye-outline" size={20} color={Colors.accent} />
                </View>
                <Text style={styles.settingLabel}>Show Online Status</Text>
              </View>
              <Switch
                value={showOnlineStatus}
                onValueChange={setShowOnlineStatus}
                trackColor={{ false: Colors.glassBorder, true: Colors.primary }}
                thumbColor={showOnlineStatus ? Colors.accent : Colors.textMuted}
              />
            </View>
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
                onValueChange={setPushNewPosts}
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
                onValueChange={setPushMessages}
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
                onValueChange={setPushEvents}
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
                onValueChange={setPushAlerts}
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
  bottomSpacer: {
    height: 40,
  },
});

export default SettingsScreen;
