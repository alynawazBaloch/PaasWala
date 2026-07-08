import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { startForegroundWatch, startBackgroundUpdates } from '../services/location';
import notificationService from '../services/notifications';
import Colors from '../utils/colors';
import AuthStack from './AuthStack';
import TabNavigator from './TabNavigator';
import LocationVerificationScreen from '../screens/auth/LocationVerificationScreen';
import AddressVerificationScreen from '../screens/auth/AddressVerificationScreen';
import VerificationDetailScreen from '../screens/admin/VerificationDetailScreen';

// Feed screens
import PostDetailScreen from '../screens/feed/PostDetailScreen';
import PostComposerScreen from '../screens/feed/PostComposerScreen';
import StoryViewer from '../screens/feed/StoryViewer';

// Story screens
import StoryComposerScreen from '../screens/stories/StoryComposerScreen';

// Messages screens
import ChatListScreen from '../screens/messages/ChatListScreen';
import ConversationScreen from '../screens/messages/ConversationScreen';
import StarredMessagesScreen from '../screens/messages/StarredMessagesScreen';
import GroupChatSetupScreen from '../screens/messages/GroupChatSetupScreen';
import GroupChatInfoScreen from '../screens/messages/GroupChatInfoScreen';

// Profile screens
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';
import FollowersListScreen from '../screens/profile/FollowersListScreen';
import FollowingListScreen from '../screens/profile/FollowingListScreen';
import FriendRequestsScreen from '../screens/profile/FriendRequestsScreen';
import FriendsListScreen from '../screens/profile/FriendsListScreen';
import FindPeopleScreen from '../screens/profile/FindPeopleScreen';

// Alerts screens
import AlertsListScreen from '../screens/alerts/AlertsListScreen';
import CreateAlertScreen from '../screens/alerts/CreateAlertScreen';

// Marketplace screens
import MarketplaceListScreen from '../screens/marketplace/MarketplaceListScreen';
import ListingDetailScreen from '../screens/marketplace/ListingDetailScreen';
import CreateListingScreen from '../screens/marketplace/CreateListingScreen';

// Events screens
import EventsListScreen from '../screens/events/EventsListScreen';
import EventDetailScreen from '../screens/events/EventDetailScreen';
import CreateEventScreen from '../screens/events/CreateEventScreen';

// Business screens
import BusinessDirectoryScreen from '../screens/business/BusinessDirectoryScreen';
import BusinessDetailScreen from '../screens/business/BusinessDetailScreen';
import CreateBusinessScreen from '../screens/business/CreateBusinessScreen';

// Polls screens
import PollsListScreen from '../screens/polls/PollsListScreen';
import CreatePollScreen from '../screens/polls/CreatePollScreen';

// Lost & Found
import LostFoundListScreen from '../screens/lostfound/LostFoundListScreen';
import CreateLostFoundScreen from '../screens/lostfound/CreateLostFoundScreen';

// Admin & Calls
import AdminPanelScreen from '../screens/admin/AdminPanelScreen';
import CallScreen from '../screens/calls/CallScreen';

// New screens
import NearbyNeighborsScreen from '../screens/map/NearbyNeighborsScreen';
import AuthorProfileScreen from '../screens/profile/AuthorProfileScreen';
import GlobalSearchScreen from '../screens/search/GlobalSearchScreen';
import ReportPostScreen from '../screens/reports/ReportPostScreen';
import ReportUserScreen from '../screens/reports/ReportUserScreen';
import BlockUserScreen from '../screens/profile/BlockUserScreen';

export type AppStackParamList = {
  AuthStack: undefined;
  MainTabs: undefined;
  PostDetail: { post: any };
  PostComposer: undefined;
  StoryViewer: { stories: any[]; initialIndex: number };
  StoryComposer: undefined;
  ChatList: undefined;
  Conversation: { chatId: string; name: string };
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;
  AlertsList: undefined;
  CreateAlert: undefined;
  MarketplaceList: undefined;
  CreateListing: undefined;
  ListingDetail: { listing: any };
  EventsList: undefined;
  EventDetail: { event: any };
  CreateEvent: undefined;
  BusinessDirectory: undefined;
  BusinessDetail: { business: any };
  PollsList: undefined;
  CreatePoll: undefined;
  LostFoundList: undefined;
  CreateLostFound: undefined;
  CreateBusiness: undefined;
  AddressVerification: undefined;
  AdminPanel: undefined;
  VerificationDetail: { requestId: string };
  CallScreen: { mode: 'voice' | 'video'; chatId: string; otherUserId: string; otherName: string; otherAvatar?: string };
  NearbyNeighbors: undefined;
  AuthorProfile: { userId: string };
  FollowersList: { userId: string };
  FollowingList: { userId: string };
  FriendRequests: undefined;
  FriendsList: undefined;
  FindPeople: undefined;
  StarredMessages: undefined;
  GroupChatSetup: undefined;
  GroupChatInfo: { chatId: string };
  GlobalSearch: undefined;
  ReportPost: { post: any };
  ReportUser: { user: any };
  BlockUser: { user: any };
};

