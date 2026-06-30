import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0A0F0A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A8B8A8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0F0A' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1A3A2A' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2D6A4F' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#95D5B2' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0D1B15' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#2D6A4F' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#111811' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6B7B6B' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1A241A' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2D6A4F' }],
  },
  {
    featureType: 'administrative',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#52B788' }],
  },
];

export const getAddressFromCoords = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  // Get Google Maps API key from app config ($VAR resolved by Expo)
  const rawKey = (Constants.expoConfig?.extra as Record<string, any>)?.googleMapsApiKey || '';
  if (!rawKey || rawKey.startsWith('$')) {
    console.warn('[Maps] Google Maps API key missing or unresolved template:', rawKey ? `"${rawKey.slice(0, 20)}..."` : 'empty');
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
  const apiKey = rawKey;
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
    );
    const data = await response.json();
    if (data.results?.[0]) {
      return data.results[0].formatted_address;
    }
  } catch (error) {
    console.error('Geocoding failed:', error);
  }
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export const openGoogleMapsDirections = (lat: number, lng: number) => {
  Linking.openURL('https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng).catch(() => {});
};

export const openGoogleMapsSearch = (query: string) => {
  Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query)).catch(() => {});
};

export default { DARK_MAP_STYLE, getAddressFromCoords, calculateDistance, openGoogleMapsDirections, openGoogleMapsSearch };
