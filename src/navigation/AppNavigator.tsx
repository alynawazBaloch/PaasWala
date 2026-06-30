import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import Colors from '../utils/colors';
import AuthStack from './AuthStack';
import TabNavigator from './TabNavigator';

// Feed screens
import PostDetailScreen from '../screens/feed/PostDetailScreen';
import PostComposerScreen from '../screens/feed/PostComposerScreen';
import StoryViewer from '../screens/feed/StoryViewer';

// Messages screens
import ChatListScreen from '../screens/messages/ChatListScreen';
import ConversationScreen from '../screens/messages/ConversationScreen';

// Profile screens
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';

// Alerts screens
import AlertsListScreen from '../screens/alerts/AlertsListScreen';
import CreateAlertScreen from '../screens/alerts/CreateAlertScreen';

// Marketplace screens
import MarketplaceListScreen from '../screens/marketplace/MarketplaceListScreen';
import ListingDetailScreen from '../screens/marketplace/ListingDetailScreen';

// Events screens
import EventsListScreen from '../screens/events/EventsListScreen';
import EventDetailScreen from '../screens/events/EventDetailScreen';
import CreateEventScreen from '../screens/events/CreateEventScreen';

// Business screens
import BusinessDirectoryScreen from '../screens/business/BusinessDirectoryScreen';
import BusinessDetailScreen from '../screens/business/BusinessDetailScreen';

// Polls screens
import PollsListScreen from '../screens/polls/PollsListScreen';
import CreatePollScreen from '../screens/polls/CreatePollScreen';

// Lost & Found
import LostFoundListScreen from '../screens/lostfound/LostFoundListScreen';

// Admin & Calls
import AdminPanelScreen from '../screens/admin/AdminPanelScreen';
import CallScreen from '../screens/calls/CallScreen';

export type AppStackParamList = {
  AuthStack: undefined;
  MainTabs: undefined;
  PostDetail: { post: any };
  PostComposer: undefined;
  StoryViewer: { stories: any[]; initialIndex: number };
  ChatList: undefined;
  Conversation: { chatId: string; name: string };
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;
  AlertsList: undefined;
  CreateAlert: undefined;
  MarketplaceList: undefined;
  ListingDetail: { listing: any };
  EventsList: undefined;
  EventDetail: { event: any };
  CreateEvent: undefined;
  BusinessDirectory: undefined;
  BusinessDetail: { business: any };
  PollsList: undefined;
  CreatePoll: undefined;
  LostFoundList: undefined;
  AdminPanel: undefined;
  CallScreen: { mode: 'voice' | 'video' };
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
  const { isAuthenticated, loading } = useAuth();

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
            <Stack.Screen name="MainTabs" component={TabNavigator} />

            {/* Feed */}
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            <Stack.Screen name="PostComposer" component={PostComposerScreen} />
            <Stack.Screen name="StoryViewer" component={StoryViewer} />

            {/* Messages */}
            <Stack.Screen name="ChatList" component={ChatListScreen} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />

            {/* Profile */}
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />

            {/* Alerts */}
            <Stack.Screen name="AlertsList" component={AlertsListScreen} />
            <Stack.Screen name="CreateAlert" component={CreateAlertScreen} />

            {/* Marketplace */}
            <Stack.Screen name="MarketplaceList" component={MarketplaceListScreen} />
            <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />

            {/* Events */}
            <Stack.Screen name="EventsList" component={EventsListScreen} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="CreateEvent" component={CreateEventScreen} />

            {/* Business */}
            <Stack.Screen name="BusinessDirectory" component={BusinessDirectoryScreen} />
            <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} />

            {/* Polls */}
            <Stack.Screen name="PollsList" component={PollsListScreen} />
            <Stack.Screen name="CreatePoll" component={CreatePollScreen} />

            {/* Lost & Found */}
            <Stack.Screen name="LostFoundList" component={LostFoundListScreen} />

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
