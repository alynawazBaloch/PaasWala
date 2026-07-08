import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Colors from '../../utils/colors';

interface AudioPlayerProps {
  uri: string;
  duration: number;
  waveform?: number[];
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ uri, duration, waveform }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      await soundRef.current?.pauseAsync();
      setIsPlaying(false);
    } else {
      if (!soundRef.current) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: true }
          );
          soundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsPlaying(false);
              soundRef.current?.setPositionAsync(0);
            }
          });
        } catch {
          return;
        }
      } else {
        await soundRef.current.playAsync();
      }
      setIsPlaying(true);
    }
  }, [isPlaying, uri]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const durationSec = duration / 1000 || 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.playBtn} onPress={handlePlayPause} activeOpacity={0.7}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={18}
          color={Colors.textPrimary}
        />
      </TouchableOpacity>
      <View style={styles.waveformContainer}>
        {waveform && waveform.length > 0 ? (
          <View style={styles.waveform}>
            {waveform.slice(0, 30).map((bar, i) => (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  { height: Math.max(4, (bar / 255) * 28) },
                ]}
              />
            ))}
          </View>
        ) : (
          <View style={styles.waveformPlaceholder}>
            <View style={[styles.waveformBar, { height: 12 }]} />
            <View style={[styles.waveformBar, { height: 20 }]} />
            <View style={[styles.waveformBar, { height: 8 }]} />
            <View style={[styles.waveformBar, { height: 24 }]} />
            <View style={[styles.waveformBar, { height: 16 }]} />
            <View style={[styles.waveformBar, { height: 20 }]} />
            <View style={[styles.waveformBar, { height: 10 }]} />
          </View>
        )}
      </View>
      <Text style={styles.duration}>{formatDuration(durationSec)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 160,
    gap: 8,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformContainer: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.accent + '80',
  },
  waveformPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  duration: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter',
    minWidth: 32,
    textAlign: 'right',
  },
});

export default AudioPlayer;
