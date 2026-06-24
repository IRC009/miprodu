import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';

export default function OfflineBanner({ isConnected }) {
  if (isConnected) return null;

  return (
    <View style={styles.banner}>
      <WifiOff size={16} color="#fecaca" style={styles.icon} />
      <Text style={styles.text}>Modo Offline Activo — Los datos se sincronizarán al volver la red</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#991b1b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
