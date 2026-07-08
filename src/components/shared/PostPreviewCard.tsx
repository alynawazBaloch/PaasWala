import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../utils/colors';

interface PostPreviewCardProps {
  authorName?: string;
  content?: string;
  onPress?: () => void;
}

const PostPreviewCard: React.FC<PostPreviewCardProps> = ({ authorName, content, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8} disabled={!onPress}>
      <View style={styles.header}>
        <Ionicons name="share-social-outline" size={14} color={Colors.accent} />
        <Text style={styles.headerText}>Shared Post</Text>
      </View>
      {authorName && (
        <Text style={styles.author}>{authorName}</Text>
      )}
      {content && (
        <Text style={styles.content} numberOfLines={3}>
          {content}
        </Text>
      )}
      <View style={styles.viewMore}>
        <Text style={styles.viewMoreText}>View post</Text>
        <Ionicons name="chevron-forward" size={12} color={Colors.accent} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glassBg,
    padding: 10,
    width: 200,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  author: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  content: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Inter',
    lineHeight: 16,
  },
  viewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  viewMoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Inter',
  },
});

export default PostPreviewCard;
