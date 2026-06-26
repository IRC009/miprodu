import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  TextInput
} from 'react-native';
import { LogOut, User, MapPin, Shield, HelpCircle, Bell, BellOff, Phone } from 'lucide-react-native';
import { logoutUser } from '../services/dbService';

export default function PerfilScreen({ 
  profile, 
  branches, 
  selectedBranch, 
  onSelectBranch,
  onLogout,
  muted = false,
  onToggleMute,
  customWaEnabled = false,
  customWaPhone = '',
  onToggleCustomWa,
  onUpdateCustomWaPhone,
}) {
  const [localMuted, setLocalMuted] = useState(muted);

  const handleLogout = async () => {
    try {
      await logoutUser();
      onLogout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleMuteToggle = async (val) => {
    setLocalMuted(val);
    if (onToggleMute) await onToggleMute(val);
  };

  const handleCallsOnlyToggle = async (val) => {
    if (val) {
      Alert.alert(
        '🔔 Modo Solo Llamados',
        'La app mostrará únicamente los llamados de mesero. La Caja POS y Cocina quedarán ocultas. ¿Continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Activar',
            onPress: async () => {
              setLocalCallsOnly(true);
              if (onToggleCallsOnlyMode) await onToggleCallsOnlyMode(true);
            }
          }
        ]
      );
    } else {
      setLocalCallsOnly(false);
      if (onToggleCallsOnlyMode) await onToggleCallsOnlyMode(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <User size={36} color="#fceef2" />
          </View>
          <Text style={styles.userName}>{profile.name || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{profile.email || 'correo@ejemplo.com'}</Text>
          
          <View style={styles.roleBadgeContainer}>
            {profile.roles?.map((r, idx) => (
              <View key={idx} style={styles.roleBadge}>
                <Shield size={12} color="#fceef2" style={styles.roleIcon} />
                <Text style={styles.roleText}>{r.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Branch Selector */}
        <Text style={styles.sectionLabel}>Seleccionar Sede de Trabajo</Text>
        <View style={styles.sectionCard}>
          {branches && branches.length > 0 ? (
            branches.map(branch => {
              const isSelected = selectedBranch && selectedBranch.id === branch.id;
              return (
                <TouchableOpacity
                  key={branch.id}
                  style={[styles.branchItem, isSelected && styles.branchItemActive]}
                  onPress={() => onSelectBranch(branch)}
                >
                  <View style={styles.branchInfo}>
                    <MapPin size={18} color={isSelected ? '#10b981' : '#9a828a'} style={styles.pinIcon} />
                    <View>
                      <Text style={[styles.branchName, isSelected && styles.branchNameActive]}>
                        {branch.name}
                      </Text>
                      {branch.address ? (
                        <Text style={styles.branchAddress}>{branch.address}</Text>
                      ) : null}
                    </View>
                  </View>
                  {isSelected ? <View style={styles.activeDot} /> : null}
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.noBranchesText}>No hay sedes disponibles configuradas.</Text>
          )}
        </View>

        {/* ── Notification Settings ── */}
        <Text style={styles.sectionLabel}>Notificaciones de Pedidos</Text>
        <View style={styles.sectionCard}>
          {/* Mute Toggle */}
          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={styles.toggleInfo}>
              {localMuted
                ? <BellOff size={20} color="#ef4444" style={styles.toggleIcon} />
                : <Bell size={20} color="#10b981" style={styles.toggleIcon} />
              }
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>
                  {localMuted ? 'Silenciado' : 'Sonido activado'}
                </Text>
                <Text style={styles.toggleDesc}>
                  {localMuted
                    ? 'Los pedidos nuevos no emitirán sonido'
                    : 'Suena una caja registradora cuando llega un pedido nuevo'}
                </Text>
              </View>
            </View>
            <Switch
              value={!localMuted}
              onValueChange={(val) => handleMuteToggle(!val)}
              trackColor={{ false: '#3a1923', true: '#10b98155' }}
              thumbColor={localMuted ? '#9a828a' : '#10b981'}
            />
          </View>
        </View>

        {/* ── Custom WhatsApp Settings ── */}
        <Text style={styles.sectionLabel}>WhatsApp de Pedidos</Text>
        <View style={styles.sectionCard}>
          {/* Custom WhatsApp Toggle */}
          <View style={[styles.toggleRow, !customWaEnabled && { borderBottomWidth: 0 }]}>
            <View style={styles.toggleInfo}>
              <Phone size={20} color={customWaEnabled ? "#10b981" : "#9a828a"} style={styles.toggleIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>WhatsApp Personalizado</Text>
                <Text style={styles.toggleDesc}>
                  Enviar todos los pedidos a este celular en lugar de usar los de la base de datos
                </Text>
              </View>
            </View>
            <Switch
              value={customWaEnabled}
              onValueChange={onToggleCustomWa}
              trackColor={{ false: '#3a1923', true: '#10b98155' }}
              thumbColor={!customWaEnabled ? '#9a828a' : '#10b981'}
            />
          </View>
          {customWaEnabled && (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ej: 573001234567 (con código de país)"
                placeholderTextColor="#6d535e"
                keyboardType="phone-pad"
                value={customWaPhone}
                onChangeText={onUpdateCustomWaPhone}
              />
            </View>
          )}
        </View>

        {/* System Info */}
        <Text style={styles.sectionLabel}>Información del Sistema</Text>
        <View style={styles.sectionCard}>
          <View style={styles.infoRow}>
            <HelpCircle size={16} color="#9a828a" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Rol Principal:</Text>
            <Text style={styles.infoValue}>{profile.role || 'Invitado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <HelpCircle size={16} color="#9a828a" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Plataforma:</Text>
            <Text style={styles.infoValue}>React Native (Expo)</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <HelpCircle size={16} color="#9a828a" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Soporte Offline:</Text>
            <Text style={[styles.infoValue, { color: '#10b981', fontWeight: 'bold' }]}>Firestore Cache</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color="#fceef2" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#12070b' },
  scrollContainer: { padding: 20, paddingBottom: 100 },
  profileCard: {
    backgroundColor: '#1c0d13',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#3a1923',
    padding: 24,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#8b1a2e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#8b1a2e',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  userName: { color: '#fceef2', fontSize: 20, fontWeight: 'bold' },
  userEmail: { color: '#9a828a', fontSize: 14, marginTop: 4, marginBottom: 16 },
  roleBadgeContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#3a1923', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4, margin: 4,
  },
  roleIcon: { marginRight: 4 },
  roleText: { color: '#fceef2', fontSize: 10, fontWeight: 'bold' },
  sectionLabel: {
    color: '#fceef2', fontSize: 15, fontWeight: 'bold',
    marginBottom: 10, marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#1c0d13', borderRadius: 20,
    borderWidth: 1, borderColor: '#3a1923',
    paddingVertical: 8, marginBottom: 20,
  },
  branchItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#26121b',
  },
  branchItemActive: { backgroundColor: '#26121b' },
  branchInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pinIcon: { marginRight: 12 },
  branchName: { color: '#9a828a', fontSize: 15, fontWeight: 'bold' },
  branchNameActive: { color: '#fceef2' },
  branchAddress: { color: '#6d535e', fontSize: 12, marginTop: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  noBranchesText: { color: '#9a828a', padding: 16, textAlign: 'center' },
  // ── Toggle rows ──
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#26121b', gap: 12,
  },
  toggleInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon: { flexShrink: 0 },
  toggleLabel: { color: '#fceef2', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  toggleDesc: { color: '#6d535e', fontSize: 12, lineHeight: 16 },
  // ── Calls-Only Info ──
  callsOnlyInfoCard: {
    backgroundColor: '#1c0d13', borderRadius: 16,
    borderWidth: 1, borderColor: '#8b1a2e44',
    padding: 16, flexDirection: 'row',
    alignItems: 'flex-start', gap: 12, marginBottom: 20,
  },
  callsOnlyInfoIcon: { fontSize: 28, marginTop: 2 },
  callsOnlyInfoTitle: { color: '#ffffff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  callsOnlyInfoDesc: { color: '#9a828a', fontSize: 13, lineHeight: 18 },
  // ── System info ──
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#26121b',
  },
  infoIcon: { marginRight: 10 },
  infoLabel: { color: '#9a828a', fontSize: 14 },
  infoValue: { color: '#fceef2', fontSize: 14, fontWeight: '600', marginLeft: 'auto' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#991b1b', borderRadius: 14, height: 56, marginTop: 15,
    shadowColor: '#991b1b', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 5, elevation: 3,
  },
  logoutIcon: { marginRight: 8 },
  logoutText: { color: '#fceef2', fontSize: 16, fontWeight: 'bold' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12070b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a1923',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    color: '#fceef2',
    fontSize: 14,
  },
});
