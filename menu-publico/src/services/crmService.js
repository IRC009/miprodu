import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';

export const addCustomer = async (restaurantId, customerData) => {
  try {
    const customersRef = collection(db, `restaurants/${restaurantId}/customers`);
    
    // Check if phone number is provided and not empty to avoid duplicates
    if (customerData.phone) {
      const q = query(customersRef, where('phone', '==', customerData.phone.toString().trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        const existingData = existingDoc.data();
        const existingId = existingDoc.id;
        
        const updates = {};
        if (customerData.name && existingData.name !== customerData.name) {
          updates.name = customerData.name;
        }
        if (customerData.email && existingData.email !== customerData.email) {
          updates.email = customerData.email;
        }
        if (customerData.address && existingData.address !== customerData.address) {
          updates.address = customerData.address;
        }
        
        if (Object.keys(updates).length > 0) {
          const docRef = doc(db, `restaurants/${restaurantId}/customers`, existingId);
          await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
        }
        
        return { success: true, customerId: existingId };
      }
    }

    // Check if email is provided to avoid duplicates
    if (customerData.email) {
      const q = query(customersRef, where('email', '==', customerData.email.toString().trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        const existingData = existingDoc.data();
        const existingId = existingDoc.id;
        
        const updates = {};
        if (customerData.name && existingData.name !== customerData.name) {
          updates.name = customerData.name;
        }
        if (customerData.phone && existingData.phone !== customerData.phone) {
          updates.phone = customerData.phone;
        }
        if (customerData.address && existingData.address !== customerData.address) {
          updates.address = customerData.address;
        }
        
        if (Object.keys(updates).length > 0) {
          const docRef = doc(db, `restaurants/${restaurantId}/customers`, existingId);
          await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
        }
        
        return { success: true, customerId: existingId };
      }
    }

    const docRef = await addDoc(customersRef, {
      ...customerData,
      createdAt: serverTimestamp()
    });
    return { success: true, customerId: docRef.id };
  } catch (error) {
    console.error("Error adding customer:", error);
    throw error;
  }
};
