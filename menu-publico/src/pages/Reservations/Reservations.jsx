import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAlert } from '../../context/AlertContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, writeBatch } from 'firebase/firestore';
import { getTables, getBranches } from '../../services/branchService';
import { getGeneralSettings } from '../../services/settingsService';
import { addCustomer } from '../../services/crmService';

// ── Utilidades ──────────────────────────────────────────────────────────
const timeToMinutes = (t) => {
  if (!t || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (min) => {
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const generateTimeSlots = (openingTime, closingTime, intervalMinutes, stayDuration) => {
  const slots = [];
  let current = timeToMinutes(openingTime);
  const end = timeToMinutes(closingTime) - stayDuration;
  while (current <= end) {
    slots.push(minutesToTime(current));
    current += intervalMinutes;
  }
  return slots;
};

/**
 * Intenta asignar mesa única o fusión de mesas flexibles de la misma zona.
 * Retorna { tables, merged } o null si no hay disponibilidad.
 */
const findAssignment = (allTables, occupiedSet, guests, zone) => {
  const candidates = allTables
    .filter(t => {
      const capOk = parseInt(t.capacity || 0) >= guests;
      const zoneOk = !zone || (t.zone && t.zone.toLowerCase() === zone.toLowerCase());
      const isFree = !occupiedSet.has(String(t.number));
      return capOk && zoneOk && isFree;
    })
    .sort((a, b) => parseInt(a.capacity) - parseInt(b.capacity));

  // Intento 1: mesa única con capacidad suficiente
  if (candidates.length > 0) {
    return { tables: [String(candidates[0].number)], merged: false };
  }

  // Intento 2: fusión SOLO de mesas flexible: true
  const flexFree = allTables
    .filter(t =>
      !occupiedSet.has(String(t.number)) &&
      t.flexible === true &&
      (!zone || (t.zone && t.zone.toLowerCase() === zone.toLowerCase()))
    )
    .sort((a, b) => parseInt(b.capacity) - parseInt(a.capacity));

  let combined = 0;
  const tablesToMerge = [];
  for (const t of flexFree) {
    tablesToMerge.push(String(t.number));
    combined += parseInt(t.capacity || 0);
    if (combined >= guests) break;
  }

  return combined >= guests
    ? { tables: tablesToMerge, merged: tablesToMerge.length > 1 }
    : null;
};

// ── Componente ──────────────────────────────────────────────────────────
export default function Reservations() {
  const { restaurantId, branchId: urlBranchId, designConfig } = useOutletContext();
  const { showAlert } = useAlert();

  // Si no viene branchId en la URL, el cliente debe seleccionar su sede
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(urlBranchId || '');
  const [loadingBranches, setLoadingBranches] = useState(!urlBranchId);

  // Formulario
  const [form, setForm] = useState({ customerName: '', phone: '', email: '', date: '', guests: 2, notes: '', zone: '' });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Cargar sucursales si no viene branchId en la URL
  useEffect(() => {
    if (urlBranchId) return;
    setLoadingBranches(true);
    getBranches(restaurantId)
      .then(data => {
        setBranches(data);
        // Si solo hay 1 sede, seleccionarla automáticamente
        if (data.length === 1) setSelectedBranchId(data[0].id);
      })
      .finally(() => setLoadingBranches(false));
  }, [restaurantId, urlBranchId]);

  // Motor de cálculo de slots
  const computeSlots = async (branchId) => {
    const config = await getGeneralSettings(restaurantId).catch(() => ({}));
    const openingTime = config?.openingTime || '12:00';
    const closingTime = config?.closingTime || '23:00';
    const stayDuration = config?.averageStayMinutes || 120;
    const intervalMinutes = config?.slotIntervalMinutes || 30;

    // ── BARRIDO LOCAL DE NO-SHOWS ──
    try {
      const getRestaurantDate = (dateObj = new Date()) => {
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        return formatter.format(dateObj);
      };
      
      const getRestaurantMinutes = (dateObj = new Date()) => {
        const timeStr = dateObj.toLocaleString("en-US", {
          timeZone: tz,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      const todayStr = getRestaurantDate();
      
      if (form.date === todayStr) {
        const currentMinutes = getRestaurantMinutes();
        const tolerance = 15;
        
        const qSweep = query(
          collection(db, `restaurants/${restaurantId}/reservations`),
          where('branchId', '==', branchId),
          where('date', '==', todayStr),
          where('status', '==', 'pending')
        );
        const sweepSnap = await getDocs(qSweep);
        if (!sweepSnap.empty) {
          const batch = writeBatch(db);
          let updated = false;
          sweepSnap.docs.forEach(docSnap => {
            const res = docSnap.data();
            const resStartMinutes = res.startMinutes || 0;
            if (currentMinutes > resStartMinutes + tolerance) {
              batch.update(docSnap.ref, { status: 'no-show' });
              updated = true;
            }
          });
          if (updated) {
            await batch.commit();
          }
        }
      }
    } catch (sweepErr) {
      console.warn('[Local Sweep] Error en barrido bajo demanda:', sweepErr);
    }

    // Mesas físicas de la sucursal seleccionada
    const allTables = await getTables(restaurantId, branchId);
    if (!allTables.length) return [];

    // Reservas activas del día en esa sucursal
    const q = query(
      collection(db, `restaurants/${restaurantId}/reservations`),
      where('branchId', '==', branchId),
      where('date', '==', form.date),
      where('status', 'in', ['pending', 'confirmed'])
    );
    const snap = await getDocs(q);
    const activeReservations = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const theoreticalSlots = generateTimeSlots(openingTime, closingTime, intervalMinutes, stayDuration);

    const tz = config?.timezone || 'America/Bogota';

    const getRestaurantDate = (dateObj = new Date()) => {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      return formatter.format(dateObj);
    };

    const getRestaurantMinutes = (dateObj = new Date()) => {
      const timeStr = dateObj.toLocaleString("en-US", {
        timeZone: tz,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const restaurantDateStr = getRestaurantDate();
    const leadTime = parseInt(config?.reservationLeadTimeMinutes || 60, 10);

    return theoreticalSlots.map(slotTime => {
      const reqStart = timeToMinutes(slotTime);
      const reqEnd = reqStart + stayDuration;

      let isPastOrTooClose = false;
      if (form.date < restaurantDateStr) {
        isPastOrTooClose = true;
      } else if (form.date === restaurantDateStr) {
        const currentMinutes = getRestaurantMinutes();
        if (reqStart < currentMinutes + leadTime) {
          isPastOrTooClose = true;
        }
      }

      const overlapping = activeReservations.filter(r =>
        (r.startMinutes || timeToMinutes(r.time)) < reqEnd &&
        ((r.endMinutes) || (timeToMinutes(r.time) + stayDuration)) > reqStart
      );
      const occupiedSet = new Set(
        overlapping.flatMap(r => r.assignedTables || (r.assignedTableNumber ? [r.assignedTableNumber] : [])).filter(Boolean)
      );

      const assignment = isPastOrTooClose ? null : findAssignment(allTables, occupiedSet, form.guests, form.zone || null);

      return {
        time: slotTime,
        startMinutes: reqStart,
        endMinutes: reqEnd,
        available: assignment !== null,
        merged: assignment?.merged || false,
        assignedTables: assignment?.tables || [],
        stayDuration
      };
    });
  };

  // Recargar slots cuando cambian fecha, personas, zona o sede
  useEffect(() => {
    setSelectedSlot(null);
    setSlots([]);
    if (!form.date || !form.guests || !selectedBranchId || !restaurantId) return;

    setLoadingSlots(true);
    computeSlots(selectedBranchId)
      .then(setSlots)
      .catch(err => { console.error(err); setSlots([]); })
      .finally(() => setLoadingSlots(false));
  }, [form.date, form.guests, form.zone, selectedBranchId, restaurantId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBranchId) { showAlert('Por favor selecciona una sede.', 'Atención', 'warning'); return; }
    if (!selectedSlot?.available) { showAlert('Por favor selecciona una hora disponible.', 'Atención', 'warning'); return; }

    setSubmitting(true);
    try {
      // Revalidar disponibilidad en el momento del envío (evita race conditions)
      const freshSlots = await computeSlots(selectedBranchId);
      const freshSlot = freshSlots.find(s => s.time === selectedSlot.time);

      if (!freshSlot?.available) {
        showAlert('Lo sentimos, esta hora acaba de ser tomada. Por favor elige otra.', 'Hora ocupada', 'warning');
        setSlots(freshSlots);
        setSelectedSlot(null);
        return;
      }

      try {
        await addCustomer(restaurantId, {
          name: form.customerName,
          phone: form.phone,
          email: form.email || '',
          address: ''
        });
      } catch (crmErr) {
        console.warn("[Reservations] Failed to add customer to CRM:", crmErr);
      }

      await addDoc(collection(db, `restaurants/${restaurantId}/reservations`), {
        ...form,
        branchId: selectedBranchId,
        time: freshSlot.time,
        startMinutes: freshSlot.startMinutes,
        endMinutes: freshSlot.endMinutes,
        assignedTables: freshSlot.assignedTables,
        tablesMerged: freshSlot.merged,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
    } catch (error) {
      console.error(error);
      showAlert('Error al enviar la reserva. Por favor intenta de nuevo.', 'Error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isColorDark = (color) => {
    if (!color || !color.startsWith('#')) return true;
    const hex = color.replace('#', '');
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16) || 0;
    return (r * 299 + g * 587 + b * 114) / 1000 < 140;
  };
  const isDark = designConfig?.backgroundColor ? isColorDark(designConfig.backgroundColor) : designConfig?.theme === 'dark';

  if (success) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 className="elegant-title">¡Reserva Solicitada!</h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '2rem' }}>
          Hemos recibido tu solicitud. Te confirmaremos en breve por correo o teléfono.
        </p>
        <button
          onClick={() => {
            setSuccess(false);
            setSelectedSlot(null);
            setSlots([]);
            setForm({ customerName: '', phone: '', email: '', date: '', guests: 2, notes: '', zone: '' });
          }}
          style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '1rem 2rem', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Hacer otra reserva
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 1.5rem' }}>
      <h2 className="elegant-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Reserva</h2>
      <p style={{ textAlign: 'center', color: isDark ? 'rgba(255,255,255,0.7)' : 'var(--text-light)', marginBottom: '2rem' }}>
        Asegura tu mesa con nosotros
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Selector de sede (solo si no viene en la URL) */}
        {!urlBranchId && (
          <div>
            <label style={labelStyle(isDark)}>Sede</label>
            {loadingBranches ? (
              <p style={{ color: 'var(--text-light)' }}>Cargando sedes...</p>
            ) : (
              <select
                required
                style={inputStyle(isDark)}
                value={selectedBranchId}
                onChange={e => { setSelectedBranchId(e.target.value); setSelectedSlot(null); setSlots([]); }}
              >
                <option value="">-- Selecciona una sede --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name || b.id}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Datos personales */}
        <div>
          <label style={labelStyle(isDark)}>Nombre Completo</label>
          <input required type="text" style={inputStyle(isDark)} value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle(isDark)}>Teléfono</label>
          <input required type="tel" style={inputStyle(isDark)} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle(isDark)}>Correo Electrónico</label>
          <input required type="email" style={inputStyle(isDark)} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>

        {/* Fecha y personas */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle(isDark)}>Fecha</label>
            <input
              required type="date"
              style={inputStyle(isDark)}
              value={form.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle(isDark)}>Personas</label>
            <input
              required type="number" min="1" max="30"
              style={inputStyle(isDark)}
              value={form.guests}
              onChange={e => setForm({ ...form, guests: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>

        {/* Zona preferida */}
        <div>
          <label style={labelStyle(isDark)}>
            Zona preferida <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(opcional)</span>
          </label>
          <input
            type="text"
            placeholder="Ej: Terraza, Interior, VIP..."
            style={inputStyle(isDark)}
            value={form.zone}
            onChange={e => setForm({ ...form, zone: e.target.value })}
          />
        </div>

        {/* Time Slots — solo se muestran si hay sede, fecha y personas */}
        {selectedBranchId && form.date && form.guests > 0 && (
          <div>
            <label style={labelStyle(isDark)}>Selecciona una hora disponible</label>
            {loadingSlots ? (
              <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '1rem' }}>
                ⏳ Buscando disponibilidad en esta sede...
              </p>
            ) : slots.length === 0 ? (
              <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '1rem' }}>
                No hay horarios disponibles para esta fecha y sede.
              </p>
            ) : (
              <>
                {/* Leyenda */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-dark)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#dcfce7', display: 'inline-block', border: '1px solid #bbf7d0' }} />
                    Disponible
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#fef9c3', display: 'inline-block', border: '1px solid #fde68a' }} />
                    Mesas unidas
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f1f5f9', display: 'inline-block', border: '1px solid #e2e8f0' }} />
                    No disponible
                  </span>
                </div>

                {/* Grid de botones */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '0.5rem' }}>
                  {slots.map(slot => {
                    const isSelected = selectedSlot?.time === slot.time;
                    const bg = !slot.available
                      ? (isDark ? '#1e293b' : '#f1f5f9')
                      : slot.merged
                        ? (isSelected ? '#b45309' : '#fef9c3')
                        : (isSelected ? '#15803d' : '#dcfce7');
                    const color = !slot.available
                      ? (isDark ? '#475569' : '#94a3b8')
                      : slot.merged
                        ? (isSelected ? '#fff' : '#854d0e')
                        : (isSelected ? '#fff' : '#15803d');

                    return (
                      <button
                        type="button"
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot)}
                        title={
                          !slot.available
                            ? 'Sin disponibilidad'
                            : slot.merged
                              ? `Mesas unidas: ${slot.assignedTables.join(' + ')}`
                              : `Mesa ${slot.assignedTables[0]}`
                        }
                        style={{
                          padding: '0.6rem 0.25rem',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid currentColor' : '1px solid rgba(0,0,0,0.05)',
                          background: bg,
                          color,
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.9rem',
                          cursor: slot.available ? 'pointer' : 'not-allowed',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        {slot.time}
                        {slot.merged && <span style={{ fontSize: '0.6rem' }}>🔗 unidas</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Confirmación de selección */}
                {selectedSlot && (
                  <div style={{
                    marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px',
                    background: isDark ? 'rgba(255,255,255,0.08)' : '#f0fdf4',
                    fontSize: '0.875rem', color: 'var(--text-dark)'
                  }}>
                    ✅ <strong>{selectedSlot.time}</strong>
                    {selectedSlot.merged
                      ? ` · Mesas unidas ${selectedSlot.assignedTables.join(' + ')}`
                      : ` · Mesa ${selectedSlot.assignedTables[0]}`
                    }
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Notas */}
        <div>
          <label style={labelStyle(isDark)}>
            Notas u Observaciones <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(opcional)</span>
          </label>
          <textarea
            style={{ ...inputStyle(isDark), resize: 'vertical', minHeight: '80px' }}
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Ej: cumpleaños, alergias, silla para bebé..."
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedSlot?.available || !selectedBranchId}
          style={{
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            padding: '1.2rem',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 600,
            marginTop: '1rem',
            opacity: (submitting || !selectedSlot?.available || !selectedBranchId) ? 0.6 : 1,
            cursor: (submitting || !selectedSlot?.available || !selectedBranchId) ? 'not-allowed' : 'pointer'
          }}
        >
          {submitting ? '⏳ Procesando...' : 'Confirmar Reserva'}
        </button>
      </form>
    </div>
  );
}

const labelStyle = (isDark) => ({
  display: 'block',
  marginBottom: '0.5rem',
  color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-dark)',
  fontWeight: 500
});

const inputStyle = (isDark) => ({
  width: '100%',
  padding: '1rem',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)'}`,
  borderRadius: '8px',
  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
  color: isDark ? '#ffffff' : 'var(--text-dark)',
  fontSize: '1rem',
  outline: 'none',
  boxSizing: 'border-box'
});
