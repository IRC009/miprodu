import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { functions, auth } from '../firebase';
import { loginUser, resolveUserContext, logoutUser } from '../services/dbService';
import { LogIn, Mail, Lock, User, Hash, Building2, ChevronRight } from 'lucide-react-native';

// ─── Modes ───────────────────────────────────────────────────────────────────
const MODE_ADMIN = 'admin';
const MODE_STAFF = 'staff';

const LIGHT = {
  bg: '#f5f5f5', card: '#ffffff', header: '#ffffff', tabBar: '#ffffff',
  border: '#e5e7eb', primary: '#C9A227', primaryText: '#1e293b',
  text: '#1e293b', sub: '#64748b', muted: '#9ca3af',
  online: '#10b981', offline: '#ef4444',
};

export default function LoginScreen({ onLoginSuccess, t = LIGHT }) {
  const [mode, setMode] = useState(MODE_ADMIN);

  // Admin fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Staff fields
  const [restaurantCode, setRestaurantCode] = useState('');
  const [username, setUsername]             = useState('');
  const [pin, setPin]                       = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // ── Admin login (existing flow) ─────────────────────────────────────────────
  const handleAdminLogin = async () => {
    if (!email || !password) {
      setError('Por favor, ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await loginUser(email, password);
      const userProfile = await resolveUserContext(
        userCredential.user.uid,
        userCredential.user.email
      );
      if (userProfile.role === 'staff' || userProfile.isStaff) {
        await logoutUser();
        setError('Esta cuenta es de un empleado. Usa el modo "Vendedor / Personal" para ingresar.');
        return;
      }
      onLoginSuccess(userCredential.user);
    } catch (err) {
      console.error('[Admin Login]', err);
      if (err.message === 'access_denied_staff') {
        setError('Esta cuenta es de un empleado. Usa el modo "Vendedor / Personal" para ingresar.');
      } else if (
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('Correo o contraseña incorrectos.');
      } else if (err.code === 'auth/invalid-email') {
        setError('El formato del correo es inválido.');
      } else {
        setError('Error al iniciar sesión. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Staff login (via Cloud Function) ───────────────────────────────────────
  const handleStaffLogin = async () => {
    if (!restaurantCode || !username || !pin) {
      setError('Por favor, completa todos los campos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 1. Call staffLogin Cloud Function to verify credentials and get synthetic auth data
      const staffLoginFn = httpsCallable(functions, 'staffLogin');
      const result = await staffLoginFn({
        restaurantId: restaurantCode.trim(),
        username: username.trim().toLowerCase(),
        password: pin.trim(),
      });

      const { syntheticEmail, authPassword, staffInfo } = result.data;

      if (!syntheticEmail || !authPassword) {
        setError('Error al autenticar. Contacta a tu administrador.');
        return;
      }

      // 2. Sign in with the synthetic Firebase Auth credentials returned by the function
      const userCredential = await signInWithEmailAndPassword(auth, syntheticEmail, authPassword);

      // 3. Build a profile compatible with the rest of the app from staffInfo
      const staffProfile = {
        restaurantId: staffInfo.restaurantId,
        role: staffInfo.role || 'mesero',
        roles: [staffInfo.role || 'mesero'],
        permissions: staffInfo.permissions || [],
        allowedBranches: staffInfo.assignedBranchIds || [],
        name: staffInfo.name || username,
        isStaff: true,
        waiterId: staffInfo.waiterId,
      };

      onLoginSuccess(userCredential.user, staffProfile);
    } catch (err) {
      console.error('[Staff Login]', err);
      if (err.code === 'functions/unauthenticated') {
        setError('Usuario o PIN incorrectos.');
      } else if (err.code === 'functions/resource-exhausted') {
        setError(err.message);
      } else if (err.code === 'functions/invalid-argument') {
        setError('Completa todos los campos correctamente.');
      } else if (err.message?.includes('network')) {
        setError('Sin conexión. Verifica tu red e inténtalo de nuevo.');
      } else {
        setError(err.message || 'Error al iniciar sesión. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    Keyboard.dismiss();
    if (mode === MODE_ADMIN) handleAdminLogin();
    else handleStaffLogin();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: t.bg }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ── */}
          <View style={styles.logoContainer}>
            <View style={[styles.logoCircle, { backgroundColor: t.primary, shadowColor: t.primary }]}>
              <Text style={styles.logoText}>CM</Text>
            </View>
            <Text style={[styles.title, { color: t.text }]}>MiProdu</Text>
            <Text style={[styles.subtitle, { color: t.sub }]}>Panel Móvil de Caja y Pedidos</Text>
          </View>

          {/* ── Mode Selector ── */}
          <View style={[styles.modeSwitcher, { backgroundColor: t.card, borderColor: t.border }]}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === MODE_ADMIN && { backgroundColor: t.primary }]}
              onPress={() => { setMode(MODE_ADMIN); setError(''); }}
            >
              <Building2
                size={15}
                color={mode === MODE_ADMIN ? t.primaryText : t.sub}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.modeBtnText, { color: mode === MODE_ADMIN ? t.primaryText : t.sub }, mode === MODE_ADMIN && { fontWeight: '700' }]}>
                Administrador
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, mode === MODE_STAFF && { backgroundColor: t.primary }]}
              onPress={() => { setMode(MODE_STAFF); setError(''); }}
            >
              <User
                size={15}
                color={mode === MODE_STAFF ? t.primaryText : t.sub}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.modeBtnText, { color: mode === MODE_STAFF ? t.primaryText : t.sub }, mode === MODE_STAFF && { fontWeight: '700' }]}>
                Vendedor / Personal
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Card ── */}
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ── Admin Fields ── */}
            {mode === MODE_ADMIN && (
              <>
                <View style={[styles.inputContainer, { backgroundColor: t.bg, borderColor: t.border }]}>
                  <Mail size={20} color={t.sub} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: t.text }]}
                    placeholder="Correo electrónico"
                    placeholderTextColor={t.muted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                <View style={[styles.inputContainer, { backgroundColor: t.bg, borderColor: t.border }]}>
                  <Lock size={20} color={t.sub} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: t.text }]}
                    placeholder="Contraseña"
                    placeholderTextColor={t.muted}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                </View>
              </>
            )}

            {/* ── Staff Fields ── */}
            {mode === MODE_STAFF && (
              <>
                <View style={styles.fieldLabel}>
                  <Text style={[styles.fieldLabelText, { color: t.sub }]}>
                    Pide el código del negocio a tu administrador
                  </Text>
                </View>

                <View style={[styles.inputContainer, { backgroundColor: t.bg, borderColor: t.border }]}>
                  <Hash size={20} color={t.sub} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: t.text }]}
                    placeholder="Código del negocio"
                    placeholderTextColor={t.muted}
                    value={restaurantCode}
                    onChangeText={setRestaurantCode}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                <View style={[styles.inputContainer, { backgroundColor: t.bg, borderColor: t.border }]}>
                  <User size={20} color={t.sub} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: t.text }]}
                    placeholder="Usuario / nombre de usuario"
                    placeholderTextColor={t.muted}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                <View style={[styles.inputContainer, { backgroundColor: t.bg, borderColor: t.border }]}>
                  <Lock size={20} color={t.sub} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: t.text }]}
                    placeholder="PIN"
                    placeholderTextColor={t.muted}
                    value={pin}
                    onChangeText={setPin}
                    keyboardType="numeric"
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                </View>
              </>
            )}

            {/* ── Submit Button ── */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: t.primary, shadowColor: t.primary }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={t.primaryText} size="small" />
              ) : (
                <View style={styles.buttonContent}>
                  <LogIn size={20} color={t.primaryText} style={styles.btnIcon} />
                  <Text style={[styles.buttonText, { color: t.primaryText }]}>Iniciar Sesión</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
    marginBottom: 28,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#C9A227',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#C9A227',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    color: '#1e293b',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  // ── Mode Switcher ──
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 4,
    marginBottom: 20,
    width: '100%',
    maxWidth: 400,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
  },
  modeBtnActive: {
    backgroundColor: '#C9A227',
    shadowColor: '#C9A227',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modeBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  // ── Card ──
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  fieldLabel: {
    marginBottom: 14,
  },
  fieldLabelText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 14,
    paddingHorizontal: 15,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#1e293b',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#C9A227',
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#C9A227',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
