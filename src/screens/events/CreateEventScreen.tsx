import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import GlowInput from '../../components/glass/GlowInput';
import Colors from '../../utils/colors';
import { saveEvent } from '../../services/dataService';
import type { Event as PSEvent } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';

const CreateEventScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');

  const handleCreate = async () => {
    const newEvent: PSEvent = {
      id: 'evt_' + Date.now().toString(36),
      title,
      date,
      time,
      location,
      image: null,
      attendees: [],
      attendeeCount: 0,
      rsvp: null,
      createdBy: user?.name ?? 'A Resident',
      description,
    };
    await saveEvent(newEvent);
    Alert.alert('Success', 'Event created!');
    navigation?.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.formCard}>
          {/* Event Title */}
          <Text style={styles.label}>Event Title</Text>
          <GlowInput
            placeholder="What's the event?"
            value={title}
            onChangeText={setTitle}
            icon="calendar"
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <GlowInput
            placeholder="Describe your event..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            containerStyle={styles.multilineInput}
            icon="document-text"
          />

          {/* Date */}
          <Text style={styles.label}>Date</Text>
          <GlowInput
            placeholder="e.g. 25 Dec 2025"
            value={date}
            onChangeText={setDate}
            icon="calendar"
          />

          {/* Time */}
          <Text style={styles.label}>Time</Text>
          <GlowInput
            placeholder="e.g. 6:00 PM"
            value={time}
            onChangeText={setTime}
            icon="time"
          />

          {/* Location */}
          <Text style={styles.label}>Location</Text>
          <GlowInput
            placeholder="Where is it?"
            value={location}
            onChangeText={setLocation}
            icon="location"
          />
        </GlassCard>

        <GlowButton
          title="Create Event"
          onPress={handleCreate}
          size="lg"
          icon={<Ionicons name="add-circle" size={20} color={Colors.textPrimary} />}
          style={styles.createButton}
        />
      </ScrollView>
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
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  formCard: {
    marginBottom: 24,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  multilineInput: {
    minHeight: 80,
  },
  createButton: {
    marginTop: 8,
  },
});

export default CreateEventScreen;
