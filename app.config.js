// Load .env variables so process.env is populated
import 'dotenv/config';

// Export resolved config — replaces $VAR templates in app.json with actual env values
export default ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    firebaseApiKey: process.env.FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.FIREBASE_APP_ID,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    brevoApiKey: process.env.BREVO_API_KEY,
    brevoApiKeyExpoPublic: process.env.EXPO_PUBLIC_BREVO_API_KEY,
  },
  android: {
    ...(config.android || {}),
    config: {
      ...(config.android?.config || {}),
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },
});
