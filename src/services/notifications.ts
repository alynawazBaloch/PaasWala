import { Platform } from 'react-native';
import * as ExpoNotifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { doc, setDoc, deleteDoc, updateDoc, getDocs, collection, query } from 'firebase/firestore';
import { db } from './firebase';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface NotificationPayload {
  title: string;
  body: string;
  type: 'like' | 'comment' | 'alert' | 'message' | 'event' | 'verification';
  data?: Record<string, string>;
}

export type VerificationResult = 'approved' | 'rejected';

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

// Handle incoming notifications while app is foregrounded
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/* ------------------------------------------------------------------ */
/*  Service                                                            */
/* ------------------------------------------------------------------ */

class NotificationService {
  private token: string | null = null;

  /** Request push notification permission (FCM via Expo). */
  async requestPermission(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.log('[Notifications] Must use physical device for push');
        return false;
      }

      const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await ExpoNotifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted:', finalStatus);
        return false;
      }

      // Get Expo push token
      const tokenData = await ExpoNotifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      this.token = tokenData.data;
      console.log('[Notifications] Expo push token:', this.token);
      return true;
    } catch (err) {
      console.warn('[Notifications] Permission request failed:', err);
      return false;
    }
  }

  /** Get the current push token. */
  getToken(): string | null {
    return this.token;
  }

  /** Send a local (in-app) notification. */
  async sendLocalNotification(payload: NotificationPayload) {
    try {
      await ExpoNotifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: { type: payload.type, ...payload.data },
          sound: true,
        },
        trigger: null, // null = immediate
      });
    } catch (err) {
      console.warn('[Notifications] Local notification failed:', err);
    }
  }

  /** Schedule a notification for later delivery. */
  async scheduleNotification(payload: NotificationPayload, secondsFromNow: number) {
    try {
      await ExpoNotifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: { type: payload.type, ...payload.data },
          sound: true,
        },
        trigger: {
          type: ExpoNotifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsFromNow,
        },
      });
    } catch (err) {
      console.warn('[Notifications] Schedule failed:', err);
    }
  }

  /** Register the push token to Firestore for remote notifications. */
  async registerToken(uid: string, token?: string) {
    const pushToken = token || this.token;
    if (!pushToken) return;
    try {
      await setDoc(doc(db, 'users', uid, 'tokens', pushToken), {
        token: pushToken,
        platform: Platform.OS,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.warn('[Notifications] registerToken failed:', err);
    }
  }

  /** Remove push token from Firestore. */
  async unregisterToken(uid: string, token?: string) {
    const pushToken = token || this.token;
    if (!pushToken) return;
    try {
      await deleteDoc(doc(db, 'users', uid, 'tokens', pushToken));
    } catch (err) {
      console.warn('[Notifications] unregisterToken failed:', err);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Verification-specific helpers                                    */
  /* ---------------------------------------------------------------- */

  /** Send approval notification to user. */
  async notifyVerificationApproved(userId: string) {
    await this.sendLocalNotification({
      title: 'Address Verified ✅',
      body: 'Your address has been approved! You can now post and comment in your neighborhood.',
      type: 'verification',
      data: { userId, status: 'approved' },
    });
  }

  /** Send rejection notification to user. */
  async notifyVerificationRejected(userId: string) {
    await this.sendLocalNotification({
      title: 'Verification Rejected ❌',
      body: 'Your address could not be verified. Please re-submit with a more detailed address.',
      type: 'verification',
      data: { userId, status: 'rejected' },
    });
  }

  /** Update Firestore user doc to mark verification notification sent. */
  async markVerificationNotified(uid: string, status: VerificationResult) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        verificationNotified: true,
        verificationStatus: status,
        verificationNotifiedAt: Date.now(),
      });
    } catch (err) {
      console.warn('[Notifications] markVerificationNotified failed:', err);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Push notification sending (Expo Push API)                        */
  /* ---------------------------------------------------------------- */

  /** Fetch a user's Expo push tokens from Firestore. */
  private async getUserPushTokens(uid: string): Promise<string[]> {
    try {
      const q = query(collection(db, 'users', uid, 'tokens'));
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((d) => d.data().token as string)
        .filter(Boolean);
    } catch (err) {
      console.warn('[Notifications] getUserPushTokens failed:', err);
      return [];
    }
  }

  /** Send a push notification to a specific user via Expo Push API. */
  async sendPushToUser(
    recipientUid: string,
    payload: { title: string; body: string; data?: Record<string, string> }
  ): Promise<void> {
    try {
      const tokens = await this.getUserPushTokens(recipientUid);
      if (tokens.length === 0) return;

      const messages = tokens.map((token) => ({
        to: token,
        sound: 'default' as const,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        console.warn('[Notifications] Expo Push API responded:', response.status);
      }

      const result = await response.json();
      if (result.data) {
        // Check for invalid tokens and remove them
        result.data.forEach((item: any, index: number) => {
          if (item?.status === 'error' && tokens[index]) {
            this.unregisterToken(recipientUid, tokens[index]).catch(() => {});
          }
        });
      }
    } catch (err) {
      console.warn('[Notifications] sendPushToUser failed:', err);
    }
  }

  /**
   * Save an in-app notification to Firestore AND send push notification.
   * Returns the created notification ID.
   */
  async notifyUser(
    recipientUid: string,
    type: 'follow' | 'friend_request' | 'friend_accepted' | 'neighbor_request' | 'neighbor_accepted' | 'message' | 'group_message' | 'alert',
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    // Create in-app notification in Firestore
    try {
      const notifId = 'notif_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
      const notifDoc = {
        id: notifId,
        type,
        title,
        body,
        timestamp: new Date().toISOString(),
        isUnread: true,
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        fromUserId: data?.fromUserId ?? '',
        targetId: data?.targetId ?? '',
        recipientId: recipientUid,
      };
      await setDoc(doc(db, 'notifications', notifId), notifDoc).catch(() => {});
    } catch (err) {
      console.warn('[Notifications] save notification failed:', err);
    }

    // Send push notification
    await this.sendPushToUser(recipientUid, { title, body, data });
  }

  /** Send a push notification to every member of a chat except the sender. */
  async notifyChatMembers(
    senderUid: string,
    participantIds: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    const targets = participantIds.filter((id) => id && id !== senderUid);
    await Promise.all(
      targets.map((uid) => this.sendPushToUser(uid, { title, body, data }))
    );
  }

  /** Convenience helper for new direct messages. */
  async notifyNewMessage(
    recipientUid: string,
    senderName: string,
    messagePreview: string,
    data?: Record<string, string>
  ): Promise<void> {
    await this.notifyUser(
      recipientUid,
      'message',
      senderName,
      messagePreview,
      data
    );
  }

  /** Convenience helper for new group messages. */
  async notifyNewGroupMessage(
    senderUid: string,
    participantIds: string[],
    groupName: string,
    senderName: string,
    messagePreview: string,
    data?: Record<string, string>
  ): Promise<void> {
    const targets = participantIds.filter((id) => id && id !== senderUid);
    await Promise.all(
      targets.map((uid) =>
        this.notifyUser(
          uid,
          'group_message',
          groupName,
          `${senderName}: ${messagePreview}`,
          data
        )
      )
    );
  }
}

export const notificationService = new NotificationService();
export default notificationService;
