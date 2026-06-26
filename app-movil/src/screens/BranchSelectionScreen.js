import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { MapPin, LogOut } from 'lucide-react-native';
import { logoutUser } from '../services/dbService';

export default function BranchSelectionScreen({
  profile,
  branches,
  onSelectBranch,
  onLogout,
}) {
  const allowedBranches = useMemo(() => {
    if (!profile) return [];
    // If Admin/Owner, they can see all branches
    if (
      profile.role === 'owner' ||
      profile.role === 'admin' ||
      (profile.allowedBranches && profile.allowedBranches.includes('all'))
    ) {
      return branches;
    }
    // For Staff, filter by allowedBranches
    return branches.filter(b => profile.allowedBranches && profile.allowedBranches.includes(b.id));
  }, [branches, profile]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      onLogout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header / Logo ── */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>CM</Text>
          </View>
          <Text style={styles.title}>MiProdu</Text>
          <Text style={styles.subtitle}>Selecciona tu sede de trabajo</Text>
        </View>

        {/* ── Selection Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sedes Disponibles</Text>
          <Text style={styles.cardSubtitle}>
            Solo recibirás llamados de mesa y notificaciones correspondientes a la sede seleccionada.
          </Text>

          <View style={styles.branchList}>
            {allowedBranches.length > 0 ? (
              allowedBranches.map((branch) => (
                <TouchableOpacity
                  key={branch.id}
                  style={styles.branchItem}
                  onPress={() => onSelectBranch(branch)}
                >
                  <MapPin size={22} color="#8b1a2e" style={styles.pinIcon} />
                  <View style={styles.branchInfo}>
                    <Text style={styles.branchName}>{branch.name}</Text>
                    {branch.address ? (
                      <Text style={styles.branchAddress}>{branch.address}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No tienes sedes asignadas. Contacta a tu administrador para que te asigne una sede.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Logout Button ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color="#fceef2" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12070b',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8b1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#8b1a2e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  logoText: {
    color: '#fceef2',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    color: '#fceef2',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#9a828a',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1c0d13',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#3a1923',
    shadowColor: '#8b1a2e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  cardTitle: {
    color: '#fceef2',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  cardSubtitle: {
    color: '#9a828a',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 16,
  },
  branchList: {
    width: '100%',
  },
  branchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26121b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a1923',
    padding: 16,
    marginBottom: 12,
  },
  pinIcon: {
    marginRight: 14,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
    color: '#fceef2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  branchAddress: {
    color: '#9a828a',
    fontSize: 12,
    marginTop: 3,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9a828a',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#fceef2',
    fontSize: 14,
    fontWeight: '600',
  },
});
