import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { listenNearbyUsers } from '../services/dataService';
import type { UserData } from '../context/AuthContext';

export type NearbySortMode = 'nearest' | 'recent' | 'active';
export type NearbyFilterMode = 'all' | 'verifiedOnly' | 'sameNeighborhood';

interface UseNearbyUsersReturn {
  nearbyUsers: (UserData & { distanceKm: number })[];
  loading: boolean;
  error: string | null;
  sortBy: NearbySortMode;
  setSortBy: (mode: NearbySortMode) => void;
  filterBy: NearbyFilterMode;
  setFilterBy: (mode: NearbyFilterMode) => void;
  refresh: () => void;
}

const RADIUS_KM = 15;

export const useNearbyUsers = (): UseNearbyUsersReturn => {
  const { user } = useAuth();
  const [nearbyUsers, setNearbyUsers] = useState<(UserData & { distanceKm: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<NearbySortMode>('nearest');
  const [filterBy, setFilterBy] = useState<NearbyFilterMode>('all');
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const startListening = useCallback(
    (lat: number, lng: number) => {
      // Clean up previous listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      setLoading(true);
      unsubscribeRef.current = listenNearbyUsers(
        lat,
        lng,
        RADIUS_KM,
        user?.uid ?? '',
        (users) => {
          setNearbyUsers(users);
          setLoading(false);
          setError(null);
        }
      );
    },
    [user?.uid]
  );

  useEffect(() => {
    if (!user) return;

    const lat = user.latitude;
    const lng = user.longitude;

    if (typeof lat === 'number' && typeof lng === 'number') {
      startListening(lat, lng);
    } else {
      // Fall back to requesting location
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setError('Location permission is needed to find nearby neighbors.');
            setLoading(false);
            return;
          }
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          startListening(loc.coords.latitude, loc.coords.longitude);
        } catch (err) {
          setError('Could not get your location. Please enable GPS.');
          setLoading(false);
        }
      })();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user, startListening]);

  // Apply sort + filter
  const processed = (() => {
    let result = [...nearbyUsers];

    // Filter
    if (filterBy === 'verifiedOnly') {
      result = result.filter((u) => u.verified);
    } else if (filterBy === 'sameNeighborhood') {
      result = result.filter(
        (u) => u.neighborhoodId && u.neighborhoodId === user?.neighborhoodId
      );
    }

    // Sort
    if (sortBy === 'nearest') {
      result.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === 'recent') {
      result.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }

    return result;
  })();

  const refresh = useCallback(() => {
    if (!user) return;
    const lat = user.latitude;
    const lng = user.longitude;
    if (typeof lat === 'number' && typeof lng === 'number') {
      startListening(lat, lng);
    }
  }, [user, startListening]);

  return {
    nearbyUsers: processed,
    loading,
    error,
    sortBy,
    setSortBy,
    filterBy,
    setFilterBy,
    refresh,
  };
};

export default useNearbyUsers;
