import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../utils/colors';

interface MessageActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  isMine: boolean;
  canDeleteEveryone: boolean;
  isBookmarked: boolean;
  onReply: () => void;
  onCopy: () => void;
  onDelete: (forEveryone: boolean) => void;
  onBookmark: () => void;
  onReact?: () => void;
  onForward?: () => void;
}

const MessageActionsSheet: React.FC<MessageActionsSheetProps> = ({
  visible,
  onClose,
  isMine,
  canDeleteEveryone,
  isBookmarked,
  onReply,
  onCopy,
  onDelete,
  onBookmark,
  onReact,
  onForward,
}) => {
  const actions = [
    { icon: 'arrow-undo' as const, label: 'Reply', onPress: () => { onReply(); onClose(); } },
    { icon: 'copy-outline' as const, label: 'Copy Text', onPress: () => { onCopy(); onClose(); } },
    ...(onReact ? [{ icon: 'happy-outline' as const, label: 'React', onPress: () => { onReact(); onClose(); } }] : []),
    ...(onForward ? [{ icon: 'arrow-redo' as const, label: 'Forward', onPress: () => { onForward(); onClose(); } }] : []),
    { icon: isBookmarked ? 'bookmark' as const : 'bookmark-outline' as const, label: isBookmarked ? 'Unstar' : 'Star', onPress: () => { onBookmark(); onClose(); } },
    ...(isMine
      ? [
          ...(canDeleteEveryone
            ? [{ icon: 'trash-outline' as const, label: 'Delete for Everyone', onPress: () => { onDelete(true); onClose(); }, destructive: true as const }]
            : []),
          { icon: 'trash-outline' as const, label: 'Delete for Me', onPress: () => { onDelete(false); onClose(); }, destructive: true as const },
        ]
      : []),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Message Actions</Text>
          <View style={styles.actionsList}>
            {actions.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={styles.actionRow}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={action.icon}
                  size={22}
                  color={(action as any).destructive ? Colors.error : Colors.textPrimary}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    (action as any).destructive && { color: Colors.error },
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.secondaryBg || Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted + '40',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  actionsList: {
    gap: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  actionLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
  cancelBtn: {
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'Inter',
  },
});

export default MessageActionsSheet;
