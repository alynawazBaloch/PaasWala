import { Platform } from 'react-native';

export interface NotificationPayload {
  title: string;
  body: string;
  type: 'like' | 'comment' | 'alert' | 'message' | 'event' | 'verification';
  data?: Record<string, string>;
}

class NotificationService {
  private token: string | null = null;

  async requestPermission(): Promise<boolean> {
    // Integrate with FCM when ready
    // const { status } = await Notifications.requestPermissionsAsync();
    // return status === 'granted';
    console.log('Notification permission - FCM not configured');
    return true;
  }

  async getToken(): Promise<string | null> {
    // const token = await messaging().getToken();
    // this.token = token;
    return this.token;
  }

  async sendLocalNotification(payload: NotificationPayload) {
    // await Notifications.scheduleNotificationAsync({
    //   content: {
    //     title: payload.title,
    //     body: payload.body,
    //     data: payload.data,
    //   },
    //   trigger: null,
    // });
  }

  async registerToken(uid: string, token: string) {
    // Save token to Firestore for targeted notifications
    // await setDoc(doc(db, 'users', uid, 'tokens', token), { token, platform: Platform.OS });
  }

  async unregisterToken(uid: string, token: string) {
    // await deleteDoc(doc(db, 'users', uid, 'tokens', token));
  }
}

export const notificationService = new NotificationService();
export default notificationService;
