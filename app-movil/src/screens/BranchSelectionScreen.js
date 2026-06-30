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

const LIGHT = {
  bg: '#f5f5f5', card: '#ffffff', header: '#ffffff', tabBar: '#ffffff',
  border: '#e5e7eb', primary: '#C9A227', primaryText: '#1e293b',
  text: '#1e293b', sub: '#64748b', muted: '#9ca3af',
  online: '#10b981', offline: '#ef4444',
};

export default function BranchSelectionScreen({
  profile,
  branches,
  onSelectBranch,
  onLogout,
  t = LIGHT,
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
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header / Logo ── */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoCircle, { backgroundColor: t.primary, shadowColor: t.primary }]}>
            <Text style={[styles.logoText, { color: t.primaryText }]}>CM</Text>
          </View>
          <Text style={[styles.title, { color: t.text }]}>MiProdu</Text>
          <Text style={[styles.subtitle, { color: t.sub }]}>Selecciona tu sede de trabajo</Text>
        </View>

        {/* ── Selection Card ── */}
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.cardTitle, { color: t.text }]}>Sedes Disponibles</Text>
          <Text style={[styles.cardSubtitle, { color: t.sub }]}>
            Solo recibirás llamados de atención y notificaciones correspondientes a la sede seleccionada.
          </Text>

          <View style={styles.branchList}>
            {allowedBranches.length > 0 ? (
              allowedBranches.map((branch) => (
                <TouchableOpacity
                  key={branch.id}
                  style={[styles.branchItem, { backgroundColor: t.bg, borderColor: t.border }]}
                  onPress={() => onSelectBranch(branch)}
                >
                  <MapPin size={22} color={t.primary} style={styles.pinIcon} />
                  <View style={styles.branchInfo}>
                    <Text style={[styles.branchName, { color: t.text }]}>{branch.name}</Text>
                    {branch.address ? (
                      <Text style={[styles.branchAddress, { color: t.sub }]}>{branch.address}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: t.sub }]}>
                  No tienes sedes asignadas. Contacta a tu administrador para que te asigne una sede.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Logout Button ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color="#ef4444" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#C9A227',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#C9A227',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    color: '#1e293b',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  cardTitle: {
    color: '#1e293b',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  cardSubtitle: {
    color: '#64748b',
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
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    color: '#1e293b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  branchAddress: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 3,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
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
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
