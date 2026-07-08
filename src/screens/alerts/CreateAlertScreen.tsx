import React, { useState } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import GlowInput from '../../components/glass/GlowInput';
import GlassModal from '../../components/glass/GlassModal';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import { saveAlert, sendAlertToNeighborhood } from '../../services/dataService';
import type { Alert as PSAlert } from '../../services/dataService';

const ALERT_TYPES = [
  { id: 'crime', label: 'Crime', icon: 'shield' as const, color: Colors.alertRed },
  { id: 'fire', label: 'Fire', icon: 'flame' as const, color: '#FF6B35' },
  { id: 'flood', label: 'Flood', icon: 'water' as const, color: '#4A90D9' },
  { id: 'medical', label: 'Medical', icon: 'medkit' as const, color: '#E91E63' },
  { id: 'power_outage', label: 'Power Outage', icon: 'flash' as const, color: Colors.alertYellow },
  { id: 'road_block', label: 'Road Block', icon: 'compass' as const, color: '#9B59B6' },
  { id: 'other', label: 'Other', icon: 'notifications' as const, color: Colors.textSecondary },
];

const DANGER_TYPES = ['crime', 'fire', 'flood', 'medical'];

const CreateAlertScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [locating, setLocating] = useState(false);

  const selectedTypeConfig = ALERT_TYPES.find((t) => t.id === selectedType);
  const isDanger = selectedType ? DANGER_TYPES.includes(selectedType) : false;

  const handleLocate = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to detect your current location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      // Reverse geocode for a readable location string
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geocode.length > 0) {
        const addr = geocode[0];
        const parts = [addr.street, addr.district, addr.city, addr.region].filter(Boolean);
        setLocationText(parts.join(', '));
      } else {
        setLocationText(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      }
    } catch (err) {
      console.warn('Location detection failed:', err);
      Alert.alert('Failed', 'Could not detect location. Enter manually.');
    } finally {
      setLocating(false);
    }
  };

  const handleSendAlert = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (!user?.uid || !user?.neighborhoodId) {
      Alert.alert('Error', 'You must be registered in a neighborhood to send alerts.');
      return;
    }

    setSending(true);
    const alertId = 'alert_' + Date.now().toString(36);
    const newAlert: PSAlert = {
      id: alertId,
      type: selectedType || 'other',
      title: selectedTypeConfig?.label || 'Alert',
      description: description || '',
      location: locationText || 'Neighborhood',
      latitude,
      longitude,
      timestamp: Date.now(),
      resolved: false,
      createdBy: user.uid,
      reportedByName: user.name || 'Anonymous',
      neighborhoodId: user.neighborhoodId,
    };

    try {
      await saveAlert(newAlert);

      // Send push notification to all neighborhood members
      const alertTitle = `🚨 ${selectedTypeConfig?.label || 'Alert'} in ${user.neighborhoodName || 'your neighborhood'}`;
      const alertBody = description.length > 100 ? description.substring(0, 100) + '…' : description;
      sendAlertToNeighborhood(
        user.neighborhoodId,
        alertTitle,
        alertBody || 'Check the alert for details',
        user.uid,
        { alertId, type: selectedType || 'other' }
      ).catch((err) => console.warn('Neighborhood push failed:', err));

      setShowConfirmModal(false);
      Alert.alert('Success', 'Alert sent to all residents!');
      navigation?.goBack();
    } catch (err) {
      console.error('Failed to send alert:', err);
      Alert.alert('Error', 'Failed to send alert. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const isValid = selectedType && description.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Alert</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Alert Type Selector */}
        <Text style={styles.sectionLabel}>Alert Type</Text>
        <View style={styles.typeGrid}>
          {ALERT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeButton,
                selectedType === type.id && {
                  backgroundColor: type.color + '25',
                  borderColor: type.color,
                },
              ]}
              onPress={() => setSelectedType(type.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.typeIconContainer,
                  { backgroundColor: type.color + '20' },
                ]}
              >
                <Ionicons name={type.icon} size={22} color={type.color} />
              </View>
              <Text
                style={[
                  styles.typeLabel,
                  selectedType === type.id && { color: Colors.textPrimary },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.sectionLabel}>Description</Text>
        <GlowInput
          placeholder="Describe the alert in detail..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          containerStyle={styles.descriptionInput}
          icon="document-text"
        />

        {/* Location Picker */}
        <Text style={styles.sectionLabel}>Location</Text>
        <GlowInput
          placeholder="Enter location or auto-detect"
          placeholderTextColor={Colors.textMuted}
          value={locationText}
          onChangeText={setLocationText}
          icon="location"
          rightIcon={
            <TouchableOpacity onPress={handleLocate} disabled={locating}>
              {locating ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Ionicons name="locate" size={20} color={Colors.accent} />
              )}
            </TouchableOpacity>
          }
        />
        {latitude && longitude && (
          <Text style={styles.coordsText}>
            📍 {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </Text>
        )}

        {/* Danger Notice for emergency types */}
        {isDanger && (
          <GlassCard style={styles.dangerNotice} glowColor={Colors.alertRed}>
            <View style={styles.dangerRow}>
              <Ionicons name="warning" size={20} color={Colors.alertRed} />
              <Text style={styles.dangerText}>
                This alert type will notify all neighborhood residents immediately as an emergency.
              </Text>
            </View>
          </GlassCard>
        )}

        {/* Send Button */}
        <GlowButton
          title={sending ? 'Sending…' : 'Send Alert'}
          onPress={handleSendAlert}
          variant={isDanger ? 'danger' : 'primary'}
          disabled={!isValid || sending}
          size="lg"
          style={styles.sendButton}
          icon={
            sending ? (
              <ActivityIndicator size="small" color={Colors.textPrimary} />
            ) : (
              <Ionicons name="paper-plane" size={18} color={Colors.textPrimary} />
            )
          }
        />
      </ScrollView>

      {/* Confirmation Modal */}
      <GlassModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        slideFrom="center"
      >
        <View style={styles.confirmContent}>
          <View
            style={[
              styles.confirmIconContainer,
              { backgroundColor: (isDanger ? Colors.alertRed : Colors.accent) + '20' },
            ]}
          >
            <Ionicons
              name={isDanger ? 'warning' : 'checkmark-circle'}
              size={48}
              color={isDanger ? Colors.alertRed : Colors.accent}
            />
          </View>
          <Text style={styles.confirmTitle}>Send Alert?</Text>
          <Text style={styles.confirmSubtitle}>
            {isDanger
              ? 'This alert will be sent as an emergency notification to all neighborhood residents.'
              : 'This alert will be sent to your neighborhood feed.'}
          </Text>
          <View style={styles.confirmDetails}>
            {selectedTypeConfig && (
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Type</Text>
                <View style={styles.confirmDetailValueRow}>
                  <Ionicons
                    name={selectedTypeConfig.icon}
                    size={14}
                    color={selectedTypeConfig.color}
                  />
                  <Text style={styles.confirmDetailValue}>
                    {selectedTypeConfig.label}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.confirmDetailRow}>
              <Text style={styles.confirmDetailLabel}>Location</Text>
              <Text style={styles.confirmDetailValue} numberOfLines={1}>
                {locationText || 'Auto-detected'}
              </Text>
            </View>
          </View>
          <View style={styles.confirmActions}>
            <GlowButton
              title="Cancel"
              onPress={() => setShowConfirmModal(false)}
              variant="ghost"
              style={{ flex: 1 }}
            />
            <GlowButton
              title={sending ? 'Sending…' : 'Send Alert'}
              onPress={handleConfirmSend}
              variant={isDanger ? 'danger' : 'primary'}
              style={{ flex: 1, marginLeft: 12 }}
              disabled={sending}
            />
          </View>
        </View>
      </GlassModal>
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
    paddingHorizontal: 20,
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
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginBottom: 10,
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  typeButton: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 10,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  descriptionInput: {
    marginBottom: 16,
  },
  coordsText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter',
    marginTop: 4,
    marginBottom: 8,
  },
  dangerNotice: {
    marginTop: 8,
    marginBottom: 16,
    padding: 14,
    backgroundColor: Colors.alertRed + '10',
    borderColor: Colors.alertRed + '30',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dangerText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: 'Inter',
    flex: 1,
    lineHeight: 18,
  },
  sendButton: {
    marginTop: 8,
  },
  confirmContent: {
    alignItems: 'center',
    padding: 8,
  },
  confirmIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Inter',
    lineHeight: 19,
    marginBottom: 20,
  },
  confirmDetails: {
    width: '100%',
    backgroundColor: Colors.glassBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  confirmDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmDetailLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Inter',
  },
  confirmDetailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confirmDetailValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
    maxWidth: 180,
  },
  confirmActions: {
    flexDirection: 'row',
    width: '100%',
  },
});

export default CreateAlertScreen;
