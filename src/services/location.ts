import * as Location from 'expo-location';
import { geohashForLocation } from 'geofire-common';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LocationData {
  latitude: number;
  longitude: number;
  geohash: string;
  geohashNeighbors?: string[];
  address?: string;
  area?: string;
  city?: string;
  timestamp: number;
}

let currentWatcher: Location.LocationSubscription | null = null;
let backgroundTaskRegistered = false;

/* ------------------------------------------------------------------ */
/*  Core location functions                                            */
/* ------------------------------------------------------------------ */

/** Request all needed location permissions (foreground + background). */
export async function requestLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  let background = { granted: false };
  if (foreground.granted) {
    background = await Location.requestBackgroundPermissionsAsync();
  }
  return {
    foreground: foreground.granted,
    background: background.granted,
  };
}

/** Get current position once (balanced accuracy). */
export async function getCurrentPosition(): Promise<LocationData | null> {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = loc.coords;
    return await enrichCoordinates(latitude, longitude);
  } catch (err) {
    console.warn('[Location] getCurrentPosition failed:', err);
    return null;
  }
}

/** Enrich lat/lng with geohash + reverse geocode. */
export async function enrichCoordinates(
  latitude: number,
  longitude: number
): Promise<LocationData> {
  const hash = geohashForLocation([latitude, longitude]);
  let address: string | undefined;
  let area: string | undefined;
  let city: string | undefined;

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results.length > 0) {
      const addr = results[0];
      address = [addr.street, addr.name].filter(Boolean).join(', ') || undefined;
      area = addr.district || addr.subregion || addr.name || undefined;
      city = addr.city || undefined;
    }
  } catch {
    // Reverse geocode failed — proceed without address string
  }

  return { latitude, longitude, geohash: hash, address, area, city, timestamp: Date.now() };
}

/** Save location data to a user's Firestore doc. */
export async function saveUserLocation(
  uid: string,
  locationData: LocationData
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      geohash: locationData.geohash,
      address: locationData.address || '',
      area: locationData.area || '',
      city: locationData.city || '',
      lastLocationUpdate: Date.now(),
    });
  } catch (err) {
    console.warn('[Location] saveUserLocation failed:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Foreground location watch                                          */
/* ------------------------------------------------------------------ */

/** Start watching location for foreground updates. Automatically updates
 *  Firestore when position changes significantly (>200m). */
export async function startForegroundWatch(uid: string): Promise<void> {
  // Stop any existing watcher first
  stopForegroundWatch();

  try {
    currentWatcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 200, // meters
        timeInterval: 300000,  // 5 min
      },
      async (location) => {
        if (!location?.coords) return;
        const { latitude, longitude } = location.coords;
        const data = await enrichCoordinates(latitude, longitude);
        await saveUserLocation(uid, data);
      }
    );
    console.log('[Location] Foreground watch started');
  } catch (err) {
    console.warn('[Location] startForegroundWatch failed:', err);
  }
}

/** Stop the foreground location watcher. */
export function stopForegroundWatch(): void {
  if (currentWatcher) {
    currentWatcher.remove();
    currentWatcher = null;
  }
}

/* ------------------------------------------------------------------ */
/*  Background location task                                           */
/* ------------------------------------------------------------------ */

const BACKGROUND_UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes

/** Define the background location task. This requires expo-task-manager. */
export const LOCATION_TASK_NAME = 'PAASWALA_BACKGROUND_LOCATION';

import * as TaskManager from 'expo-task-manager';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('[Location] Background task error:', error);
    return;
  }
  if (data?.locations) {
    // Background location updates handled via hook or direct call
    // The actual Firestore save is done in the calling function
  }
});

/** Start background location updates (every 30 min). */
export async function startBackgroundUpdates(uid: string): Promise<boolean> {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: BACKGROUND_UPDATE_INTERVAL,
      distanceInterval: 500,
      showsBackgroundLocationIndicator: false,
      foregroundService: {
        notificationTitle: 'PaasWala',
        notificationBody: 'Updating your neighborhood presence...',
        notificationColor: '#2D6A4F',
      },
      pausesUpdatesAutomatically: false,
    });

    backgroundTaskRegistered = true;
    console.log('[Location] Background updates started (30 min interval)');
    return true;
  } catch (err) {
    console.warn('[Location] startBackgroundUpdates failed:', err);
    return false;
  }
}

/** Stop background location updates. */
export async function stopBackgroundUpdates(): Promise<void> {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
    backgroundTaskRegistered = false;
    console.log('[Location] Background updates stopped');
  } catch (err) {
    console.warn('[Location] stopBackgroundUpdates failed:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  One-shot capture (for signup)                                      */
/* ------------------------------------------------------------------ */

/** Auto-capture location on signup — used during registration. */
export async function captureLocationForSignup(): Promise<{
  locationData: LocationData | null;
  permissionDenied: boolean;
}> {
  const perms = await requestLocationPermissions();
  if (!perms.foreground) {
    return { locationData: null, permissionDenied: true };
  }
  const loc = await getCurrentPosition();
  return { locationData: loc, permissionDenied: false };
}

export default {
  getCurrentPosition,
  enrichCoordinates,
  saveUserLocation,
  startForegroundWatch,
  stopForegroundWatch,
  startBackgroundUpdates,
  stopBackgroundUpdates,
  captureLocationForSignup,
  requestLocationPermissions,
};
