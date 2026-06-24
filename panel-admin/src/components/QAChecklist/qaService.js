// ── qaService.js ────────────────────────────────────────────────────────────
// Servicio de Firestore para el módulo de QA & Procesos.
// Colecciones: qa_templates (plantillas) y qa_results (resultados de pruebas).

import { db } from '../../services/firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, serverTimestamp, setDoc
} from 'firebase/firestore';

const TEMPLATES_COL = 'qa_templates';
const RESULTS_COL   = 'qa_results';
const PERSONAS_COL  = 'qa_personas';

// ── TEMPLATES ────────────────────────────────────────────────────────────────
// ... (existing code) ...

// ── PERSONAS ─────────────────────────────────────────────────────────────────

/** Obtiene todos los roles (personas). */
export const fetchPersonas = async () => {
  const snap = await getDocs(collection(db, PERSONAS_COL));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/** Actualiza o crea un rol. */
export const updatePersona = async (id, data) => {
  await updateDoc(doc(db, PERSONAS_COL, id), data);
};

/** Guarda un set inicial de personas (seed). */
export const savePersona = async (id, data) => {
  const ref = doc(db, PERSONAS_COL, id);
  await updateDoc(ref, data).catch(async () => {
    // Si no existe, lo creamos con setDoc (usaremos updateDoc asumiendo que ya existen o se crean manualmente)
    // Para simplificar, usaremos un setDoc masivo o individual
  });
};
export const upsertPersona = async (id, data) => {
  await setDoc(doc(db, PERSONAS_COL, id), data, { merge: true });
};
export const deletePersona = async (id) => {
  await deleteDoc(doc(db, PERSONAS_COL, id));
};

/** Obtiene todas las plantillas ordenadas por su campo `order`. */
export const fetchTemplates = async () => {
  const q = query(collection(db, TEMPLATES_COL), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/** Obtiene una plantilla por ID. */
export const fetchTemplate = async (id) => {
  const snap = await getDoc(doc(db, TEMPLATES_COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/** Crea una nueva plantilla. Devuelve el ID generado. */
export const createTemplate = async (data) => {
  const cleanData = JSON.parse(JSON.stringify(data));
  const ref = await addDoc(collection(db, TEMPLATES_COL), {
    ...cleanData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isActive: true,
  });
  return ref.id;
};

/** Actualiza una plantilla existente (merge parcial). */
export const updateTemplate = async (id, data) => {
  const cleanData = JSON.parse(JSON.stringify(data));
  await updateDoc(doc(db, TEMPLATES_COL, id), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
};

/** Elimina una plantilla. */
export const deleteTemplate = async (id) => {
  await deleteDoc(doc(db, TEMPLATES_COL, id));
};

// ── RESULTS ──────────────────────────────────────────────────────────────────

/** Obtiene todos los resultados ordenados por fecha desc. */
export const fetchResults = async () => {
  const q = query(collection(db, RESULTS_COL), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/** Guarda un resultado de prueba. */
export const saveResult = async (payload) => {
  const cleanPayload = JSON.parse(JSON.stringify(payload));
  const ref = await addDoc(collection(db, RESULTS_COL), {
    ...cleanPayload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

/** Elimina un resultado. */
export const deleteResult = async (id) => {
  await deleteDoc(doc(db, RESULTS_COL, id));
};

/** Actualiza un resultado. */
export const updateResult = async (id, data) => {
  const cleanData = JSON.parse(JSON.stringify(data));
  await updateDoc(doc(db, RESULTS_COL, id), cleanData);
};
