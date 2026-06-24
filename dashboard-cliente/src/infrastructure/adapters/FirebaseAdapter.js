import { db } from '../../services/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';

/**
 * Adaptador de Base de Datos para aislar la lógica de Firebase Firestore.
 * Esto permite cambiar la base de datos en el futuro sin modificar los servicios de dominio.
 */
export const Database = {
  /**
   * Obtiene un único documento por su ID
   */
  async getById(collectionName, id) {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  },

  /**
   * Obtiene todos los documentos de una colección, opcionalmente filtrados
   * filters = [{ field: 'status', operator: '==', value: 'active' }]
   */
  async getAll(collectionName, filters = [], order = null) {
    let q = collection(db, collectionName);
    
    if (filters.length > 0) {
      const constraints = filters.map(f => where(f.field, f.operator, f.value));
      q = query(q, ...constraints);
    }
    
    if (order) {
      q = query(q, orderBy(order.field, order.direction || 'asc'));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Escucha cambios en tiempo real en una colección
   */
  listen(collectionName, filters = [], callback) {
    let q = collection(db, collectionName);
    
    if (filters.length > 0) {
      const constraints = filters.map(f => where(f.field, f.operator, f.value));
      q = query(q, ...constraints);
    }

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    });
  },

  /**
   * Crea un documento (ID autogenerado)
   */
  async create(collectionName, data) {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date()
    });
    return { id: docRef.id, ...data };
  },

  /**
   * Crea o sobreescribe un documento con ID específico
   */
  async set(collectionName, id, data) {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, data, { merge: true });
    return { id, ...data };
  },

  /**
   * Actualiza un documento existente
   */
  async update(collectionName, id, data) {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date()
    });
    return { id, ...data };
  },

  /**
   * Elimina un documento
   */
  async delete(collectionName, id) {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return true;
  }
};
