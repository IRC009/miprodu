import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lock, Award } from 'lucide-react-native';

export default function LockedFeatureScreen({ featureName, requiredPlan, currentPlan, onSwitchBranch }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Lock size={40} color="#e8748a" />
        </View>
        <Text style={styles.title}>Función Bloqueada</Text>
        <Text style={styles.subtitle}>
          La sección de <Text style={styles.bold}>{featureName}</Text> no está disponible en tu plan actual.
        </Text>
        
        <View style={styles.infoBox}>
          <Award size={18} color="#fceef2" style={{ marginRight: 8 }} />
          <Text style={styles.infoText}>
            Tu sede está en el plan <Text style={styles.bold}>{currentPlan}</Text>. Requiere plan <Text style={styles.bold}>{requiredPlan}</Text>.
          </Text>
        </View>

        <Text style={styles.footerText}>
          Puedes actualizar tu plan desde la página web de administración (Suscripción) o cambiar a otra sede que tenga el plan requerido.
        </Text>
        
        {onSwitchBranch && (
          <TouchableOpacity style={styles.btn} onPress={onSwitchBranch}>
            <Text style={styles.btnText}>Cambiar de Sede / Perfil</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12070b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1c0d13',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3a1923',
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8b1a2e22',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#8b1a2e',
  },
  title: {
    color: '#fceef2',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9a828a',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  bold: {
    color: '#fceef2',
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b1a2e33',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#8b1a2e44',
  },
  infoText: {
    color: '#fceef2',
    fontSize: 13,
    flex: 1,
  },
  footerText: {
    color: '#6d535e',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: '#8b1a2e',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    color: '#fceef2',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
