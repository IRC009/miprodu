import { db } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Registra o actualiza un miembro en el programa de lealtad.
 * Se usa el documento (cédula) como ID del documento para evitar duplicados.
 */
export const addLoyaltyMember = async (restaurantId, memberData) => {
  try {
    if (!memberData.documentId) throw new Error("Document ID is required for loyalty");
    
    const memberRef = doc(db, `restaurants/${restaurantId}/loyalty_members`, memberData.documentId);
    const memberSnap = await getDoc(memberRef);
    const exists = memberSnap.exists();

    const memberPayload = {
      ...memberData,
      updatedAt: serverTimestamp(),
    };

    if (!exists) {
      memberPayload.points = memberData.points || 0;
      memberPayload.createdAt = memberData.createdAt || serverTimestamp();
    }

    await setDoc(memberRef, memberPayload, { merge: true });

    // También guardar/actualizar en la colección principal de customers (CRM/Lealtad del admin panel)
    const customerRef = doc(db, `restaurants/${restaurantId}/customers`, memberData.documentId);
    const customerSnap = await getDoc(customerRef);
    const customerExists = customerSnap.exists();

    const customerPayload = {
      documentId: memberData.documentId,
      name: memberData.name || 'Cliente',
      phone: memberData.phone || '',
      email: memberData.email || '',
      lastActivity: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!customerExists) {
      customerPayload.totalPoints = memberData.points || 0;
      customerPayload.createdAt = memberData.createdAt || new Date().toISOString();
    }

    await setDoc(customerRef, customerPayload, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error("Error adding loyalty member:", error);
    throw error;
  }
};
