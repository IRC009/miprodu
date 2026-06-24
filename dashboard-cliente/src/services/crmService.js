import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, orderBy, limit, startAfter, serverTimestamp } from 'firebase/firestore';

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

export const getCustomersPage = async (restaurantId, lastVisibleDoc = null, pageSize = 10) => {
  try {
    const customersRef = collection(db, `restaurants/${restaurantId}/customers`);
    let q;
    if (lastVisibleDoc) {
      q = query(customersRef, orderBy('createdAt', 'asc'), startAfter(lastVisibleDoc), limit(pageSize));
    } else {
      q = query(customersRef, orderBy('createdAt', 'asc'), limit(pageSize));
    }
    
    const snapshot = await getDocs(q);
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    
    const customers = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt 
      };
    });
    
    return { customers, lastVisible };
  } catch (error) {
    console.error("Error fetching customers page:", error);
    throw error;
  }
};

export const updateCustomer = async (restaurantId, customerId, customerData) => {
  try {
    const docRef = doc(db, `restaurants/${restaurantId}/customers`, customerId);
    await updateDoc(docRef, {
      ...customerData,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating customer:", error);
    throw error;
  }
};
