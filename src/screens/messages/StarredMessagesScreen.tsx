import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../utils/colors';

const StarredMessagesScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Starred Messages</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  text: { color: Colors.textPrimary, fontSize: 18, fontFamily: 'Inter' },
});

export default StarredMessagesScreen;
