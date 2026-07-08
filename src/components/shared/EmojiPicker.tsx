import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../../utils/colors';

const EMOJIS = ['👍', '❤️', '😄', '😮', '😢', '🙏'];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  currentReaction?: string;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, currentReaction }) => {
  return (
    <View style={styles.container}>
      {EMOJIS.map((emoji) => (
        <TouchableOpacity
          key={emoji}
          style={[
            styles.emojiBtn,
            currentReaction === emoji && styles.emojiBtnActive,
          ]}
          onPress={() => onSelect(emoji)}
          activeOpacity={0.7}
        >
          <Text style={styles.emojiText}>{emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.glassBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
  },
  emojiBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBtnActive: {
    backgroundColor: Colors.primary + '40',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  emojiText: {
    fontSize: 20,
  },
});

export default EmojiPicker;
