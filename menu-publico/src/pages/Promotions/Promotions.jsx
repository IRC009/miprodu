import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAlert } from '../../context/AlertContext';
import { runTransaction, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function Promotions() {
  const { restaurantId, designConfig } = useOutletContext();
  const { showAlert } = useAlert();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Simplified version of crmService logic to add to bucket directly
  const handleJoin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const indexRef = doc(db, `restaurants/${restaurantId}/customerIndex/main`);
      
      await runTransaction(db, async (transaction) => {
        const indexDoc = await transaction.get(indexRef);
        let latestBucketId = 'bucket_0';
        let currentCount = 0;

        if (indexDoc.exists()) {
          latestBucketId = indexDoc.data().latestBucketId;
          currentCount = indexDoc.data().currentCount;
        }

        if (currentCount >= 50) {
          const bucketNum = parseInt(latestBucketId.split('_')[1]) + 1;
          latestBucketId = `bucket_${bucketNum}`;
          currentCount = 0;
        }

        const bucketRef = doc(db, `restaurants/${restaurantId}/customerBuckets/${latestBucketId}`);
        const bucketDoc = await transaction.get(bucketRef);

        const newCustomer = {
          ...form,
          id: Date.now().toString(),
          createdAt: new Date().toISOString()
        };

        if (!bucketDoc.exists()) {
          transaction.set(bucketRef, { customers: [newCustomer] });
        } else {
          const existingCustomers = bucketDoc.data().customers || [];
          transaction.update(bucketRef, { customers: [...existingCustomers, newCustomer] });
        }

        transaction.set(indexRef, {
          latestBucketId,
          currentCount: currentCount + 1,
          totalCustomers: indexDoc.exists() ? indexDoc.data().totalCustomers + 1 : 1
        }, { merge: true });
      });

      setSuccess(true);
    } catch (error) {
      console.error(error);
      showAlert("Error al suscribirse. Por favor intenta de nuevo.", "Error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const isColorDark = (color) => {
    if (!color || !color.startsWith('#')) return true;
    const hex = color.replace('#', '');
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) || 0;
      g = parseInt(hex[1] + hex[1], 16) || 0;
      b = parseInt(hex[2] + hex[2], 16) || 0;
    } else {
      r = parseInt(hex.substring(0, 2), 16) || 0;
      g = parseInt(hex.substring(2, 4), 16) || 0;
      b = parseInt(hex.substring(4, 6), 16) || 0;
    }
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 140;
  };
  const isDark = designConfig?.backgroundColor ? isColorDark(designConfig.backgroundColor) : (designConfig?.theme === 'dark');

  if (success) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <h2 className="elegant-title">¡Gracias por unirte!</h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>Pronto recibirás nuestras mejores promociones.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 1.5rem' }}>
      <h2 className="elegant-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>VIP Club</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-light)', marginBottom: '2rem' }}>Regístrate para recibir beneficios exclusivos</p>

      <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-dark)' }}>Nombre Completo</label>
          <input 
            required 
            type="text" 
            style={inputStyle(isDark)} 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-dark)' }}>Email</label>
          <input 
            required 
            type="email" 
            style={inputStyle(isDark)} 
            value={form.email} 
            onChange={e => setForm({...form, email: e.target.value})} 
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-dark)' }}>WhatsApp</label>
          <input 
            required 
            type="tel" 
            style={inputStyle(isDark)} 
            value={form.phone} 
            onChange={e => setForm({...form, phone: e.target.value})} 
          />
        </div>

        <button 
          type="submit" 
          disabled={submitting}
          style={{
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            padding: '1.2rem',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 600,
            marginTop: '1rem',
            opacity: submitting ? 0.7 : 1
          }}
        >
          {submitting ? 'Registrando...' : 'Unirme ahora'}
        </button>
      </form>
    </div>
  );
}

const inputStyle = (isDark) => ({
  width: '100%',
  padding: '1rem',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
  borderRadius: '8px',
  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
  color: 'var(--text-dark)',
  fontSize: '1rem',
  outline: 'none'
});
