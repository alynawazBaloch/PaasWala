import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Colors from '../utils/colors';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../hooks/useChat';
import FeedScreen from '../screens/feed/FeedScreen';
import MapScreen from '../screens/map/MapScreen';
import AlertsListScreen from '../screens/alerts/AlertsListScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ChatListScreen from '../screens/messages/ChatListScreen';

export type TabParamList = {
  Feed: undefined;
  Map: undefined;
  Alerts: undefined;
  Profile: undefined;
  Messages: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  Feed: { active: 'home', inactive: 'home-outline' },
  Map: { active: 'map', inactive: 'map-outline' },
  Alerts: { active: 'notifications', inactive: 'notifications-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
  Messages: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
};

const TAB_LABELS: Record<string, string> = {
  Feed: 'Feed',
  Map: 'Map',
  Alerts: 'Alerts',
  Profile: 'Profile',
  Messages: 'Messages',
};

// ---------------------------------------------------------------------------
// Spring-animated dot indicator below the active tab icon
// ---------------------------------------------------------------------------
const ActiveTabIndicator: React.FC<{ isFocused: boolean }> = ({ isFocused }) => {
  const scale = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1 : 0, {
      damping: 12,
      stiffness: 120,
      mass: 0.3,
    });
  }, [isFocused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.activeDot, animatedStyle]} />;
};

// ---------------------------------------------------------------------------
// Single tab item with spring icon scale + active dot
// ---------------------------------------------------------------------------
const TabItem: React.FC<{
  route: any;
  index: number;
  state: any;
  navigation: any;
  badgeCount?: number;
}> = ({ route, index, state, navigation, badgeCount }) => {
  const isFocused = state.index === index;
  const iconScale = useSharedValue(isFocused ? 1 : 0.85);

  useEffect(() => {
    iconScale.value = withSpring(isFocused ? 1 : 0.85, {
      damping: 15,
      stiffness: 150,
      mass: 0.5,
    });
  }, [isFocused, iconScale]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const icons = TAB_ICONS[route.name];
  const iconName: keyof typeof Ionicons.glyphMap = isFocused
    ? icons.active
    : icons.inactive;
  const label = TAB_LABELS[route.name];

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabItem}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.tabIconContainer, animatedIconStyle]}>
        <View>
          <Ionicons
            name={iconName}
            size={24}
            color={isFocused ? Colors.accent : Colors.textSecondary}
          />
          {badgeCount != null && badgeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
            </View>
          )}
        </View>
        <ActiveTabIndicator isFocused={isFocused} />
      </Animated.View>
      {isFocused && <Text style={styles.tabLabel}>{label}</Text>}
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Custom floating glass tab bar
// ---------------------------------------------------------------------------
const CustomTabBar: React.FC<{
  state: any;
  descriptors: any;
  navigation: any;
}> = ({ state, navigation }) => {
  const { isVerified } = useAuth();
  const { chats } = useChat();
  const totalUnread = useMemo(
    () => chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [chats]
  );

  const handleFabPress = () => {
    if (isVerified) {
      navigation.navigate('PostComposer');
    } else {
      Alert.alert(
        'Address Verification Required',
        'Please verify your address before you can post in the neighborhood. Tap the banner on your feed to get started.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Now', onPress: () => navigation.navigate('AddressVerification') },
        ]
      );
    }
  };

  return (
    <View style={styles.tabBarContainer}>
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.tabBarInner}>
        {/* First two tabs: Feed, Map */}
        {state.routes.slice(0, 2).map((route: any, index: number) => (
          <TabItem
            key={route.key}
            route={route}
            index={index}
            state={state}
            navigation={navigation}
          />
        ))}

        {/* Center FAB -- raised emerald gradient circle */}
        <TouchableOpacity
          style={styles.centerFab}
          onPress={handleFabPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.accent]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Ionicons name="add" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>

        {/* Last three tabs: Alerts, Profile, Messages */}
        {state.routes.slice(2).map((route: any, index: number) => (
          <TabItem
            key={route.key}
            route={route}
            index={index + 2}
            state={state}
            navigation={navigation}
            badgeCount={route.name === 'Messages' ? totalUnread : undefined}
          />
        ))}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main tab navigator
// ---------------------------------------------------------------------------
const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      id="Tabs"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Alerts" component={AlertsListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Messages" component={ChatListScreen} />
    </Tab.Navigator>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 8,
    left: 16,
    right: 16,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
    // floating shadow / emerald glow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flex: 1,
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.accent,
    marginTop: 2,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    marginTop: 1,
  },
  badge: {
    position: 'absolute', top: -4, right: -8, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Inter' },
  centerFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
});

export default TabNavigator;
