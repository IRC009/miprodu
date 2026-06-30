import React from 'react';
import { createPortal } from 'react-dom';
import { Coins } from 'lucide-react';
import s from '../POS.module.css';

/**
 * Modal para canjear puntos de lealtad.
 * Muestra premios configurados y permite ingresar puntos manualmente.
 */
export default function POSLoyaltyRedeemModal({ loyaltyCustomer, loyaltyConfig, onApply, onClose }) {
  if (!loyaltyCustomer) return null;

  const availableRewards = (loyaltyConfig?.rewards || [])
    .filter(r => (loyaltyCustomer.totalPoints || 0) >= r.pointsCost);

  return createPortal(
    <div className="saas-modal-overlay" style={{ zIndex: 10002 }}>
      <div className={`saas-modal-content ${s.redeemModal}`}>
        <h3 className={s.redeemTitle} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Coins size={16} /> Canjear Puntos
        </h3>
        <p className={s.redeemSubtitle}>
          {loyaltyCustomer.name} tiene <strong>{loyaltyCustomer.totalPoints} puntos</strong> disponibles.
          Cada punto equivale a ${loyaltyConfig?.pointsValue?.toLocaleString()} de descuento.
        </p>

        {availableRewards.length > 0 && (
          <div className={s.rewardsSection}>
            <div className={s.rewardsSectionTitle}>PREMIOS DISPONIBLES</div>
            {availableRewards.map(r => (
              <button key={r.id} className={s.rewardBtn} onClick={() => onApply(r.pointsCost)}>
                {r.name} — {r.pointsCost} pts
                {r.type === 'discount' && ` = $${(r.pointsCost * (loyaltyConfig.pointsValue || 0)).toLocaleString()} de descuento`}
              </button>
            ))}
          </div>
        )}

        <div className={s.manualSectionTitle}>O INGRESA PUNTOS MANUALMENTE</div>
        <div className={s.manualInputRow}>
          <input
            type="number"
            placeholder="Puntos a canjear"
            max={loyaltyCustomer.totalPoints}
            className={s.manualInput}
            id="loyalty-redeem-input"
          />
          <button
            className={s.manualApplyBtn}
            onClick={() => {
              const val = parseInt(document.getElementById('loyalty-redeem-input').value) || 0;
              if (val > 0 && val <= loyaltyCustomer.totalPoints) onApply(val);
            }}
          >
            Aplicar
          </button>
        </div>

        <button className={s.redeemCancelBtn} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>,
    document.body
  );
}
