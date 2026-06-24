import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../../services/firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, where, increment } from 'firebase/firestore';
import { encryptPassword } from '../../../utils/crypto';

const STAFF_EMAIL_DOMAIN = 'staff.cartaymesa.com';

// Datos para remarketing y segmentación
const BUSINESS_TYPES = [
  'Restaurante', 'Cafetería / Coffee Shop', 'Bar / Coctelería', 'Pizzería',
  'Hamburguesería', 'Comida Rápida', 'Comida Saludable', 'Sushi / Asiática',
  'Heladería / Repostería', 'Panadería', 'Food Truck', 'Hotel / Hospedaje',
  'Dark Kitchen / Nube', 'Catering / Eventos', 'Otro'
];

const HOW_FOUND_OPTIONS = [
  'Búsqueda en Google', 'Instagram / Redes Sociales', 'Recomendación de un amigo',
  'LinkedIn', 'WhatsApp', 'YouTube', 'Ferias / Eventos', 'Otro'
];

const BRANCH_COUNT_OPTIONS = [
  '1 sede', '2 - 3 sedes', '4 - 10 sedes', 'Más de 10 sedes'
];

export function useAuthForm(onLogin) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [step, setStep] = useState(1); // Paso del registro multi-etapa

  // Paso 1 - Credenciales
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Paso 2 - Datos personales y de negocio (remarketing)
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [branchCount, setBranchCount] = useState('');
  const [howFound, setHowFound] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Validaciones por paso ──────────────────────────────────────────
  const validateStep1 = () => {
    if (!email || !password) { setError('Completa todos los campos.'); return false; }
    if (email.includes(`.${STAFF_EMAIL_DOMAIN}`)) {
      setError('Este correo no puede usarse para crear una cuenta de propietario.');
      return false;
    }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return false; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return false; }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    if (!restaurantName || !ownerName || !phone) {
      setError('Nombre del negocio, tu nombre y teléfono son obligatorios.');
      return false;
    }
    if (!acceptTerms) { setError('Debes aceptar los términos y condiciones.'); return false; }
    setError('');
    return true;
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    }
  };

  const handlePrevStep = () => {
    setStep(1);
    setError('');
  };

  // ── Password recovery ──────────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico en el campo para enviarte el enlace de recuperación.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const emailKey = email.trim().toLowerCase();
      
      // Verificar si el correo existe en la colección de restaurantes (pública)
      const qRestaurants = query(collection(db, 'restaurants'), where('ownerEmail', '==', emailKey));
      const restaurantsSnap = await getDocs(qRestaurants);
      
      if (restaurantsSnap.empty) {
        setError('El correo electrónico no está registrado.');
        setLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, emailKey);
      alert('Te hemos enviado un correo electrónico para restablecer tu contraseña. Revisa tu bandeja de entrada o la carpeta de spam.');
    } catch (err) {
      console.error('Password reset error:', err);
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  // ── Submit final ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Si es login, ejecutar directamente
    if (!isRegistering) {
      setLoading(true);
      setError('');
      try {
        const emailKey = email.trim().toLowerCase();
        
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr) {
          // Si falló por credenciales incorrectas, verifiquemos si el correo existe en Firestore (restaurantes)
          if (signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/user-not-found') {
            const qRestaurants = query(collection(db, 'restaurants'), where('ownerEmail', '==', emailKey));
            const restaurantsSnap = await getDocs(qRestaurants);
            
            if (restaurantsSnap.empty) {
              setError('El correo electrónico no está registrado. Si eres nuevo, por favor crea una cuenta.');
            } else {
              setError('Contraseña incorrecta. Inténtalo de nuevo o restablece tu contraseña.');
            }
          } else {
            setError(getErrorMessage(signInErr.code));
          }
          setLoading(false);
          return;
        }

        const user = userCredential.user;
        
        // Verificar si la base de datos (restaurante) existe (por ID, ownerId o ownerEmail)
        let hasRestaurant = false;
        const resRef = doc(db, 'restaurants', user.uid);
        const resSnap = await getDoc(resRef);
        if (resSnap.exists()) {
          hasRestaurant = true;
        } else {
          const q = query(collection(db, 'restaurants'), where('ownerId', '==', user.uid));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            hasRestaurant = true;
          } else if (user.email) {
            const qEmail = query(collection(db, 'restaurants'), where('ownerEmail', '==', user.email.toLowerCase()));
            const qEmailSnap = await getDocs(qEmail);
            if (!qEmailSnap.empty) {
              hasRestaurant = true;
            }
          }
        }
        
        if (!hasRestaurant) {
          setError('Tu cuenta existe, pero no tienes un restaurante configurado. Te hemos redirigido al formulario de registro para que crees tu base de datos.');
          setIsRegistering(true);
          setStep(2);
          setRestaurantName('');
          setOwnerName('');
          setPhone('');
          setLoading(false);
          return;
        }

        onLogin(user);
      } catch (err) {
        setError(getErrorMessage(err.code));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Si es registro paso 2, validar y enviar
    if (step === 2) {
      if (!validateStep2()) return;
      setLoading(true);
      setError('');
      sessionStorage.setItem('is_registering', 'true');

      try {
        let user;
        let isExistingAuthUser = false;
        
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          user = userCredential.user;
        } catch (err) {
          if (err.code === 'auth/email-already-in-use') {
            // Verificar si este usuario tiene o no restaurante en base de datos
            const emailKey = email.toLowerCase();
            const q = query(collection(db, 'restaurants'), where('ownerEmail', '==', emailKey));
            const qSnap = await getDocs(q);
            
            if (qSnap.empty) {
              // El usuario de Auth ya existe, pero NO tiene restaurante en Firestore.
              // Intentamos loguearlo con la contraseña que ingresó para validar su acceso.
              try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                user = userCredential.user;
                isExistingAuthUser = true;
              } catch (signInErr) {
                console.error("Fallo de login para usuario sin BD:", signInErr);
                sessionStorage.removeItem('is_registering');
                setError('Este correo ya está registrado, pero no tienes un restaurante creado. La contraseña que ingresaste es incorrecta. Por favor, inicia sesión con tu contraseña correcta en "Iniciar Sesión" para crearlo, o recupera tu contraseña si no la recuerdas.');
                setLoading(false);
                return;
              }
            } else {
              // El restaurante ya existe, lanzamos el error normal de duplicado
              throw err;
            }
          } else {
            throw err;
          }
        }

        const emailKey = email.toLowerCase();
        const now = new Date().toISOString();

        // 1. Perfil de usuario con datos completos para remarketing
        await setDoc(doc(db, 'users', user.uid), {
          email: emailKey,
          ownerName,
          phone,
          city: city || '',
          businessType: businessType || '',
          branchCount: branchCount || '',
          howFound: howFound || '',
          createdAt: now,
          lastSeen: now,
          registrationSource: 'web_dashboard',
          marketingConsent: true,
          role: 'owner',
          password: encryptPassword(password),
        }, { merge: true });

        // 3. Restaurante base con todos los datos del formulario
        await setDoc(doc(db, 'restaurants', user.uid), {
          name: restaurantName,
          ownerId: user.uid,
          ownerEmail: emailKey,
          ownerName,
          phone,
          city: city || '',
          businessType: businessType || '',
          branchCount: branchCount || '',
          createdAt: now,
          subscription: { status: 'inactive', planLevel: 0 },
          leadSource: howFound || '',
        }, { merge: true });

        // 3b. Sede por defecto gratis
        const defaultBranchId = 'default_branch';
        await setDoc(doc(db, `restaurants/${user.uid}/branches`, defaultBranchId), {
          name: 'Sede Principal',
          city: city || 'Mi Ciudad',
          address: 'Dirección Principal',
          phone: phone || '',
          schedule: 'Lunes a Domingo 12:00 PM - 10:00 PM',
          lat: '',
          lng: '',
          planLevel: 0,
          customClass: '',
          photoUrl: '',
          bgImageUrl: '',
          password: '1234',
          lastPlanChange: now
        });

        // 4. Perfil de personal para el dueño (PIN maestro para POS)
        const ownerWaiterId = 'owner_default';
        await setDoc(doc(db, `restaurants/${user.uid}/waiters`, ownerWaiterId), {
          restaurantId: user.uid,
          name: ownerName || 'Dueño/Admin',
          pin: '1234',
          role: 'owner',
          dashboardEmail: emailKey,
          assignedBranchIds: ['all'],
          updatedAt: now,
        });


        // 5. [Failsafe] Increment weekly analytics bucket — never blocks the main flow
        try {
          const now = new Date();
          const day = now.getDay();
          const monday = new Date(now);
          monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1));
          const yearStr = monday.getFullYear();
          const monthStr = String(monday.getMonth() + 1).padStart(2, '0');
          const dayStr = String(monday.getDate()).padStart(2, '0');
          const weekId = `${yearStr}-${monthStr}-${dayStr}`;
          const year = yearStr.toString();
          // New pattern: platform_analytics/{year}.weekly.{weekId}
          const bucketRef = doc(db, 'platform_analytics', year);
          await setDoc(bucketRef, {
            year: parseInt(year),
            updatedAt: now.toISOString(),
            weekly: {
              [weekId]: {
                weekId: weekId,
                newClients: increment(1),
                totalClients: increment(1)
              }
            }
          }, { merge: true });
        } catch (analyticsErr) {
          console.warn('[Analytics] weekly bucket increment failed (non-critical):', analyticsErr.message);
        }

        sessionStorage.removeItem('is_registering');
        onLogin(user);
      } catch (err) {
        sessionStorage.removeItem('is_registering');
        console.error('Auth error:', err);
        setError(getErrorMessage(err.code));
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setStep(1);
    setError('');
  };

  // Mensajes de error amigables
  const getErrorMessage = (code) => {
    const messages = {
      'auth/email-already-in-use': 'Este correo ya está registrado. ¿Quieres iniciar sesión?',
      'auth/invalid-email': 'El correo electrónico no es válido.',
      'auth/wrong-password': 'Contraseña incorrecta. Inténtalo de nuevo.',
      'auth/user-not-found': 'No encontramos una cuenta con ese correo.',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'auth/invalid-credential': 'Credenciales inválidas. Verifica tu correo y contraseña.',
    };
    return messages[code] || 'Ocurrió un error. Intenta nuevamente.';
  };

  return {
    isRegistering, step,
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    restaurantName, setRestaurantName,
    ownerName, setOwnerName,
    phone, setPhone,
    city, setCity,
    businessType, setBusinessType,
    branchCount, setBranchCount,
    howFound, setHowFound,
    acceptTerms, setAcceptTerms,
    BUSINESS_TYPES, HOW_FOUND_OPTIONS, BRANCH_COUNT_OPTIONS,
    error, loading,
    handleSubmit, handleNextStep, handlePrevStep, toggleMode,
    handleForgotPassword,
  };
}
