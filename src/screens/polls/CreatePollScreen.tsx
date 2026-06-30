import React, { useState } from 'react';
import { savePoll } from '../../services/dataService';
import type { Poll } from '../../services/dataService';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/glass/GlassCard';
import GlowButton from '../../components/glass/GlowButton';
import GlowInput from '../../components/glass/GlowInput';
import Colors from '../../utils/colors';

const DURATION_OPTIONS = [
  { label: '24 Hours', value: 24 * 60 * 60 * 1000 },
  { label: '48 Hours', value: 48 * 60 * 60 * 1000 },
  { label: '7 Days', value: 7 * 24 * 60 * 60 * 1000 },
];

const CreatePollScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [selectedDuration, setSelectedDuration] = useState(DURATION_OPTIONS[1].value);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 8) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleCreatePoll = async () => {
    const pollOptions: Poll['options'] = validOptions.map((text, i) => ({
      id: 'opt_' + Date.now().toString(36) + '_' + i,
      text,
      votes: 0,
      voted: false,
    }));

    const newPoll: Poll = {
      id: 'poll_' + Date.now().toString(36),
      question: question.trim(),
      options: pollOptions,
      totalVotes: 0,
      isPinned: false,
      isAdmin: false,
      expiresAt: Date.now() + selectedDuration,
      createdBy: 'Resident',
    };

    await savePoll(newPoll);
    Alert.alert('Success', 'Poll created!');
    navigation?.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const validOptions = options.filter((o) => o.trim().length > 0);
  const isValid = question.trim().length > 0 && validOptions.length >= 2;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Poll</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Question */}
        <Text style={styles.sectionLabel}>Poll Question</Text>
        <GlowInput
          placeholder="Ask the community..."
          placeholderTextColor={Colors.textMuted}
          value={question}
          onChangeText={setQuestion}
          icon="help-circle"
          multiline
          numberOfLines={2}
          containerStyle={styles.questionInput}
        />

        {/* Options */}
        <Text style={styles.sectionLabel}>
          Options
          <Text style={styles.sectionHint}> (min 2, max 8)</Text>
        </Text>
        <View style={styles.optionsList}>
          {options.map((option, index) => (
            <View key={`option-${index}`} style={styles.optionRow}>
              <View style={styles.optionNumber}>
                <Text style={styles.optionNumberText}>{index + 1}</Text>
              </View>
              <GlowInput
                placeholder={`Option ${index + 1}`}
                placeholderTextColor={Colors.textMuted}
                value={option}
                onChangeText={(text) => handleOptionChange(index, text)}
                containerStyle={styles.optionInput}
                rightIcon={
                  options.length > 2 && option.length === 0 ? (
                    <TouchableOpacity onPress={() => removeOption(index)}>
                      <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  ) : undefined
                }
              />
            </View>
          ))}
        </View>

        {/* Add Option Button */}
        {options.length < 8 && (
          <TouchableOpacity style={styles.addOptionBtn} onPress={addOption} activeOpacity={0.7}>
            <Ionicons name="add-circle" size={20} color={Colors.accent} />
            <Text style={styles.addOptionText}>Add another option</Text>
          </TouchableOpacity>
        )}

        {/* Duration Picker */}
        <Text style={styles.sectionLabel}>Poll Duration</Text>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((duration) => (
            <TouchableOpacity
              key={duration.value}
              style={[
                styles.durationOption,
                selectedDuration === duration.value && styles.durationOptionActive,
              ]}
              onPress={() => setSelectedDuration(duration.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.durationText,
                  selectedDuration === duration.value && styles.durationTextActive,
                ]}
              >
                {duration.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Anonymous Toggle */}
        <GlassCard style={styles.anonymousToggle} glowColor="transparent">
          <View style={styles.anonymousRow}>
            <View style={styles.anonymousLeft}>
              <Ionicons
                name="eye-off"
                size={20}
                color={isAnonymous ? Colors.accent : Colors.textMuted}
              />
              <View style={styles.anonymousTextBlock}>
                <Text
                  style={[
                    styles.anonymousLabel,
                    isAnonymous && { color: Colors.accent },
                  ]}
                >
                  Anonymous Poll
                </Text>
                <Text style={styles.anonymousSubtext}>
                  Votes will not show voter identities
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.toggleSwitch,
                isAnonymous && { backgroundColor: Colors.accent },
              ]}
              onPress={() => setIsAnonymous(!isAnonymous)}
            >
              <View
                style={[
                  styles.toggleKnob,
                  isAnonymous && { transform: [{ translateX: 20 }] },
                ]}
              />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Create Button */}
        <GlowButton
          title="Create Poll"
          onPress={handleCreatePoll}
          disabled={!isValid}
          size="lg"
          style={styles.createButton}
          icon={<Ionicons name="bar-chart" size={18} color={Colors.textPrimary} />}
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
  sectionHint: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '400',
  },
  questionInput: {
    marginBottom: 16,
  },
  optionsList: {
    gap: 8,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionNumberText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  optionInput: {
    flex: 1,
    marginBottom: 0,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  addOptionText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  durationOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationOptionActive: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(82,183,136,0.1)',
  },
  durationText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  durationTextActive: {
    color: Colors.accent,
  },
  anonymousToggle: {
    marginBottom: 24,
    padding: 0,
    backgroundColor: Colors.glassBg,
  },
  anonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  anonymousLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  anonymousTextBlock: {
    flex: 1,
  },
  anonymousLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  anonymousSubtext: {
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
  createButton: {
    marginTop: 8,
  },
});

export default CreatePollScreen;
