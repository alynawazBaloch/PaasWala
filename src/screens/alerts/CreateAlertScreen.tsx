import React, { useState } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import GlowInput from '../../components/glass/GlowInput';
import GlassModal from '../../components/glass/GlassModal';
import Colors from '../../utils/colors';
import { saveAlert } from '../../services/dataService';
import type { Alert as PSAlert } from '../../services/dataService';

const ALERT_TYPES = [
  { id: 'emergency', label: 'Emergency', icon: 'alert-circle' as const, color: Colors.alertRed },
  { id: 'security', label: 'Security', icon: 'shield' as const, color: Colors.alertOrange },
  { id: 'weather', label: 'Weather', icon: 'thunderstorm' as const, color: '#4A90D9' },
  { id: 'utility', label: 'Utility', icon: 'flash' as const, color: Colors.alertYellow },
  { id: 'traffic', label: 'Traffic', icon: 'compass' as const, color: '#9B59B6' },
  { id: 'lost_pet', label: 'Lost Pet', icon: 'heart' as const, color: '#E91E63' },
  { id: 'other', label: 'Other', icon: 'notifications' as const, color: Colors.textSecondary },
];

const CreateAlertScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const selectedTypeConfig = ALERT_TYPES.find((t) => t.id === selectedType);
  const isDanger = selectedType === 'emergency' || isEmergency;

  const handleSendAlert = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    const newAlert: PSAlert = {
      id: 'alert_' + Date.now().toString(36),
      type: selectedType || 'other',
      title: selectedTypeConfig?.label || 'Alert',
      description: description || '',
      location: location || 'Neighborhood',
      timestamp: Date.now(),
      resolved: false,
    };
    await saveAlert(newAlert);
    setShowConfirmModal(false);
    Alert.alert('Success', 'Alert sent to all residents!');
    navigation?.goBack();
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
              onPress={() => {
                setSelectedType(type.id);
                if (type.id === 'emergency') setIsEmergency(true);
              }}
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
          value={location}
          onChangeText={setLocation}
          icon="location"
          rightIcon={
            <TouchableOpacity onPress={() => setLocation('Current Location')}>
              <Ionicons name="locate" size={20} color={Colors.accent} />
            </TouchableOpacity>
          }
        />

        {/* Emergency Toggle */}
        <GlassCard style={styles.emergencyToggle} glowColor="transparent">
          <View style={styles.emergencyRow}>
            <View style={styles.emergencyLeft}>
              <Ionicons
                name="warning"
                size={20}
                color={isEmergency ? Colors.alertRed : Colors.textMuted}
              />
              <View style={styles.emergencyTextBlock}>
                <Text
                  style={[
                    styles.emergencyLabel,
                    isEmergency && { color: Colors.alertRed },
                  ]}
                >
                  Mark as Emergency
                </Text>
                <Text style={styles.emergencySubtext}>
                  Will notify all residents immediately
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.toggleSwitch,
                isEmergency && { backgroundColor: Colors.alertRed },
              ]}
              onPress={() => setIsEmergency(!isEmergency)}
            >
              <View
                style={[
                  styles.toggleKnob,
                  isEmergency && { transform: [{ translateX: 20 }] },
                ]}
              />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Send Button */}
        <GlowButton
          title="Send Alert"
          onPress={handleSendAlert}
          variant={isDanger ? 'danger' : 'primary'}
          disabled={!isValid}
          size="lg"
          style={styles.sendButton}
          icon={<Ionicons name="paper-plane" size={18} color={Colors.textPrimary} />}
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
              <Text style={styles.confirmDetailLabel}>Emergency</Text>
              <Text style={styles.confirmDetailValue}>
                {isEmergency ? 'Yes' : 'No'}
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
              title="Send Alert"
              onPress={handleConfirmSend}
              variant={isDanger ? 'danger' : 'primary'}
              style={{ flex: 1, marginLeft: 12 }}
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
  emergencyToggle: {
    marginTop: 8,
    marginBottom: 24,
    padding: 0,
    backgroundColor: Colors.glassBg,
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emergencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  emergencyTextBlock: {
    flex: 1,
  },
  emergencyLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  emergencySubtext: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.textMuted,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.textPrimary,
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
  },
  confirmActions: {
    flexDirection: 'row',
    width: '100%',
  },
});

export default CreateAlertScreen;
