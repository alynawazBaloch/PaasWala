import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../utils/colors';
import { useAuth } from '../../context/AuthContext';
import { createStory } from '../../services/dataService';
import { storage } from '../../services/firebase';

const BG_COLORS = ['#1a2a1a', '#2D6A4F', '#1a1a2a', '#2D4A6F', '#2a1a1a', '#6F2D2D', '#1a2a2a', '#1a1a1a', '#2a2a1a'];

const StoryComposerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuth();

  const [mode, setMode] = useState<'text' | 'photo'>('text');
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Gallery access required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
      setMode('photo');
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!currentUser) return;
    if (mode === 'text' && !text.trim()) {
      Alert.alert('Add text', 'Type something for your story.');
      return;
    }
    setUploading(true);
    try {
      let mediaUrl: string | undefined;
      if (mode === 'photo' && photoUri) {
        const response = await fetch(photoUri);
        const blob = await response.blob();
        const photoRef = ref(storage, `stories/${Date.now().toString(36)}.jpg`);
        await uploadBytes(photoRef, blob);
        mediaUrl = await getDownloadURL(photoRef);
      }
      await createStory({
        authorId: currentUser.uid,
        authorName: currentUser.name || 'User',
        authorAvatar: currentUser.avatar || undefined,
        authorRole: currentUser.role || 'resident',
        type: mode === 'text' ? 'text' : 'photo',
        mediaUrl,
        text: mode === 'text' ? text.trim() : undefined,
        backgroundColor: mode === 'text' ? bgColor : undefined,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not create story.');
    } finally {
      setUploading(false);
    }
  }, [currentUser, mode, text, bgColor, photoUri, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Story</Text>
        <TouchableOpacity onPress={handleShare} disabled={uploading || (!text.trim() && mode === 'text')}>
          {uploading ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Text style={[styles.shareBtn, (!text.trim() && mode === 'text') && { opacity: 0.4 }]}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Mode toggle: Text / Photo */}
      <View style={styles.modeRow}>
        <TouchableOpacity style={[styles.modeBtn, mode === 'text' && styles.modeBtnActive]} onPress={() => setMode('text')}>
          <Ionicons name="text" size={18} color={mode === 'text' ? Colors.background : Colors.textSecondary} />
          <Text style={[styles.modeLabel, mode === 'text' && { color: Colors.background }]}>Text</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeBtn, mode === 'photo' && styles.modeBtnActive]} onPress={handlePickPhoto}>
          <Ionicons name="image" size={18} color={mode === 'photo' ? Colors.background : Colors.textSecondary} />
          <Text style={[styles.modeLabel, mode === 'photo' && { color: Colors.background }]}>Photo</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {mode === 'text' ? (
          <View style={[styles.textStoryPreview, { backgroundColor: bgColor }]}>
            <TextInput
              style={styles.textInput}
              placeholder="Type something..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={text}
              onChangeText={setText}
              multiline
              maxLength={200}
              autoFocus
            />
          </View>
        ) : photoUri ? (
          <View style={styles.flex}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            <TextInput
              style={styles.photoOverlayInput}
              placeholder="Add a caption..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={text}
              onChangeText={setText}
              multiline
              maxLength={100}
            />
          </View>
        ) : (
          <View style={styles.emptyPhoto}>
            <Ionicons name="image-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyPhotoText}>Tap Photo to choose an image</Text>
          </View>
        )}

        {/* Background color picker (text mode only) */}
        {mode === 'text' && (
          <View style={styles.colorRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorScroll}>
              {BG_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }, bgColor === c && styles.colorSwatchSelected]}
                  onPress={() => setBgColor(c)}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, fontFamily: 'Inter' },
  shareBtn: { fontSize: 16, fontWeight: '700', color: Colors.accent, fontFamily: 'Inter' },
  modeRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16,
  },
  modeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.glassBg, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  modeBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  modeLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, fontFamily: 'Inter' },
  textStoryPreview: {
    flex: 1, marginHorizontal: 16, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    padding: 24, marginBottom: 16,
  },
  textInput: {
    fontSize: 28, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', fontFamily: 'Inter',
    width: '100%',
  },
  photoPreview: { flex: 1, marginHorizontal: 16, borderRadius: 24, marginBottom: 8 },
  photoOverlayInput: {
    position: 'absolute', bottom: 40, left: 24, right: 24, fontSize: 18, fontWeight: '600',
    color: '#FFFFFF', textAlign: 'center', fontFamily: 'Inter',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  emptyPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyPhotoText: { fontSize: 14, color: Colors.textMuted, fontFamily: 'Inter' },
  colorRow: { paddingVertical: 12, marginBottom: 20 },
  colorScroll: { paddingHorizontal: 16, gap: 12 },
  colorSwatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchSelected: { borderColor: '#FFFFFF' },
});

export default StoryComposerScreen;
