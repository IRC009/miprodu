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

export default function LoginScreen({ onLoginSuccess }) {
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
        setError('Esta cuenta es de un empleado. Usa el modo "Mesero / Staff" para ingresar.');
        return;
      }
      onLoginSuccess(userCredential.user);
    } catch (err) {
      console.error('[Admin Login]', err);
      if (err.message === 'access_denied_staff') {
        setError('Esta cuenta es de un empleado. Usa el modo "Mesero / Staff" para ingresar.');
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
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ── */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>CM</Text>
            </View>
            <Text style={styles.title}>MiProdu</Text>
            <Text style={styles.subtitle}>Panel Móvil de Caja y Restaurante</Text>
          </View>

          {/* ── Mode Selector ── */}
          <View style={styles.modeSwitcher}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === MODE_ADMIN && styles.modeBtnActive]}
              onPress={() => { setMode(MODE_ADMIN); setError(''); }}
            >
              <Building2
                size={15}
                color={mode === MODE_ADMIN ? '#fceef2' : '#9a828a'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.modeBtnText, mode === MODE_ADMIN && styles.modeBtnTextActive]}>
                Administrador
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, mode === MODE_STAFF && styles.modeBtnActive]}
              onPress={() => { setMode(MODE_STAFF); setError(''); }}
            >
              <User
                size={15}
                color={mode === MODE_STAFF ? '#fceef2' : '#9a828a'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.modeBtnText, mode === MODE_STAFF && styles.modeBtnTextActive]}>
                Mesero / Staff
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* ── Admin Fields ── */}
            {mode === MODE_ADMIN && (
              <>
                <View style={styles.inputContainer}>
                  <Mail size={20} color="#9a828a" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Correo electrónico"
                    placeholderTextColor="#6d535e"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Lock size={20} color="#9a828a" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    placeholderTextColor="#6d535e"
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
                  <Text style={styles.fieldLabelText}>
                    Pide el código del restaurante a tu administrador
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Hash size={20} color="#9a828a" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Código del restaurante"
                    placeholderTextColor="#6d535e"
                    value={restaurantCode}
                    onChangeText={setRestaurantCode}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <User size={20} color="#9a828a" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Usuario / nombre de usuario"
                    placeholderTextColor="#6d535e"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Lock size={20} color="#9a828a" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="PIN"
                    placeholderTextColor="#6d535e"
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
              style={styles.button}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fceef2" size="small" />
              ) : (
                <View style={styles.buttonContent}>
                  <LogIn size={20} color="#fceef2" style={styles.btnIcon} />
                  <Text style={styles.buttonText}>Iniciar Sesión</Text>
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
    marginBottom: 28,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#8b1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#8b1a2e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  logoText: {
    color: '#fceef2',
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    color: '#fceef2',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#9a828a',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  // ── Mode Switcher ──
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1c0d13',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a1923',
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
    backgroundColor: '#8b1a2e',
    shadowColor: '#8b1a2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modeBtnText: {
    color: '#9a828a',
    fontSize: 13,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: '#fceef2',
  },
  // ── Card ──
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1c0d13',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#3a1923',
    shadowColor: '#8b1a2e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  fieldLabel: {
    marginBottom: 14,
  },
  fieldLabelText: {
    color: '#9a828a',
    fontSize: 12,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#991b1b33',
    borderColor: '#991b1b',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26121b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a1923',
    marginBottom: 14,
    paddingHorizontal: 15,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fceef2',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#8b1a2e',
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#8b1a2e',
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
    color: '#fceef2',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
