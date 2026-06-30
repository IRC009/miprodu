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
import { LogOut, User, MapPin, Shield, HelpCircle, Bell, BellOff, Phone, Moon } from 'lucide-react-native';
import { logoutUser } from '../services/dbService';

const LIGHT = {
  bg: '#f5f5f5', card: '#ffffff', header: '#ffffff', tabBar: '#ffffff',
  border: '#e5e7eb', primary: '#C9A227', primaryText: '#1e293b',
  text: '#1e293b', sub: '#64748b', muted: '#9ca3af',
  online: '#10b981', offline: '#ef4444',
};

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
  t = LIGHT,
  themeMode = 'light',
  onToggleTheme,
}) {
  const [localMuted, setLocalMuted] = useState(muted);
  const styles = getStyles(t);

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

  const displayRole = (role) => {
    if (!role) return 'Invitado';
    const r = role.toLowerCase();
    if (r === 'mesero') return 'Vendedor';
    if (r === 'owner') return 'Dueño';
    if (r === 'admin') return 'Administrador';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <User size={36} color="#ffffff" />
          </View>
          <Text style={styles.userName}>{profile.name || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{profile.email || 'correo@ejemplo.com'}</Text>
          
          <View style={styles.roleBadgeContainer}>
            {profile.roles?.map((r, idx) => (
              <View key={idx} style={styles.roleBadge}>
                <Shield size={12} color={t.sub} style={styles.roleIcon} />
                <Text style={styles.roleText}>{displayRole(r).toUpperCase()}</Text>
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
                    <MapPin size={18} color={isSelected ? '#10b981' : t.sub} style={styles.pinIcon} />
                    <View style={{ flex: 1 }}>
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

        {/* ── Preferences & Notifications ── */}
        <Text style={styles.sectionLabel}>Preferencias y Apariencia</Text>
        <View style={styles.sectionCard}>
          {/* Theme Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Moon size={20} color={themeMode === 'dark' ? t.primary : t.sub} style={styles.toggleIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Modo Oscuro</Text>
                <Text style={styles.toggleDesc}>
                  Cambiar la apariencia de la aplicación
                </Text>
              </View>
            </View>
            <Switch
              value={themeMode === 'dark'}
              onValueChange={(val) => onToggleTheme && onToggleTheme(val ? 'dark' : 'light')}
              trackColor={{ false: '#e2e8f0', true: t.primary + '55' }}
              thumbColor={themeMode !== 'dark' ? '#cbd5e1' : t.primary}
            />
          </View>

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
              trackColor={{ false: '#e2e8f0', true: '#10b98155' }}
              thumbColor={localMuted ? '#cbd5e1' : '#10b981'}
            />
          </View>
        </View>

        {/* ── Custom WhatsApp Settings ── */}
        <Text style={styles.sectionLabel}>WhatsApp de Pedidos</Text>
        <View style={styles.sectionCard}>
          {/* Custom WhatsApp Toggle */}
          <View style={[styles.toggleRow, !customWaEnabled && { borderBottomWidth: 0 }]}>
            <View style={styles.toggleInfo}>
              <Phone size={20} color={customWaEnabled ? "#10b981" : t.sub} style={styles.toggleIcon} />
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
              trackColor={{ false: '#e2e8f0', true: '#10b98155' }}
              thumbColor={!customWaEnabled ? '#cbd5e1' : '#10b981'}
            />
          </View>
          {customWaEnabled && (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ej: 573001234567 (con código de país)"
                placeholderTextColor={t.muted}
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
            <HelpCircle size={16} color={t.sub} style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Rol Principal:</Text>
            <Text style={styles.infoValue}>{displayRole(profile.role)}</Text>
          </View>
          <View style={styles.infoRow}>
            <HelpCircle size={16} color={t.sub} style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Plataforma:</Text>
            <Text style={styles.infoValue}>React Native (Expo)</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <HelpCircle size={16} color={t.sub} style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Soporte Offline:</Text>
            <Text style={[styles.infoValue, { color: '#10b981', fontWeight: 'bold' }]}>Firestore Cache</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color="#ffffff" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scrollContainer: { padding: 20, paddingBottom: 100 },
  profileCard: {
    backgroundColor: t.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: t.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: t.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  userName: { color: t.text, fontSize: 20, fontWeight: 'bold' },
  userEmail: { color: t.sub, fontSize: 14, marginTop: 4, marginBottom: 16 },
  roleBadgeContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.bg, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4, margin: 4,
    borderWidth: 1, borderColor: t.border,
  },
  roleIcon: { marginRight: 4 },
  roleText: { color: t.sub, fontSize: 10, fontWeight: 'bold' },
  sectionLabel: {
    color: t.text, fontSize: 15, fontWeight: 'bold',
    marginBottom: 10, marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: t.card, borderRadius: 20,
    borderWidth: 1, borderColor: t.border,
    paddingVertical: 8, marginBottom: 20,
  },
  branchItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: t.border,
  },
  branchItemActive: { backgroundColor: t.bg },
  branchInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pinIcon: { marginRight: 12 },
  branchName: { color: t.sub, fontSize: 15, fontWeight: 'bold' },
  branchNameActive: { color: t.text },
  branchAddress: { color: t.sub, fontSize: 12, marginTop: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  noBranchesText: { color: t.sub, padding: 16, textAlign: 'center' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: t.border, gap: 12,
  },
  toggleInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon: { flexShrink: 0 },
  toggleLabel: { color: t.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  toggleDesc: { color: t.sub, fontSize: 12, lineHeight: 16 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: t.border,
  },
  infoIcon: { marginRight: 10 },
  infoLabel: { color: t.sub, fontSize: 14 },
  infoValue: { color: t.text, fontSize: 14, fontWeight: '600', marginLeft: 'auto' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ef4444', borderRadius: 14, height: 56, marginTop: 15,
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 5, elevation: 3,
  },
  logoutIcon: { marginRight: 8 },
  logoutText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.border,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    color: t.text,
    fontSize: 14,
  },
});