const Stack = createStackNavigator<AppStackParamList>();

// Navigation theme matching the app's dark emerald aesthetic
const navigationTheme = {
  dark: true,
  colors: {
    primary: Colors.accent,
    background: Colors.background,
    card: Colors.secondaryBg,
    text: Colors.textPrimary,
    border: Colors.glassBorder,
    notification: Colors.accent,
  },
  fonts: {
    regular: { fontFamily: 'Inter', fontWeight: '400' as const },
    medium: { fontFamily: 'Inter', fontWeight: '500' as const },
    bold: { fontFamily: 'Inter', fontWeight: '700' as const },
    heavy: { fontFamily: 'Inter', fontWeight: '800' as const },
  },
};

// Fade + scale transition (0.95 -> 1, 300 ms)
const fadeTransition = {
  gestureEnabled: false,
  transitionSpec: {
    open: { animation: 'timing' as const, config: { duration: 300 } },
    close: { animation: 'timing' as const, config: { duration: 200 } },
  },
  cardStyleInterpolator: ({ current: { progress } }: any) => ({
    cardStyle: {
      opacity: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
      transform: [
        {
          scale: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.95, 1],
          }),
        },
      ],
    },
  }),
};

const AppNavigator: React.FC = () => {
  const { isAuthenticated, user, isVerified, loading } = useAuth();

  // Start background location and register notifications on auth
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) return;

    const uid = user.uid;

    // Start foreground location watch (updates every 5 min / 200m)
    startForegroundWatch(uid).catch(() => {});

    // Start background location (every 30 min)
    startBackgroundUpdates(uid).catch(() => {});

    // Register push notification token
    notificationService.requestPermission().then((granted) => {
      if (granted) {
        notificationService.registerToken(uid).catch(() => {});
      }
    }).catch(() => {});
  }, [isAuthenticated, user?.uid]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        id="App"
        screenOptions={{
          headerShown: false,
          ...fadeTransition,
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="AuthStack" component={AuthStack} />
        ) : (
          <>
            {!isVerified && (
              <Stack.Screen name="AddressVerification" component={LocationVerificationScreen} />
            )}
            <Stack.Screen name="VerificationDetail" component={VerificationDetailScreen} />
            <Stack.Screen name="MainTabs" component={TabNavigator} />

            {/* Feed */}
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            <Stack.Screen name="PostComposer" component={PostComposerScreen} />
            <Stack.Screen name="StoryViewer" component={StoryViewer} />
            <Stack.Screen name="StoryComposer" component={StoryComposerScreen} />

            {/* Messages */}
            <Stack.Screen name="ChatList" component={ChatListScreen} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
            <Stack.Screen name="StarredMessages" component={StarredMessagesScreen} />
            <Stack.Screen name="GroupChatSetup" component={GroupChatSetupScreen} />
            <Stack.Screen name="GroupChatInfo" component={GroupChatInfoScreen} />

            {/* Profile */}
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="FollowersList" component={FollowersListScreen} />
            <Stack.Screen name="FollowingList" component={FollowingListScreen} />
            <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} />
            <Stack.Screen name="FriendsList" component={FriendsListScreen} />
            <Stack.Screen name="FindPeople" component={FindPeopleScreen} />

            {/* Alerts */}
            <Stack.Screen name="AlertsList" component={AlertsListScreen} />
            <Stack.Screen name="CreateAlert" component={CreateAlertScreen} />

            {/* Marketplace */}
            <Stack.Screen name="MarketplaceList" component={MarketplaceListScreen} />
            <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
            <Stack.Screen name="CreateListing" component={CreateListingScreen} />

            {/* Events */}
            <Stack.Screen name="EventsList" component={EventsListScreen} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="CreateEvent" component={CreateEventScreen} />

            {/* Business */}
            <Stack.Screen name="BusinessDirectory" component={BusinessDirectoryScreen} />
            <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
            <Stack.Screen name="CreateBusiness" component={CreateBusinessScreen} />

            {/* Polls */}
            <Stack.Screen name="PollsList" component={PollsListScreen} />
            <Stack.Screen name="CreatePoll" component={CreatePollScreen} />

            {/* Lost & Found */}
            <Stack.Screen name="LostFoundList" component={LostFoundListScreen} />
            <Stack.Screen name="CreateLostFound" component={CreateLostFoundScreen} />

            {/* Nearby & Profiles */}
            <Stack.Screen name="NearbyNeighbors" component={NearbyNeighborsScreen} />
            <Stack.Screen name="AuthorProfile" component={AuthorProfileScreen} />

            {/* Search & Reports */}
            <Stack.Screen name="GlobalSearch" component={GlobalSearchScreen} />
            <Stack.Screen name="ReportPost" component={ReportPostScreen} />
            <Stack.Screen name="ReportUser" component={ReportUserScreen} />
            <Stack.Screen name="BlockUser" component={BlockUserScreen} />

            {/* Admin & Calls */}
            <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
            <Stack.Screen name="CallScreen" component={CallScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppNavigator;
